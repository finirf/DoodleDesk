# Azure Assignment Artifacts

This folder contains local files used for the DoodleDesk Analytics Azure assignment.

## Files

- `activity_event_schema_v1.json`: JSON Schema for exported DoodleDesk activity events.
- `sample_activity_events_2026-04-15.json`: realistic sample activity batch for local review and upload testing.
- `sample_activity_events_2026-04-16_collab_burst.json`: collaboration-heavy team session with desktop/tablet/mobile users.
- `sample_activity_events_2026-04-17_cross_desk_mobile.json`: cross-desk workflow with mobile-first usage and shared edits.
- `sample_activity_events_2026-04-18_heavy_editor.json`: heavy editing behavior and long-session usage for clustering stress tests.
- `kmeans_auto_from_curated.py`: filename-agnostic clustering helper that scans all curated Parquet files and writes engagement tiers CSV.

## Suggested use

1. Review the schema before creating your Azure Blob container layout.
2. Upload one or many sample files into `raw-events`; the pipeline should use wildcard ingestion (`*.json`) so filename does not matter.
3. Keep the schema and sample files versioned here so the assignment artifacts stay with the repo.
4. Run the automation helper after curated files arrive, for example:
	- `python docs/azure/kmeans_auto_from_curated.py --input-root curated_download --output-csv engagement_tiers_output.csv`
