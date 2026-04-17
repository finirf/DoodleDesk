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


def build_output_csv_name(input_blob_name: str) -> str:
    """
    Derive the output CSV filename from the input Parquet blob name.
    Extracts the numeric timestamp after the last underscore, regardless of extension.

    Examples:
      activity_export_1ec7749b-5901-4aeb-813c-950c483008a9_1776408246852.parquet
        -> engagement_tiers_output_1776408246852.csv
      activity_export_1776405483915.parquet
        -> engagement_tiers_output_1776405483915.csv
      somefile.parquet (no underscore with numeric suffix)
        -> engagement_tiers_output.csv
    """
    if not input_blob_name or input_blob_name == "__AUTO__":
        return "engagement_tiers_output.csv"

    stem = os.path.basename(input_blob_name).rsplit(".", 1)[0]  # strip extension

    if "_" in stem:
        suffix = stem.rsplit("_", 1)[-1]
        if suffix.isdigit():
            return f"engagement_tiers_output_{suffix}.csv"

    return "engagement_tiers_output.csv"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--storage_account",  type=str, required=True, help="Storage account name")
    parser.add_argument("--input_container",  type=str, required=True, help="Input blob container")
    parser.add_argument("--output_container", type=str, required=True, help="Output blob container")
    parser.add_argument(
        "--input_blob_name",
        type=str,
        default="__AUTO__",
        help="Specific Parquet blob to process (e.g. activity_export_<GUID>_<TIMESTAMP>.parquet). Defaults to newest.",
    )
    args = parser.parse_args()

    # Get Azure ML run context for logging
    run = Run.get_context()

    # ------------------------------------------------------------------ #
    # Download curated data from blob storage                             #
    # ------------------------------------------------------------------ #
    storage_account = args.storage_account
    input_container = args.input_container

    target_dir = Path("curated_download")
    target_dir.mkdir(exist_ok=True)

    print(f"Downloading from {storage_account}/{input_container}...")
    credential = DefaultAzureCredential()

    container_url = f"https://{storage_account}.blob.core.windows.net/{input_container}"
    container_client = ContainerClient.from_container_url(container_url, credential=credential)

    parquet_blobs = [blob for blob in container_client.list_blobs() if blob.name.endswith(".parquet")]

    input_blob_name = (args.input_blob_name or "").strip()

    if input_blob_name and input_blob_name != "__AUTO__":
        selected_blobs = [blob for blob in parquet_blobs if blob.name == input_blob_name]
        if not selected_blobs:
            raise ValueError(f"Specific input blob not found: {input_blob_name}")
    else:
        if not parquet_blobs:
            raise ValueError("No parquet files found in input container")
        selected_blobs = [max(parquet_blobs, key=lambda blob: blob.last_modified)]

    parquet_files = []
    for blob in selected_blobs:
        blob_client = container_client.get_blob_client(blob.name)
        file_path = target_dir / blob.name
        file_path.parent.mkdir(parents=True, exist_ok=True)

        with open(file_path, "wb") as f:
            f.write(blob_client.download_blob().readall())

        parquet_files.append(file_path)
        print(f"  Downloaded: {blob.name}")

    # Derive output name from whichever blob was actually selected.
    # Done here (after selection) so __AUTO__ picks up the real blob name.
    resolved_blob_name = selected_blobs[0].name
    csv_name = build_output_csv_name(resolved_blob_name)
    print(f"Input blob : {resolved_blob_name}")
    print(f"Output CSV : {csv_name}")

    if csv_name == "engagement_tiers_output.csv":
        print(
            "WARNING: Could not extract a numeric timestamp from the input blob name. "
            "Output will be 'engagement_tiers_output.csv' — ADF sync may 404 if it expects a timestamped name."
        )

    print(f"Found {len(parquet_files)} parquet file(s)")

    # ------------------------------------------------------------------ #
    # Load and combine all parquet files                                  #
    # ------------------------------------------------------------------ #
    dfs = [pd.read_parquet(f) for f in parquet_files]
    df = pd.concat(dfs, ignore_index=True)
    print(f"Combined shape: {df.shape}")

    # ------------------------------------------------------------------ #
    # Build per-user metrics                                              #
    # ------------------------------------------------------------------ #
    required = ["total_notes", "total_edits", "avg_session_duration_seconds", "collaboration_count"]

    if all(c in df.columns for c in required):
        user_metrics = df.copy()
    else:
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

    # ------------------------------------------------------------------ #
    # K-Means clustering (or fallback for tiny datasets)                  #
    # ------------------------------------------------------------------ #
    X = user_metrics[required].fillna(0).values

    if len(X) < 3:
        print(f"Only {len(X)} user(s) found; using fallback tier assignment.")
        metric_sum = user_metrics[required].fillna(0).sum(axis=1)

        if len(X) == 1:
            user_metrics["cluster"] = 1
            user_metrics["engagement_tier"] = "medium"
            user_metrics["engagement_score"] = 50
        else:
            order = metric_sum.rank(method="first").astype(int) - 1
            user_metrics["cluster"] = order
            user_metrics["engagement_tier"] = order.map({0: "low", 1: "high"})
            user_metrics["engagement_score"] = order.map({0: 33, 1: 67})

        run.log("fallback_tiering_used", 1)
    else:
        X_scaled = StandardScaler().fit_transform(X)
        kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
        clusters = kmeans.fit_predict(X_scaled)

        if len(set(clusters)) > 1:
            sil = silhouette_score(X_scaled, clusters)
            print(f"Silhouette Score: {sil:.4f}")
            run.log("silhouette_score", sil)

        tier_order = np.argsort(kmeans.cluster_centers_.sum(axis=1))
        tier_map = {tier_order[i]: ["low", "medium", "high"][i] for i in range(3)}

        user_metrics["cluster"] = clusters
        user_metrics["engagement_tier"] = user_metrics["cluster"].map(tier_map)
        user_metrics["engagement_score"] = np.clip((clusters + 1) * 33, 0, 100)

    print(f"Updated {len(user_metrics)} users with engagement tiers")

    # ------------------------------------------------------------------ #
    # Log metrics                                                         #
    # ------------------------------------------------------------------ #
    run.log("total_users",        len(user_metrics))
    run.log("low_tier_count",    (user_metrics["engagement_tier"] == "low").sum())
    run.log("medium_tier_count", (user_metrics["engagement_tier"] == "medium").sum())
    run.log("high_tier_count",   (user_metrics["engagement_tier"] == "high").sum())

    # ------------------------------------------------------------------ #
    # Write and upload output CSV                                         #
    # ------------------------------------------------------------------ #
    output_cols = [
        "user_id", "engagement_tier", "engagement_score",
        "total_notes", "total_edits", "avg_session_duration_seconds", "collaboration_count",
    ]
    user_metrics[output_cols].to_csv(csv_name, index=False)

    blob_url = f"https://{args.storage_account}.blob.core.windows.net/{args.output_container}/{csv_name}"

    try:
        blob_client = BlobClient.from_blob_url(blob_url, credential=DefaultAzureCredential())
        with open(csv_name, "rb") as data:
            blob_client.upload_blob(data, overwrite=True)

        print(f"Successfully uploaded to {blob_url}")
        run.log("output_csv_path", blob_url)

        if hasattr(run, "parent") and run.parent:
            run.parent.set_tags({"output_csv_name": csv_name})
        print(f"##output_csv_name={csv_name}")

    except Exception as e:
        print(f"Error uploading to blob: {e}")
        raise


if __name__ == "__main__":
    main()