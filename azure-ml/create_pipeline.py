#!/usr/bin/env python
# create_pipeline.py
# Publishes the DoodleDesk clustering pipeline to Azure ML

from azureml.core import Workspace, Environment
from azureml.pipeline.core import Pipeline
from azureml.pipeline.core import PipelineParameter
from azureml.pipeline.steps import PythonScriptStep
from azureml.core.runconfig import RunConfiguration
from datetime import datetime

# ============================================================
# CONFIGURATION
# ============================================================

COMPUTE_CLUSTER_NAME = "cpu-cluster"
STORAGE_ACCOUNT_NAME = "doodledeskaml5831774892"
INPUT_BLOB_CONTAINER = "curated-features"
OUTPUT_BLOB_CONTAINER = "model-output"

# ============================================================
# PIPELINE CREATION
# ============================================================

def main():
    print("Loading workspace...")
    ws = Workspace.from_config()
    print(f"✓ Workspace: {ws.name}")

    input_blob_name = PipelineParameter(
        name="input_blob_name",
        default_value="__AUTO__",
    )
    
    # Get or create environment
    print("Setting up environment...")
    try:
        env = Environment.get(ws, name="DoodleDeskClusteringEnv")
        print("✓ Using existing environment: DoodleDeskClusteringEnv")
    except:
        print("  Creating new environment...")
        env = Environment(name="DoodleDeskClusteringEnv")
        from azureml.core.conda_dependencies import CondaDependencies
        
        conda_dep = CondaDependencies()
        conda_dep.add_pip_package("scikit-learn==1.3.0")
        conda_dep.add_pip_package("pandas==2.0.0")
        conda_dep.add_pip_package("azure-storage-blob==12.17.0")
        conda_dep.add_pip_package("azure-identity==1.13.0")
        
        env.python.conda_dependencies = conda_dep
        env.register(workspace=ws)
        print("✓ Environment registered: DoodleDeskClusteringEnv")
    
    # Configure compute
    print(f"Configuring compute: {COMPUTE_CLUSTER_NAME}")
    run_config = RunConfiguration()
    run_config.environment = env
    run_config.target = COMPUTE_CLUSTER_NAME
    
    # Create Python script step (no datastores needed)
    print("Creating pipeline step...")
    clustering_step = PythonScriptStep(
        name="K-Means Clustering",
        script_name="clustering_script.py",
        arguments=[
            "--storage_account", STORAGE_ACCOUNT_NAME,
            "--input_container", INPUT_BLOB_CONTAINER,
            "--output_container", OUTPUT_BLOB_CONTAINER,
            "--input_blob_name", input_blob_name
        ],
        compute_target=COMPUTE_CLUSTER_NAME,
        runconfig=run_config,
        allow_reuse=False
    )
    
    # Build pipeline
    print("Building pipeline...")
    pipeline = Pipeline(ws, steps=[clustering_step])
    
    # Publish pipeline
    print("Publishing pipeline to Azure ML...")
    pipeline_version = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    published_pipeline = pipeline.publish(
        name="DoodleDesk-Clustering-Pipeline",
        description="K-means clustering for engagement tier assignment",
        version=pipeline_version
    )
    
    print("\n" + "="*60)
    print("✓ SUCCESS! Pipeline published.")
    print("="*60)
    print(f"Pipeline ID: {published_pipeline.id}")
    print(f"Pipeline Name: {published_pipeline.name}")
    print(f"Pipeline Version: {pipeline_version}")
    print("\nNext steps:")
    print("1. Go to Azure Data Factory → Your pipeline")
    print("2. Add an 'Azure ML Pipeline Run' activity")
    print("3. Paste the Pipeline ID above")
    print("4. Set it to run after the Copy Data activity succeeds")
    print("5. Optionally pass the curated Parquet blob name into the pipeline parameter input_blob_name")
    print("="*60)

if __name__ == "__main__":
    main()
