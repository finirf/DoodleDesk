# Azure DoodleDesk Analytics - Setup Instructions

This document provides step-by-step instructions for setting up the Azure infrastructure for the DoodleDesk Analytics final project.

If you already have an Azure Data Factory flow that copies data from `raw-events` into `curated-features`, keep it. This guide treats `curated-features` as the curated landing zone and makes SQL optional.

**Timeline**: ~2-3 hours for complete setup (most time is waiting for resource provisioning)

---

## Prerequisites

- Active Azure subscription with sufficient quota for:
  - 1 Storage Account (Blob)
- 1 Azure SQL Database or Cosmos DB if you want a relational downstream store
  - 1 Azure Data Factory
  - 1 Azure Machine Learning workspace
- Azure Portal access
- Downloaded files from this repo:
  - `docs/azure/activity_event_schema_v1.json`
  - `docs/azure/sample_activity_events_2026-04-15.json`
   - `docs/azure/sample_activity_events_2026-04-16_collab_burst.json`
   - `docs/azure/sample_activity_events_2026-04-17_cross_desk_mobile.json`
   - `docs/azure/sample_activity_events_2026-04-18_heavy_editor.json`

---

## Phase 1: Create Resource Group (5 min)

### Step 1.1 - Open Azure Portal
1. Navigate to https://portal.azure.com
2. Sign in with your subscription account
3. In the search bar at the top, type **"Resource groups"** and click the first result

### Step 1.2 - Create New Resource Group
1. Click **+ Create** button
2. Fill in:
   - **Subscription**: Select your subscription
   - **Resource group name**: `doodledesk-analytics-rg`
   - **Region**: Select closest region (e.g., `East US`, `West Europe`)
3. Click **Review + create**, then **Create**
4. Wait for deployment to complete (~1 min)

### Validation
- You should see a green checkmark with "Deployment succeeded"

---

## Phase 2: Create Storage Account & Blob Container (10 min)

### Step 2.1 - Create Storage Account
1. In the search bar, type **"Storage accounts"** and click the result
2. Click **+ Create**
3. Fill in:
   - **Resource group**: `doodledesk-analytics-rg`
   - **Storage account name**: `doodledeskblob12345` (must be globally unique; add random numbers)
   - **Region**: Same as resource group
   - **Performance**: Standard
   - **Redundancy**: Locally-redundant storage (LRS) — cheapest option
4. Click **Review + create**, then **Create**
5. Wait for deployment (~2 min)

### Step 2.2 - Create Blob Container
1. After deployment, click **Go to resource**
2. In the left menu under **Data storage**, click **Containers**
3. Click **+ Container** button
4. Fill in:
   - **Name**: `raw-events`
   - **Public access level**: Private (default is fine)
5. Click **Create**

### Step 2.3 - Create Lifecycle Policy (Optional but Recommended)
1. Still in the Storage Account, go to **Lifecycle management** (left menu)
2. Click **Add a rule**
3. Name: `Cleanup old blobs`
4. Apply to: **All blobs**
5. Conditions:
   - **Base blobs modified before**: 90 days ago
   - **Action**: Delete blob
6. Click **Add**

### Validation
- You should see the `raw-events` container listed with status "Private"

---

## Phase 3: Optional SQL Database for Downstream Analytics (15 min)

### Step 3.1 - Create SQL Server
1. Search for **"SQL databases"** in the portal
2. Click **+ Create**
3. Fill in **Basics** tab:
   - **Resource group**: `doodledesk-analytics-rg`
   - **Database name**: `doodledesk-analytics`
   - **Server**: Click **Create new**
     - **Server name**: `doodledeskdb12345` (globally unique)
     - **Location**: Same region as resource group
     - **Authentication method**: SQL authentication
     - **Server admin login**: `analyticsadmin`
     - **Password**: Create strong password; save it in a secure location
   - Click **OK** after server creation

4. Click **Next: Networking**
5. Set **Connectivity method**: Public endpoint
6. Under **Firewall rules**, check **Allow Azure services and resources to access this server**

7. Click **Review + create**, then **Create**
8. Wait for deployment (~5 min)

### Step 3.2 - Allow Your IP
1. Go to the SQL Database resource
2. Click **Set server firewall** at the top
3. Click **Add your client IP** button
4. Save the rule

### Validation
- You should see the database listed with status "Available"
- If you are keeping the project Blob-only for now, you can skip Phases 3-4 and move straight to the curated-features pipeline

---

## Phase 4: Optional SQL Tables for Later Aggregation (10 min)

### Step 4.1 - Open Query Editor
1. In the SQL Database, click **Query editor** (left menu)
2. Login with credentials from Step 3.1:
   - **Login**: `analyticsadmin`
   - **Password**: (from Step 3.1)

### Step 4.2 - Create Raw Events Table
Copy and paste this SQL, then click **Run**:

```sql
CREATE TABLE raw_events (
    event_id NVARCHAR(255) PRIMARY KEY,
    user_id NVARCHAR(255) NOT NULL,
    desk_id NVARCHAR(255) NOT NULL,
    event_type NVARCHAR(50) NOT NULL,
    event_ts_utc DATETIME2 NOT NULL,
    session_id NVARCHAR(255) NOT NULL,
    note_id NVARCHAR(255) NULL,
    edit_count INT DEFAULT 0,
    collaboration_count INT DEFAULT 0,
    session_seconds INT DEFAULT 0,
    device_type NVARCHAR(50),
    platform NVARCHAR(255),
    metadata_json NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE INDEX idx_user_id ON raw_events(user_id);
CREATE INDEX idx_event_ts ON raw_events(event_ts_utc);
```

### Step 4.3 - Create Cleaned Events Table
Copy and paste, then click **Run**:

```sql
CREATE TABLE cleaned_events (
    event_id NVARCHAR(255) PRIMARY KEY,
    user_id NVARCHAR(255) NOT NULL,
    desk_id NVARCHAR(255) NOT NULL,
    event_type NVARCHAR(50) NOT NULL,
    event_ts_utc DATETIME2 NOT NULL,
    session_id NVARCHAR(255) NOT NULL,
    session_seconds INT NOT NULL,
    data_quality_flags NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE INDEX idx_cleaned_user ON cleaned_events(user_id);
```

### Step 4.4 - Create User Engagement Metrics Table
Copy and paste, then click **Run**:

```sql
CREATE TABLE user_engagement_metrics (
    user_id NVARCHAR(255) PRIMARY KEY,
    total_notes INT DEFAULT 0,
    total_edits INT DEFAULT 0,
    total_sessions INT DEFAULT 0,
    avg_session_duration_seconds INT DEFAULT 0,
    collaboration_count INT DEFAULT 0,
    first_event_date DATETIME2,
    last_event_date DATETIME2,
    computed_at DATETIME2 DEFAULT GETUTCDATE()
);
```

### Step 4.5 - Create User Engagement Tiers Table
Copy and paste, then click **Run**:

```sql
CREATE TABLE user_engagement_tiers (
    user_id NVARCHAR(255) PRIMARY KEY,
    engagement_tier NVARCHAR(50) NOT NULL, -- 'low', 'medium', 'high'
    engagement_score INT DEFAULT 0, -- 0-100
    cluster_index INT,
    assigned_at DATETIME2 DEFAULT GETUTCDATE()
);
```

### Validation
- After each script, you should see "Query executed successfully"
- Skip this entire phase if you are not using SQL yet; the curated-features flow does not depend on these tables

---

## Phase 5: Create Azure Data Factory (20 min)

### Step 5.1 - Create Data Factory Resource
1. Search for **"Data factories"** in the portal
2. Click **+ Create**
3. Fill in:
   - **Resource group**: `doodledesk-analytics-rg`
   - **Name**: `doodledesk-adf`
   - **Region**: Same as resource group
4. Click **Review + create**, then **Create**
5. Wait for deployment (~5 min)

### Step 5.2 - Open Data Factory Studio
1. After deployment, click **Go to resource**
2. Click the **Open Azure Data Factory Studio** button
3. This opens a new tab with the ADF authoring interface

### Step 5.3 - Create Linked Service to Blob Storage
1. In the left panel, click the **Manage** icon (wrench icon)
2. Under **Connections**, click **Linked services**
3. Click **+ New**
4. Search for **"Azure Blob Storage"** and click it
5. Fill in:
   - **Name**: `BlobStorageConnection`
   - **Authentication method**: Account key
   - **Storage account name**: (from Step 2.1, e.g., `doodledeskblob12345`)
   - **Storage account key**: Go back to Storage Account → **Access keys** → Copy **key1** value
6. Click **Create**

### Step 5.4 - Optional Linked Service to SQL Database
1. Click **+ New** again if you are using SQL later
2. Search for **"Azure SQL Database"** and click it
3. Fill in:
   - **Name**: `SQLDatabaseConnection`
   - **Server**: (e.g., `doodledeskdb12345.database.windows.net`)
   - **Database**: `doodledesk-analytics`
   - **Authentication type**: SQL authentication
   - **User name**: `analyticsadmin`
   - **Password**: (from Step 3.1)
4. Click **Create**

### Validation
- You should see the Blob linked service listed under **Linked services**
- If you created SQL, it should also appear there

---

## Phase 6: Keep or Create the Curated-Features Pipeline (30 min)

### Step 6.1 - Use the Existing Raw-to-Curated Flow
1. In the ADF Studio, click the **Author** icon (pencil icon) in the left panel
2. Open the pipeline you already created that copies `raw-events` into `curated-features`
3. If you have not created one yet, click **+ → Pipeline** and name it `Copy_Raw_To_Curated_Features`

### Step 6.2 - Add or Confirm the Copy Activity
1. In the **Activities** panel on the right, search for **"Copy"**
2. Drag **Copy data** onto the canvas if the pipeline is new
3. Click on the Copy activity to configure it:

**Source**:
   - Select **BlobStorageConnection**
   - Container: `raw-events`
   - File pattern: `*.json`
   - Enable recursive traversal if your `raw-events` container uses subfolders

**Sink**:
   - Select the destination dataset or linked service that writes into `curated-features`
   - Container/folder/table name: `curated-features`
   - Set output format to Parquet (recommended for ML and analytics)

4. Click the **Validate** button at the top to check for errors
5. If valid, click **Publish all** to save the pipeline

### Step 6.3 - Make Ingestion Automatic (Filename-Agnostic)
1. Click **Add trigger** and choose one:
   - **Storage event trigger** (recommended): run when a new blob is created in `raw-events`
   - **Schedule trigger**: run every 5-15 minutes for batch ingestion
2. Keep source wildcard as `*.json` so any file name is accepted
3. Publish trigger and validate one test upload with a non-standard filename (for example `team_sync_2026_04_20.json`)

### Step 6.4 - Test the Pipeline
1. Click the **Add trigger** button → **Trigger now**
2. This will attempt to copy any matching files from `raw-events` into `curated-features`
3. Wait a few moments, then check the **Monitor** tab to see run status

### Validation
- Pipeline should show "Succeeded" status in the Monitor tab

---

## Phase 7: Upload Sample Data to Blob (5 min)

### Step 7.1 - Upload Sample Activity File
1. Go back to the Storage Account in the portal
2. Click **Containers** in the left menu
3. Click on `raw-events` container
4. Click **Upload** button
5. Select one or many files from this repo, for example:
   - `docs/azure/sample_activity_events_2026-04-15.json`
   - `docs/azure/sample_activity_events_2026-04-16_collab_burst.json`
   - `docs/azure/sample_activity_events_2026-04-17_cross_desk_mobile.json`
   - `docs/azure/sample_activity_events_2026-04-18_heavy_editor.json`
6. Click **Upload**

### Step 7.2 - Verify the Curated Output
1. Go to the Storage Account or the ADF Monitor view
2. Confirm that the pipeline wrote output into `curated-features`
3. If your pipeline includes SQL downstream, verify that store separately

### Validation
- Query returns the count of imported events (should be > 0)

---

## Phase 8: Create Azure Machine Learning Workspace (30 min)

### Step 8.1 - Create ML Workspace
1. Search for **"Machine Learning"** in the portal
2. Click **+ Create**
3. Fill in:
   - **Resource group**: `doodledesk-analytics-rg`
   - **Workspace name**: `doodledesk-ml`
   - **Region**: Same region
4. Click **Review + create**, then **Create**
5. Wait for deployment (~10 min)

### Step 8.2 - Open ML Studio
1. After deployment, click **Go to resource**
2. Click the **Launch studio** button
3. This opens Azure ML Studio in a new tab

### Step 8.3 - Create Blob Datastore for Curated Features
1. In ML Studio, click **Data** in the left menu
2. Click **Datastores** tab
3. Click **+ New datastore**
4. Fill in:
   - **Name**: `DoodleDeskCurated`
   - **Datastore type**: Azure Blob Storage
   - **Storage account**: select the same storage account used by ADF
   - **Container**: `curated-features`
5. Click **Create**

### Validation
- Datastore should appear in the datastores list

---

## Phase 9: Prepare ML Dataset and Train K-Means (20 min)

### Step 9.1 - Create Dataset from Curated Features
1. In ML Studio, click **Data** → **Datasets**
2. Click **+ Create dataset** → **From datastore**
3. Fill in:
    - **Name**: `UserEngagementMetrics`
    - **Datastore**: `DoodleDeskCurated`
   - **Path**: point to the aggregated Parquet file or Parquet folder in `curated-features`
4. Click **Create**

### Step 9.2 - Create ML Notebook for K-Means Training
1. Click **Notebooks** in the left menu
2. Click **+ New file** (create notebook)
3. Name it: `kmeans_clustering_training`
4. Paste this Python code:

```python
# Import libraries
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
from pathlib import Path

# Load all curated Parquet files (filename-agnostic)
parquet_files = sorted(Path('curated_download').rglob('*.parquet'))
if not parquet_files:
   parquet_files = sorted(Path('.').rglob('*.parquet'))

if not parquet_files:
   raise FileNotFoundError('No parquet files found. Confirm ADF wrote parquet into curated-features.')

df = pd.concat((pd.read_parquet(p) for p in parquet_files), ignore_index=True)

# Aggregate event-level records into user-level features when needed
required_features = ['total_notes', 'total_edits', 'avg_session_duration_seconds', 'collaboration_count']
if all(col in df.columns for col in required_features):
   user_metrics = df.copy()
else:
   user_metrics = (
      df.groupby('user_id', dropna=False)
        .agg(
           total_notes=('note_id', lambda s: s.dropna().nunique()),
           total_edits=('edit_count', 'sum'),
           avg_session_duration_seconds=('session_seconds', 'mean'),
           collaboration_count=('collaboration_count', 'sum'),
        )
        .reset_index()
   )

# Prepare features
features = ['total_notes', 'total_edits', 'avg_session_duration_seconds', 'collaboration_count']
X = user_metrics[features].fillna(0).values

# Normalize features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Train K-means clustering (target k=3; auto-fallback for tiny datasets)
k_target = 3
n_samples = len(X)
if n_samples < 2:
   raise ValueError(f'Need at least 2 users to cluster. Found {n_samples}.')
k = min(k_target, n_samples - 1) if n_samples <= k_target else k_target
kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
clusters = kmeans.fit_predict(X_scaled)

# Calculate silhouette score when valid
label_count = len(set(clusters))
if 1 < label_count < n_samples:
   silhouette_avg = silhouette_score(X_scaled, clusters)
   print(f"Silhouette Score: {silhouette_avg:.4f}")
else:
   print(f"Silhouette score skipped (labels={label_count}, samples={n_samples}).")

# Assign engagement tiers based on cluster centers
tier_order = np.argsort(kmeans.cluster_centers_.sum(axis=1))
if k == 3:
   tier_names = ['low', 'medium', 'high']
elif k == 2:
   tier_names = ['low', 'high']
else:
   tier_names = [f'tier_{i}' for i in range(k)]
tier_map = {tier_order[i]: tier_names[i] for i in range(k)}

# Create engagement scores
engagement_scores = np.clip(((clusters + 1) * (100 / k)).round(), 0, 100)

user_metrics['cluster'] = clusters
user_metrics['engagement_tier'] = user_metrics['cluster'].map(tier_map)
user_metrics['engagement_score'] = engagement_scores

print(f"Updated {len(user_metrics)} users with engagement tiers (k used: {k})")
print(user_metrics['engagement_tier'].value_counts(dropna=False))
```

5. No filename replacement needed; the script auto-loads all available Parquet files.
6. Click the **Run** button (play icon)
7. Wait for execution (~2 min)

### Validation
- You should see output showing:
  - Silhouette Score (target: > 0.4 is good)
  - Count of users updated
  - Cluster distribution

---

## Phase 10: Verify Complete Pipeline (10 min)

### Step 10.1 - Check All Data Tables
1. Go to the Storage Account, container browser, or ADF Monitor
2. Confirm the pipeline wrote the expected file(s) into `curated-features`
3. If you added SQL later, verify that downstream store separately

### Step 10.2 - View Sample Results
1. Open the curated output file or the ML notebook output
2. Confirm the features you need for clustering are present

### Validation
- `curated-features` has the processed output
- Curated output is stored as Parquet (`.parquet`)
- K-means runs against the curated dataset
- Optional SQL tables can still be added later without changing the curated flow

---

## Phase 11: Load Model Output to SQL and Validate App Rendering (20 min)

### Step 11.1 - Load `model-output/engagement_tiers_output.csv` into SQL
1. In ADF Studio, create a pipeline (or extend your existing one) with a **Copy data** activity.
2. **Source**:
   - Linked service: Blob storage
   - Container: `model-output`
   - File pattern: `*.csv`
3. **Sink**:
   - Linked service: Azure SQL Database
   - Target table: `user_engagement_tiers`
4. Configure mapping so these CSV columns are loaded:
   - `user_id`, `engagement_tier`, `engagement_score`, `cluster`, `total_notes`, `total_edits`, `avg_session_duration_seconds`, `collaboration_count`
5. Trigger pipeline and confirm run status is **Succeeded**.

### Step 11.2 - Quick SQL Validation
Run a quick check in SQL Query Editor:

```sql
SELECT TOP 20 user_id, engagement_tier, engagement_score, total_notes, total_edits
FROM user_engagement_tiers
ORDER BY engagement_score DESC;
```

### Step 11.3 - Validate DoodleDesk Badge Rendering with Real Tiers
1. Start the app with final project mode enabled (`VITE_ENABLE_FINAL_PROJECT=true`).
2. Open the Engagement Dashboard section.
3. Confirm the tier badge now reflects live rows from `user_engagement_tiers` (instead of static mock values).
4. Confirm chart/summary still renders when only tier data exists.

### Validation
- SQL table has loaded rows from `engagement_tiers_output.csv`
- Engagement badge shows real tier/score values
- No frontend errors while loading engagement metrics

---

## Phase 12: Make Analytics Fully Automatic (No Manual Filename or Manual Load) (25 min)

### Step 12.1 - Auto-ingest raw events in ADF
1. Keep `raw-events` source wildcard as `*.json`.
2. Add a **Storage event trigger** on blob created in `raw-events`.
3. Keep sink as Parquet in `curated-features`.

### Step 12.2 - Auto-run model job on new curated data

**📋 Detailed Guide**: See [PHASE_12_2_ML_PIPELINE_SETUP.md](./PHASE_12_2_ML_PIPELINE_SETUP.md) for complete instructions on:
- Converting your K-means clustering notebook to an Azure ML Pipeline
- Wiring the pipeline into ADF with success dependencies
- Testing end-to-end flow

**Quick Overview**:
1. In Azure ML, save the clustering logic as a reusable job/script (or notebook pipeline).
2. Trigger this job on a schedule (for example every 15 minutes) or from ADF after curated copy succeeds.
3. Ensure the job writes `engagement_tiers_output.csv` to `model-output`.

### Step 12.3 - Auto-load model output into app-readable datastore
Your current app reads engagement tiers from Supabase tables (`user_engagement_tiers`, optionally `user_engagement_metrics`).

Choose one integration path:
1. **Recommended**: Blob-triggered Azure Function for `model-output/*.csv` that upserts into Supabase.
2. **Alternative**: ADF copy to Supabase Postgres if you have direct network/auth setup.

For the recommended function path:
1. Trigger on blob created in `model-output`.
2. Parse CSV and upsert rows by `user_id`.
3. Update `updated_at` on each upsert.
4. Store Supabase URL and service-role key in Key Vault/App Settings (never in code).

### Step 12.4 - Add freshness guardrails
1. Add alert if no new model-output file arrives within expected window.
2. Add alert if upsert count is zero or fails.
3. Record last successful run timestamp for dashboard health checks.

### Validation
- Uploading any `raw-events/*.json` file triggers the full flow without manual file renaming.
- New clustered tiers appear in Supabase automatically.
- Dashboard tier badge updates after next app refresh.

---

## Summary Checklist

- [ ] Resource Group created
- [ ] Storage Account with `raw-events` container created
- [ ] SQL Database created only if needed for downstream reporting
- [ ] Data Factory created with linked services and copy pipeline into `curated-features`
- [ ] Sample data uploaded to blob
- [ ] K-means model trained from curated data

**Next Steps**: Once this setup is complete, the DoodleDesk app can query the `user_engagement_tiers` table to display user's engagement tier in the dashboard.

---

## Estimated Azure Costs (Free/Low-Cost Configuration)

- **Storage Account (LRS)**: ~$2-5/month
- **SQL Database (Single DB, Basic tier)**: ~$5/month
- **Data Factory**: ~$1/month (copies are metered)
- **Azure ML**: ~Free tier available for light usage
- **Total estimated**: **$8-12/month** for this setup

To further reduce costs, consider:
- Use Azure Free Trial credits (~$200/month for 12 months)
- Use SQL Database Free Tier if eligible
- Delete resources when not actively testing

---

## Troubleshooting

**Issue**: "Storage account name already exists"
- **Solution**: Add more random numbers to make it unique globally

**Issue**: "Cannot connect to SQL database from Data Factory"
- **Solution**: Only relevant if your flow still writes to SQL; otherwise confirm the curated-features sink settings and the blob linked service

**Issue**: "K-means silhouette score is < 0.4"
- **Solution**: This is normal with small datasets. Adjust k=3 or try different feature scaling

**Issue**: "No data in curated-features after pipeline run"
- **Solution**: Check that `raw-events` has at least one `.json` file, source wildcard is `*.json`, and sink path points to `curated-features`

---

## Contact & Support

For Azure-specific issues, consult:
- Azure SQL Documentation: https://learn.microsoft.com/en-us/azure/azure-sql/
- Data Factory: https://learn.microsoft.com/en-us/azure/data-factory/
- ML Studio: https://learn.microsoft.com/en-us/azure/machine-learning/
