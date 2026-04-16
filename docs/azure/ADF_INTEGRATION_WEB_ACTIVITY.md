# Phase 12.3: ADF Integration - Web Activity Configuration
# 
# This file shows the exact JSON to add to your ADF pipeline
# to invoke the sync function after clustering completes.

## OPTION A: Web Activity in ADF Pipeline JSON

Add this activity after your "Azure ML Pipeline Run" activity in your ADF pipeline:

```json
{
  "name": "Sync Clustering Output",
  "type": "WebActivity",
  "dependsOn": [
    {
      "activity": "Azure ML Pipeline Run",
      "dependencyConditions": ["Succeeded"]
    }
  ],
  "policy": {
    "timeout": "0.12:00:00",
    "retry": 2,
    "retryIntervalInSeconds": 30,
    "secureOutput": false,
    "secureInput": false
  },
  "userProperties": [],
  "typeProperties": {
    "url": "https://{YOUR_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/sync-clustering-output",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    },
    "body": {
      "blobName": "@activity('Azure ML Pipeline Run').output.output.clusteringOutputBlobName"
    },
    "authentication": {
      "type": "Basic",
      "username": "anon",
      "password": {
        "type": "AzureKeyVaultSecret",
        "store": {
          "referenceName": "{YOUR_KEY_VAULT_LINKED_SERVICE}",
          "type": "LinkedServiceReference"
        },
        "secretName": "supabase-anon-key"
      }
    },
    "connectVia": {
      "referenceName": "AutoResolveIntegrationRuntime",
      "type": "IntegrationRuntimeReference"
    }
  }
}
```

## MANUAL STEPS IN ADF DESIGNER (Recommended - No JSON needed)

1. Open your ADF pipeline in Edit mode
2. Click "+ Add activity" button
3. Search for "Web" activity
4. Drag "Web" activity to canvas after "Azure ML Pipeline Run"
5. Configure:
   - **Name:** "Sync Clustering Output"
   - **General tab:**
     - Timeout: 12:00:00
     - Retry: 2
     - Retry interval: 30 seconds
   
   - **Settings tab:**
     - URL: `https://{YOUR_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/sync-clustering-output`
     - Method: POST
     - Headers: Add "Content-Type": "application/json"
     - Body: `{"blobName": "@activity('Azure ML Pipeline Run').output.output.clusteringOutputBlobName"}`
     - Authentication: None (function is public)

6. **Set Dependency:**
   - Right-click the Web activity
   - "Add dependency"
   - Depend on: "Azure ML Pipeline Run"
   - Type: "Succeeded"

7. **Publish** the pipeline

---

## OPTION B: Simpler Alternative - Direct Blob Naming

If your ML pipeline outputs to a predictable blob name pattern, you can hardcode it:

```json
"body": {
  "blobName": "@concat('engagement_tiers_output_', formatDateTime(utcNow(), 'yyyyMMddHHmmss'), '.csv')"
}
```

But **Option A is better** because the ML step explicitly outputs the blob name.

---

## TESTING THE WEB ACTIVITY

1. **Publish** the pipeline
2. **Trigger** a test run:
   - Upload a test JSON to `raw-events`
   - Monitor the pipeline run in ADF
   - Watch the Web Activity execute after ML step succeeds
   - Check ADF activity output for sync function response

3. **Verify** in Supabase:
   ```sql
   SELECT COUNT(*), MAX(updated_at) FROM user_engagement_tiers;
   ```

---

## TROUBLESHOOTING

| Issue | Fix |
|-------|-----|
| Web Activity returns 401 | Function URL wrong or Supabase down |
| Web Activity returns 400 | blobName parameter not passed correctly |
| Web Activity returns 500 | Function error - check Supabase logs |
| Blob not found in Azure | Check clustering step actually wrote CSV |
