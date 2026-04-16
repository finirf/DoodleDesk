# Phase 12.2: Azure ML Pipeline Setup & ADF Integration

**Goal:** Convert your K-means clustering notebook into a reusable Azure ML Pipeline that:
- Reads curated Parquet files from `curated-features` blob container
- Runs clustering and engagement tier assignment
- Outputs `engagement_tiers_output.csv` to `model-output` blob container
- Can be automatically triggered after ADF Copy Data completes

---

## Step 1: Update Your Notebook with CSV Export

Add this cell at the end of your existing notebook to export the results:

```python
# Export engagement tiers to CSV for Supabase sync
output_csv_path = "engagement_tiers_output.csv"
user_metrics[["user_id", "engagement_tier", "engagement_score", "total_notes", "total_edits", "avg_session_duration_seconds", "collaboration_count"]].to_csv(output_csv_path, index=False)
print(f"Exported to {output_csv_path}")

# Upload CSV to Azure Blob Storage (model-output container)
from azure.storage.blob import BlobClient
from azure.identity import DefaultAzureCredential

# Option A: Using DefaultAzureCredential (managed identity)
storage_account_name = os.environ.get("AZURE_STORAGE_ACCOUNT_NAME", "doodledeskaml5831774892")
container_name = "model-output"
blob_name = f"engagement_tiers_output_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.csv"

blob_url = f"https://{storage_account_name}.blob.core.windows.net/{container_name}/{blob_name}"

try:
    credential = DefaultAzureCredential()
    blob_client = BlobClient(blob_url, credential=credential)
    
    with open(output_csv_path, "rb") as data:
        blob_client.upload_blob(data, overwrite=True)
    
    print(f"Successfully uploaded to {blob_url}")
except Exception as e:
    print(f"Warning: Could not upload to blob. {e}")
    print(f"CSV available locally at: {output_csv_path}")
```

**Note:** This uses `DefaultAzureCredential`, which works when the compute is running in Azure with managed identity enabled.

---

## Step 2: Create an Azure ML Pipeline

You have two options:

### Option A: Using Azure ML SDK (Python)

Create a file `create_clustering_pipeline.py`:

```python
from azureml.core import Workspace, Datastore, Dataset, Environment
from azureml.pipeline.core import Pipeline, PipelineData
from azureml.pipeline.steps import PythonScriptStep
from azureml.core.runconfig import RunConfiguration
import os

# Load workspace
ws = Workspace.from_config()

# Get datastores
curated_ds = Datastore.get(ws, "DoodleDeskCurated")  # Reads from curated-features
output_ds = Datastore.get(ws, "DoodleDeskOutput")    # Writes to model-output

# Define pipeline data (intermediate)
pipeline_output_data = PipelineData(
    name="clustering_output",
    datastore=output_ds,
    is_directory=False
)

# Create environment (install required packages)
env = Environment.get(ws, name="DoodleDeskClusteringEnv")  # Or create new

# Configure compute
run_config = RunConfiguration()
run_config.environment = env
run_config.target = "your-compute-cluster-name"  # e.g., "cpu-cluster"

# Create Python script step
clustering_step = PythonScriptStep(
    name="K-Means Clustering",
    script_name="clustering_script.py",  # See Step 3 below
    arguments=[
        "--input_datastore", curated_ds.name,
        "--output_datastore", output_ds.name
    ],
    compute_target=run_config.target,
    runconfig=run_config,
    allow_reuse=False  # Force fresh run each time
)

# Build pipeline
pipeline = Pipeline(ws, steps=[clustering_step])

# Publish pipeline
published_pipeline = pipeline.publish(
    name="DoodleDesk-Clustering-Pipeline",
    description="K-means clustering for engagement tier assignment",
    version="1.0"
)

print(f"Published pipeline ID: {published_pipeline.id}")
```

### Option B: Using Azure ML Studio UI

1. Go to **Azure ML Studio** → **Designer**
2. Create a new pipeline
3. Add:
   - **Import Data** step (read from `curated-features`)
   - **Execute Python Script** step (paste your clustering code)
   - **Export Data** step (write to `model-output`)
4. Publish the pipeline

---

## Step 3: Create `clustering_script.py` (Standalone Python Script)

This is the notebook code refactored into a reusable script:

```python
#!/usr/bin/env python
# clustering_script.py
# Standalone script for Azure ML Pipeline

import argparse
import os
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score

from azureml.core import Workspace, Datastore, Run
from azure.storage.blob import BlobClient
from azure.identity import DefaultAzureCredential

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input_datastore", type=str, required=True, help="Input datastore name")
    parser.add_argument("--output_datastore", type=str, required=True, help="Output datastore name")
    args = parser.parse_args()
    
    # Get context
    run = Run.get_context()
    ws = run.experiment.workspace if hasattr(run, "experiment") else Workspace.from_config()
    
    # Download curated data
    input_ds = Datastore.get(ws, args.input_datastore)
    target_dir = Path("curated_download")
    target_dir.mkdir(exist_ok=True)
    
    print(f"Downloading from {args.input_datastore}...")
    input_ds.download(str(target_dir), prefix="", overwrite=True, show_progress=True)
    
    # Find parquet files
    parquet_files = list(target_dir.rglob("*.parquet"))
    if not parquet_files:
        raise ValueError("No parquet files found in curated data")
    
    print(f"Found {len(parquet_files)} parquet files")
    
    # Load and combine all parquet files
    dfs = [pd.read_parquet(f) for f in parquet_files]
    df = pd.concat(dfs, ignore_index=True)
    print(f"Combined shape: {df.shape}")
    
    # K-Means clustering
    required = ["total_notes", "total_edits", "avg_session_duration_seconds", "collaboration_count"]
    
    if all(c in df.columns for c in required):
        user_metrics = df.copy()
    else:
        # Aggregate from event-level data
        needed_event_cols = ["user_id", "note_id", "edit_count", "session_seconds", "collaboration_count"]
        missing = [c for c in needed_event_cols if c not in df.columns]
        if missing:
            raise ValueError(f"Missing columns: {missing}")
        
        user_metrics = (
            df.groupby("user_id", dropna=False)
              .agg(
                  total_notes=("note_id", lambda s: s.dropna().nunique()),
                  total_edits=("edit_count", "sum"),
                  avg_session_duration_seconds=("session_seconds", "mean"),
                  collaboration_count=("collaboration_count", "sum"),
              )
              .reset_index()
        )
    
    # Prepare features
    X = user_metrics[required].fillna(0).values
    
    if len(X) < 3:
        raise ValueError(f"Need at least 3 users for clustering. Found {len(X)}")
    
    # Standardize and cluster
    X_scaled = StandardScaler().fit_transform(X)
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    clusters = kmeans.fit_predict(X_scaled)
    
    # Calculate silhouette score
    if len(set(clusters)) > 1:
        sil = silhouette_score(X_scaled, clusters)
        print(f"Silhouette Score: {sil:.4f}")
        run.log("silhouette_score", sil)
    
    # Map clusters to tiers
    tier_order = np.argsort(kmeans.cluster_centers_.sum(axis=1))
    tier_map = {tier_order[i]: ["low", "medium", "high"][i] for i in range(3)}
    
    user_metrics["cluster"] = clusters
    user_metrics["engagement_tier"] = user_metrics["cluster"].map(tier_map)
    user_metrics["engagement_score"] = np.clip((clusters + 1) * 33, 0, 100)
    
    print(f"Updated {len(user_metrics)} users with engagement tiers")
    
    # Log metrics
    run.log("total_users", len(user_metrics))
    run.log("low_tier_count", (user_metrics['engagement_tier'] == 'low').sum())
    run.log("medium_tier_count", (user_metrics['engagement_tier'] == 'medium').sum())
    run.log("high_tier_count", (user_metrics['engagement_tier'] == 'high').sum())
    
    # Save to CSV
    output_csv = "engagement_tiers_output.csv"
    user_metrics[["user_id", "engagement_tier", "engagement_score", "total_notes", "total_edits", "avg_session_duration_seconds", "collaboration_count"]].to_csv(output_csv, index=False)
    
    # Upload to blob storage
    storage_account_name = os.environ.get("AZURE_STORAGE_ACCOUNT_NAME", "doodledeskaml5831774892")
    container_name = "model-output"
    timestamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
    blob_name = f"engagement_tiers_output_{timestamp}.csv"
    
    blob_url = f"https://{storage_account_name}.blob.core.windows.net/{container_name}/{blob_name}"
    
    try:
        credential = DefaultAzureCredential()
        blob_client = BlobClient(blob_url, credential=credential)
        
        with open(output_csv, "rb") as data:
            blob_client.upload_blob(data, overwrite=True)
        
        print(f"Successfully uploaded to {blob_url}")
        run.log("output_csv_path", blob_url)
    except Exception as e:
        print(f"Error uploading to blob: {e}")
        raise

if __name__ == "__main__":
    main()
```

Save this as `clustering_script.py` in your Azure ML workspace.

---

## Step 4: Wire into ADF Pipeline

### In Azure Data Factory:

1. **Open your pipeline** that has the Copy Data activity
2. **Add a new activity:**
   - Type: **Azure ML Pipeline Run**
   - Name: "Run Clustering Pipeline"
   
3. **Configure:**
   - **AML Pipeline ID:** Paste the published pipeline ID from Step 2
   - **Linked Service:** Your Azure ML linked service
   
4. **Set dependency:**
   - Right-click the new ML activity → **Add success dependency**
   - Select the Copy Data activity as the predecessor
   - This ensures clustering runs AFTER curated data is ready

5. **Publish the pipeline**

### Visual Flow:
```
Event Trigger (blob created in raw-events)
        ↓
Copy Data Activity (raw-events → curated-features as Parquet)
        ↓
ML Pipeline Run Activity (reads curated-features → clustering → model-output CSV)
        ↓
[Phase 12.3] Blob Trigger (detects engagement_tiers_output_*.csv)
        ↓
Azure Function (syncs CSV to Supabase)
```

---

## Step 5: Test the End-to-End Flow

1. **Manually trigger export** in DoodleDesk:
   - Open app → Analytics → Export Activities
   - File appears in `raw-events`

2. **Monitor ADF:**
   - Go to ADF → **Monitor** → **Pipeline Runs**
   - Confirm Copy Data runs successfully
   - Confirm ML Pipeline Run starts automatically

3. **Check model-output container:**
   - Azure Portal → Storage Account → `model-output` container
   - Should see `engagement_tiers_output_YYYYMMDD_HHMMSS.csv`

4. **Verify CSV contents:**
   - Download and check it has columns: `user_id`, `engagement_tier`, `engagement_score`, etc.

---

## Step 6: Create Environment (if needed)

If your compute cluster doesn't have scikit-learn, pandas, etc., create an environment:

```python
from azureml.core import Environment
from azureml.core.conda_dependencies import CondaDependencies

env = Environment(name="DoodleDeskClusteringEnv")
conda_dep = CondaDependencies()
conda_dep.add_pip_package("scikit-learn==1.3.0")
conda_dep.add_pip_package("pandas==2.0.0")
conda_dep.add_pip_package("azure-storage-blob==12.17.0")
conda_dep.add_pip_package("azure-identity==1.13.0")

env.python.conda_dependencies = conda_dep
env.register(workspace=ws)
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Datastore not found" | Verify datastore names in your workspace |
| "Compute target not found" | Replace `"your-compute-cluster-name"` with actual cluster name |
| "DefaultAzureCredential failed" | Ensure compute has managed identity enabled |
| "CSV not appearing in blob" | Check cluster logs in AML Studio → Run details |

---

## Next Step: Phase 12.3

Once CSV appears in `model-output` successfully, move to **Phase 12.3** to build the Azure Function that:
- Triggers when CSV lands
- Parses CSV
- Upserts rows into Azure SQL `engagement_tiers` table
- Syncs to Supabase `user_engagement_tiers` table
