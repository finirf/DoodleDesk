"""Run filename-agnostic K-means clustering for DoodleDesk curated event data.

Usage (inside Azure ML notebook terminal or local Python):
  python docs/azure/kmeans_auto_from_curated.py \
    --input-root curated_download \
    --output-csv engagement_tiers_output.csv
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train K-means from all Parquet files under a directory."
    )
    parser.add_argument(
        "--input-root",
        default="curated_download",
        help="Directory to recursively scan for .parquet files.",
    )
    parser.add_argument(
        "--output-csv",
        default="engagement_tiers_output.csv",
        help="Path to write engagement tier assignments.",
    )
    parser.add_argument(
        "--k-target",
        type=int,
        default=3,
        help="Preferred number of clusters (auto-falls back for tiny sample sizes).",
    )
    return parser.parse_args()


def load_all_parquet(input_root: Path) -> pd.DataFrame:
    parquet_files = sorted(input_root.rglob("*.parquet"))
    if not parquet_files:
        raise FileNotFoundError(
            f"No parquet files found under {input_root}. "
            "Confirm ADF wrote parquet output to curated-features."
        )
    return pd.concat((pd.read_parquet(path) for path in parquet_files), ignore_index=True)


def build_user_metrics(df: pd.DataFrame) -> pd.DataFrame:
    required = [
        "total_notes",
        "total_edits",
        "avg_session_duration_seconds",
        "collaboration_count",
    ]
    if all(col in df.columns for col in required):
        return df.copy()

    needed_event_cols = [
        "user_id",
        "note_id",
        "edit_count",
        "session_seconds",
        "collaboration_count",
    ]
    missing = [col for col in needed_event_cols if col not in df.columns]
    if missing:
        raise ValueError(f"Missing columns to build user metrics: {missing}")

    return (
        df.groupby("user_id", dropna=False)
        .agg(
            total_notes=("note_id", lambda s: s.dropna().nunique()),
            total_edits=("edit_count", "sum"),
            avg_session_duration_seconds=("session_seconds", "mean"),
            collaboration_count=("collaboration_count", "sum"),
        )
        .reset_index()
    )


def select_k(n_samples: int, k_target: int) -> int:
    if n_samples < 2:
        raise ValueError(f"Need at least 2 users for clustering. Found {n_samples}.")
    if n_samples <= k_target:
        return max(2, n_samples - 1)
    return k_target


def run_clustering(user_metrics: pd.DataFrame, k_target: int) -> tuple[pd.DataFrame, int]:
    features = [
        "total_notes",
        "total_edits",
        "avg_session_duration_seconds",
        "collaboration_count",
    ]
    x = user_metrics[features].fillna(0).values
    k = select_k(len(x), k_target)

    x_scaled = StandardScaler().fit_transform(x)
    model = KMeans(n_clusters=k, random_state=42, n_init=10)
    clusters = model.fit_predict(x_scaled)

    labels = len(set(clusters))
    if 1 < labels < len(x):
        silhouette = silhouette_score(x_scaled, clusters)
        print(f"Silhouette Score: {silhouette:.4f}")
    else:
        print(f"Silhouette score skipped (labels={labels}, samples={len(x)}).")

    ordered = np.argsort(model.cluster_centers_.sum(axis=1))
    if k == 3:
        tier_names = ["low", "medium", "high"]
    elif k == 2:
        tier_names = ["low", "high"]
    else:
        tier_names = [f"tier_{idx}" for idx in range(k)]

    tier_map = {ordered[idx]: tier_names[idx] for idx in range(k)}

    result = user_metrics.copy()
    result["cluster"] = clusters
    result["engagement_tier"] = result["cluster"].map(tier_map)
    result["engagement_score"] = np.clip(((clusters + 1) * (100 / k)).round(), 0, 100)

    print(f"Users clustered: {len(result)}, k used: {k}")
    print(result["engagement_tier"].value_counts(dropna=False))

    return result, k


def main() -> None:
    args = parse_args()

    input_root = Path(args.input_root)
    output_csv = Path(args.output_csv)

    df = load_all_parquet(input_root)
    user_metrics = build_user_metrics(df)
    result, _ = run_clustering(user_metrics, args.k_target)

    result.to_csv(output_csv, index=False)
    print(f"Saved: {output_csv.resolve()}")


if __name__ == "__main__":
    main()
