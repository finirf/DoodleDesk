# Phase 12.3: CSV Sync Function (Clustering Output → Supabase)

## Overview

Phase 12.3 automates the final leg of the ML pipeline: syncing clustering output CSVs from Azure Blob Storage (`model-output` container) back into Supabase engagement tables.

**Architecture:**
```
model-output/*.csv (from clustering)
        ↓
        Blob Trigger Event
        ↓
Azure Function: sync-clustering-output
        ↓
Parse CSV & Upsert to Supabase
        ↓
user_engagement_tiers + user_engagement_metrics
        ↓
Dashboard widgets refresh (EngagementTierBadge, EngagementChart)
```

---

## Prerequisites

✅ Phase 12.2 complete (clustering ML pipeline working, CSVs in `model-output`)  
✅ Supabase tables exist: `user_engagement_tiers`, `user_engagement_metrics`  
✅ Supabase connection credentials available

---

## Setup Steps

### 1. Deploy Supabase Edge Function

```bash
# Navigate to workspace
cd /path/to/DoodleDesk

# Deploy the sync function
supabase functions deploy sync-clustering-output \
  --project-id YOUR_SUPABASE_PROJECT_ID

# Verify deployment
supabase functions list --project-id YOUR_SUPABASE_PROJECT_ID
```

**Expected Output:**
```
NAME                          CREATED AT            UPDATED AT
sync-clustering-output        2026-04-16T14:30:00Z  2026-04-16T14:30:00Z
```

### 2. Set Environment Variables in Supabase

Log into Supabase Dashboard → Your Project → Edge Functions → sync-clustering-output → Settings

Add/verify these secrets:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role API key (from Settings → API → Service Role Key)
- `AZURE_STORAGE_ACCOUNT_NAME` - `doodledeskaml5831774892`
- `AZURE_STORAGE_ACCOUNT_KEY` - From Azure Portal → Storage Account → Access keys

```bash
# Or via CLI:
supabase secrets set \
  --project-id YOUR_SUPABASE_PROJECT_ID \
  AZURE_STORAGE_ACCOUNT_NAME=doodledeskaml5831774892 \
  AZURE_STORAGE_ACCOUNT_KEY="<key_from_azure>"
```

### 3. Create Blob Trigger in Azure Function (Manual)

Since Supabase Edge Functions don't support native blob triggers, we use an Azure Function to bridge:

#### Option A: Create HTTP-Triggered Azure Function (Recommended)

1. **In Azure Portal:**
   - Create Function App (or use existing)
   - Create new Function: **Timer Trigger** (runs every 5 minutes)
   - Or: **Blob Storage Trigger** → model-output container

2. **Sample Timer-Triggered Code (Azure Function Python/Node.js):**

```python
# TimerTrigger/__init__.py
import azure.functions as func
import requests
from azure.storage.blob import BlobServiceClient
import os
import json

def main(mytimer: func.TimerRequest) -> None:
    """Poll model-output container and invoke sync function on new CSVs"""
    
    storage_account_name = os.environ.get("AZURE_STORAGE_ACCOUNT_NAME")
    storage_account_key = os.environ.get("AZURE_STORAGE_ACCOUNT_KEY")
    supabase_sync_url = os.environ.get("SUPABASE_SYNC_FUNCTION_URL")
    
    # List blobs in model-output
    blob_service_client = BlobServiceClient(
        account_url=f"https://{storage_account_name}.blob.core.windows.net",
        credential=storage_account_key
    )
    
    container_client = blob_service_client.get_container_client("model-output")
    
    for blob in container_client.list_blobs():
        if blob.name.endswith(".csv") and "engagement_tiers_output" in blob.name:
            # Invoke Supabase sync function for this blob
            response = requests.post(
                supabase_sync_url,
                json={"blobName": blob.name},
                headers={"Authorization": f"Bearer {os.environ.get('SUPABASE_ANON_KEY')}"}
            )
            
            if response.status_code == 200:
                print(f"Synced: {blob.name}")
            else:
                print(f"Failed: {blob.name} - {response.text}")
```

#### Option B: Blob Storage Trigger (Simplest)

If using standard Azure Functions (not Deno), Blob Storage triggers work natively:

```javascript
// Azure Function: BlobTrigger
module.exports = async function (context, myBlob) {
    const blobName = context.bindingData.name;
    
    if (!blobName.includes("engagement_tiers_output") || !blobName.endsWith(".csv")) {
        return; // Ignore non-matching blobs
    }
    
    // Call Supabase sync function
    const response = await fetch(
        "YOUR_SUPABASE_FUNCTION_URL/functions/v1/sync-clustering-output",
        {
            method: "POST",
            body: JSON.stringify({ blobName }),
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.SUPABASE_ANON_KEY}`
            }
        }
    );
    
    const result = await response.json();
    context.log(`Sync result: ${JSON.stringify(result)}`);
};
```

### 4. Wire Into ADF (Optional: Direct-Trigger Approach)

If you want ADF to trigger the sync directly after clustering completes:

1. **In Azure Data Factory:**
   - Add new activity after "Azure ML Pipeline Run": **Web Activity**
   - **URL:** `https://{your-supabase-project}.functions.supabase.co/functions/v1/sync-clustering-output`
   - **Method:** POST
   - **Body:**
     ```json
     {
       "blobName": "@{activity('Get Blob Name').output.itemName}"
     }
     ```
   - **Success dependency:** Runs after Azure ML Pipeline completes

2. **Alternative:** Use output parameters from clustering step to pass blob name automatically.

---

## Function Behavior

### Input
The function is triggered by:
- **Blob event** on `model-output` container (blob name = `engagement_tiers_output_{timestamp}.csv`)
- **HTTP POST** with JSON body: `{ "blobName": "..." }`

### Processing
1. **Fetch CSV** from Azure Blob Storage using SharedKey authentication
2. **Parse CSV** with validation:
   - Required columns: `user_id`, `engagement_tier`, `engagement_score`, `total_notes`, `total_edits`, `avg_session_duration_seconds`, `collaboration_count`
   - Validates data types (numeric fields, tier enum)
   - Skips malformed rows with warning logs
3. **Upsert to Supabase:**
   - `user_engagement_tiers`: On conflict `user_id`, update all columns + `updated_at`
   - `user_engagement_metrics`: On conflict `user_id`, update summary metrics
4. **Return JSON result:**
   ```json
   {
     "success": true,
     "blobName": "engagement_tiers_output_20260416143052.csv",
     "rowsProcessed": 45,
     "rowsUpserted": 45,
     "details": "Synced 45 user tiers and 45 user metrics"
   }
   ```

### Error Handling
- **Missing columns:** Function fails with clear error message
- **Invalid data types:** Rows skipped, warning logged
- **Blob fetch failure:** Returns 400 with error details
- **Supabase upsert failure:** Returns 400 with upsert error
- **Non-matching blobs:** Silently skipped (pattern: `engagement_tiers_output_*.csv`)

---

## Testing

### Test 1: Manual HTTP Invocation

```bash
# Get your Supabase function URL from the dashboard
SYNC_URL="https://{project-id}.supabase.co/functions/v1/sync-clustering-output"

# Invoke manually with a test blob name
curl -X POST "${SYNC_URL}" \
  -H "Content-Type: application/json" \
  -d '{
    "blobName": "engagement_tiers_output_20260416143052.csv"
  }'

# Expected response (success):
{
  "success": true,
  "blobName": "engagement_tiers_output_20260416143052.csv",
  "rowsProcessed": 42,
  "rowsUpserted": 42,
  "details": "Synced 42 user tiers and 42 user metrics"
}
```

### Test 2: End-to-End (Full Pipeline)

1. **Trigger clustering** (upload JSON to `raw-events` → ADF → ML):
   ```bash
   # Wait for CSV to appear in model-output
   az storage blob list --account-name doodledeskaml5831774892 \
     --container-name model-output --query "[?contains(name, 'engagement_tiers_output')]"
   ```

2. **Invoke sync function** on the latest CSV:
   ```bash
   LATEST_CSV=$(az storage blob list --account-name doodledeskaml5831774892 \
     --container-name model-output \
     --query "reverse(sort_by(@, &properties.creationTime))[0].name" -o tsv)
   
   curl -X POST "${SYNC_URL}" \
     -H "Content-Type: application/json" \
     -d "{\"blobName\": \"${LATEST_CSV}\"}"
   ```

3. **Verify Supabase tables:**
   ```sql
   -- Check tiers table
   SELECT COUNT(*), MAX(updated_at) FROM user_engagement_tiers;
   
   -- Check metrics table
   SELECT COUNT(*), MAX(updated_at) FROM user_engagement_metrics;
   ```

4. **Verify dashboard** in DoodleDesk:
   - Open Analytics/Profile menu
   - Check engagement tier badge (should show freshly synced data)
   - Check engagement chart (should show updated metrics)

### Test 3: Error Cases

**Malformed CSV (missing column):**
```bash
curl -X POST "${SYNC_URL}" \
  -H "Content-Type: application/json" \
  -d '{"blobName": "malformed_output.csv"}'

# Expected: 400 with error "Missing required column: ..."
```

**Empty CSV:**
```bash
# Function logs warning and returns success: false
# "No valid data rows found in CSV"
```

**Invalid tier value:**
```bash
# CSV row with engagement_tier="unknown"
# Function skips row with warning: "Invalid engagement_tier, skipping"
```

---

## Monitoring & Logs

### Supabase Function Logs

In Supabase Dashboard → Functions → sync-clustering-output → Logs:
```
[14:30:02] Processing blob: engagement_tiers_output_20260416143052.csv
[14:30:03] Fetched 2048 bytes from engagement_tiers_output_20260416143052.csv
[14:30:03] Parsed 42 rows from CSV
[14:30:04] Upserted: 42 tiers, 42 metrics
[14:30:04] Sync completed successfully
```

### Azure Function Logs (if using bridge function)

```
INFO Sync result: {"success":true,"rowsProcessed":42,"rowsUpserted":42}
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  DoodleDesk Engagement ML Pipeline (Phase 12)                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Phase 12.1: ADF Event Trigger                              │
│  raw-events/*.json → (Copy Data) → curated-features        │
│                                                               │
│  Phase 12.2: Azure ML Pipeline                              │
│  curated-features/*.parquet → (Clustering) → model-output   │
│                                                               │
│  Phase 12.3: CSV Sync (THIS PHASE)                          │
│  model-output/*.csv                                         │
│         ↓                                                    │
│  Blob Event / Timer / ADF Web Activity                      │
│         ↓                                                    │
│  Supabase Edge Function: sync-clustering-output             │
│         ↓                                                    │
│  Parse CSV → Validate → Upsert to Tables                    │
│         ↓                                                    │
│  user_engagement_tiers (tier, score, metrics)               │
│  user_engagement_metrics (summary + daily breakdown)        │
│         ↓                                                    │
│  Dashboard Auto-Refresh                                     │
│  EngagementTierBadge + EngagementChart                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps

**Phase 12.3 Completion:**
- ✅ Deploy sync function
- ✅ Configure Blob trigger (Azure Function or ADF Web Activity)
- ✅ Test E2E (export → ADF → ML → CSV → Supabase → Dashboard)
- ✅ Verify dashboard refreshes with latest engagement data

**Phase 12.4 (Data Freshness & Health Checks):**
- Add stale data alerts (trigger if no update in 24h)
- Add pipeline run health monitoring
- Log failures to dashboard admin panel
- Estimate: 30 min

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Blob not syncing | Check blob naming pattern matches `engagement_tiers_output_*.csv` |
| Auth error in Azure fetch | Verify AZURE_STORAGE_ACCOUNT_KEY is correct + hasn't expired |
| Supabase upsert fails | Check column names and data types match table schema |
| Function timeout | CSV > 10MB? Increase Supabase function timeout to 60s |
| CSV missing from model-output | Verify clustering pipeline ran successfully (check ADF) |
| Dashboard not updating | Check `updated_at` timestamp in Supabase tables (should be recent) |

---

## References

- **Clustering Output Schema:** [azure-ml/clustering_script.py](../../azure-ml/clustering_script.py)
- **Dashboard Widgets:** [src/features/desk/components/EngagementChart.jsx](../../src/features/desk/components/EngagementChart.jsx)
- **Supabase Tables:** Engagement tiers, metrics (see repo sync notes)
