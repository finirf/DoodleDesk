#!/usr/bin/env python
# clustering_script.py
# Standalone script for Azure ML Pipeline
# Reads curated Parquet files, runs K-means clustering, exports engagement tiers CSV

import argparse
import os
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score

from azureml.core import Run
from azure.storage.blob import BlobClient, ContainerClient
from azure.identity import DefaultAzureCredential


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--storage_account", type=str, required=True, help="Storage account name")
    parser.add_argument("--input_container", type=str, required=True, help="Input blob container")
    parser.add_argument("--output_container", type=str, required=True, help="Output blob container")
    args = parser.parse_args()
    
    # Get Azure ML run context for logging
    run = Run.get_context()
    
    # Download curated data from blob storage
    storage_account = args.storage_account
    input_container = args.input_container
    
    target_dir = Path("curated_download")
    target_dir.mkdir(exist_ok=True)
    
    print(f"Downloading from {storage_account}/{input_container}...")
    credential = DefaultAzureCredential()
    
    # List and download parquet files from blob container
    container_url = f"https://{storage_account}.blob.core.windows.net/{input_container}"
    container_client = ContainerClient(container_url, credential=credential)
    
    parquet_files = []
    for blob in container_client.list_blobs():
        if blob.name.endswith(".parquet"):
            blob_client = container_client.get_blob_client(blob.name)
            file_path = target_dir / blob.name
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(file_path, "wb") as f:
                download_stream = blob_client.download_blob()
                f.write(download_stream.readall())
            
            parquet_files.append(file_path)
            print(f"  Downloaded: {blob.name}")
    
    if not parquet_files:
        raise ValueError("No parquet files found in input container")
    
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
    storage_account_name = args.storage_account
    container_name = args.output_container
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
