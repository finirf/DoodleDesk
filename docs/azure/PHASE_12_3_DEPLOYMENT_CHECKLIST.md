# Phase 12.3 Deployment Checklist

## ✅ COMPLETED BY AGENT

- [x] **Function Code** - `supabase/functions/sync-clustering-output/index.ts`
  - CSV parsing with strict validation
  - Azure Blob fetch with SharedKey auth
  - Supabase upsert to both tables
  - Error handling and logging
  
- [x] **Setup Documentation** - `docs/azure/PHASE_12_3_CSV_SYNC_SETUP.md`
  - Detailed deployment steps
  - Testing procedures
  - Troubleshooting guide
  
- [x] **ADF Integration Guide** - `docs/azure/ADF_INTEGRATION_WEB_ACTIVITY.md`
  - Exact JSON configuration
  - Manual UI steps
  - Testing procedure
  
- [x] **Helper Scripts**
  - `scripts/deploy-phase-12-3.sh` - Automated deployment
  - `scripts/test-sync-function.sh` - Manual testing

---

## 📋 YOUR TASKS (Step-by-Step)

### **STEP 1: Get Your Supabase Project ID** (2 minutes)
**Where:** Supabase Dashboard → Settings → General  
**What to find:** A 20-character code like `abcdefghijklmnopqrst`  
**Why:** Needed to deploy function and create function URL

**Do now:**
- [ ] Navigate to Supabase Dashboard
- [ ] Note your Project ID (you'll use it for Steps 2-3)

---

### **STEP 2: Deploy the Function** (5 minutes)

**Prerequisites:**
- [ ] Supabase CLI installed (`brew install supabase` or `choco install supabase-cli`)
- [ ] Authenticated with `supabase login`
- [ ] Project ID from Step 1

**Option A: Automated (Easier)**
```bash
# Navigate to workspace root
cd /path/to/DoodleDesk

# Run helper script (it will prompt you for inputs)
bash scripts/deploy-phase-12-3.sh
```
Script will ask for:
- Supabase Project ID
- Azure Storage Account Name (should be: `doodledeskaml5831774892`)
- Azure Storage Account Key (from Azure Portal)

**Option B: Manual Commands**
```bash
# Deploy function
supabase functions deploy sync-clustering-output --project-id YOUR_PROJECT_ID

# You should see:
# ✓ Deployed function "sync-clustering-output"
```

**Verify:**
```bash
supabase functions list --project-id YOUR_PROJECT_ID
```
Should show `sync-clustering-output` in the list.

**Do now:**
- [ ] Run deployment (choose A or B)
- [ ] Verify function appears in list

---

### **STEP 3: Set Environment Secrets** (3 minutes)

**Get Azure Credentials:**
1. Go to Azure Portal → Storage Accounts → `doodledeskaml5831774892`
2. Click "Access keys" in left menu
3. Copy:
   - Storage account name: `doodledeskaml5831774892`
   - Key: The value under "key1"

**Set Secrets:**
```bash
supabase secrets set \
  --project-id YOUR_PROJECT_ID \
  AZURE_STORAGE_ACCOUNT_NAME=doodledeskaml5831774892 \
  AZURE_STORAGE_ACCOUNT_KEY="<paste_your_key_here>"
```

**Verify in Supabase Dashboard:**
- Functions → sync-clustering-output → Settings → Secrets
- Should see both AZURE_* keys listed

**Do now:**
- [ ] Get Azure credentials from portal
- [ ] Set both secrets using command above
- [ ] Verify in Supabase Dashboard

---

### **STEP 4: Choose Integration Pattern** (5 minutes decision)

You have 3 ways to trigger the sync function:

#### **Option A: ADF Web Activity (Recommended) ⭐**
- Runs after Azure ML clustering completes
- Most reliable, explicit orchestration
- Follow: `docs/azure/ADF_INTEGRATION_WEB_ACTIVITY.md`
- Time: 10 minutes to wire in ADF

#### **Option B: Azure Function Blob Trigger**
- Auto-triggers when CSV lands in `model-output`
- Requires separate Azure Function app (not Supabase)
- More infrastructure to maintain
- Time: 20-30 minutes to set up

#### **Option C: Timer-Based Polling**
- Polls `model-output` every 5 minutes for new CSVs
- Simplest, but 5-minute delay
- Requires separate Azure Function app
- Time: 20-30 minutes to set up

**Recommendation: Choose Option A** (ADF Web Activity) - you already have ADF configured, and it's the cleanest approach.

**Do now:**
- [ ] Decide: A, B, or C (default: A)
- [ ] If A: Continue to Step 5
- [ ] If B or C: See detailed setup in `docs/azure/PHASE_12_3_CSV_SYNC_SETUP.md`

---

### **STEP 5: Wire into ADF (Option A Only)** (10 minutes)

**Get Your Function URL:**
```
https://{YOUR_PROJECT_ID}.supabase.co/functions/v1/sync-clustering-output
```
Replace `{YOUR_PROJECT_ID}` with your actual Project ID from Step 1.

**Add Web Activity to ADF Pipeline:**

1. Open Azure Data Factory → Your Pipeline (in Edit mode)
2. Click "+ Add activity" → Search "Web" → Drag to canvas
3. Place it **after** "Azure ML Pipeline Run" activity
4. **Configure in Settings tab:**
   - **Name:** `Sync Clustering Output`
   - **URL:** (paste your function URL from above)
   - **Method:** POST
   - **Headers:** Add → Name: `Content-Type`, Value: `application/json`
   - **Body:** 
     ```json
     {"blobName": "engagement_tiers_output_20260416143052.csv"}
     ```
     (You can use a dynamic value if ML step outputs the blob name)

5. **Set Dependency:**
   - Right-click the Web activity → "Add dependency"
   - Depend on: "Azure ML Pipeline Run"
   - Type: "Succeeded"

6. **Publish** the pipeline (top button)

**Do now:**
- [ ] Copy your function URL
- [ ] Open ADF pipeline in edit mode
- [ ] Add Web activity after ML step
- [ ] Configure settings (name, URL, method, headers, body)
- [ ] Set dependency on ML step success
- [ ] Publish

---

### **STEP 6: Manual Test** (5 minutes)

**Find a Test Blob:**
1. Go to Azure Portal → Storage Accounts → `doodledeskaml5831774892`
2. Click "Containers" → "model-output"
3. Find a CSV blob named like `engagement_tiers_output_*.csv`
4. Copy the **exact filename**

**Run Test:**
```bash
# Option A: Using helper script
bash scripts/test-sync-function.sh YOUR_PROJECT_ID engagement_tiers_output_20260416143052.csv

# Option B: Using curl directly
curl -X POST "https://YOUR_PROJECT_ID.supabase.co/functions/v1/sync-clustering-output" \
  -H "Content-Type: application/json" \
  -d '{"blobName": "engagement_tiers_output_20260416143052.csv"}'
```

**Expected Response (Success):**
```json
{
  "success": true,
  "blobName": "engagement_tiers_output_20260416143052.csv",
  "rowsProcessed": 42,
  "rowsUpserted": 42,
  "details": "Synced 42 user tiers and 42 user metrics"
}
```

**Expected Response (Error - Blob Not Found):**
```json
{
  "success": false,
  "error": "Failed to fetch CSV blob: 404 Not Found"
}
```
→ Check blob exists in Azure Storage, or verify Azure secrets are correct

**Do now:**
- [ ] Get a test CSV blob name from Azure
- [ ] Run test (script or curl)
- [ ] Verify success response
- [ ] If error: Check troubleshooting section below

---

### **STEP 7: Verify Database Updates** (2 minutes)

After successful sync, tables should have new/updated rows.

**Check in Supabase Dashboard:**

1. Open Supabase Dashboard → SQL Editor
2. Run:
   ```sql
   SELECT COUNT(*), MAX(updated_at) FROM user_engagement_tiers;
   SELECT COUNT(*), MAX(updated_at) FROM user_engagement_metrics;
   ```
3. Should see:
   - Row counts > 0
   - `updated_at` = recent timestamp (should match your test time)

**Do now:**
- [ ] Open Supabase SQL Editor
- [ ] Run both queries
- [ ] Verify counts and timestamps are recent

---

### **STEP 8: End-to-End Test** (15 minutes)

Now test the full pipeline:

1. **Trigger Clustering:**
   - Upload a test JSON file to `raw-events` blob container
   - Wait 2-3 minutes for ADF to trigger and process

2. **Check CSV Output:**
   - Go to Azure Portal → `doodledeskaml5831774892` → `model-output`
   - Should see new CSV file like `engagement_tiers_output_HHMMSS.csv`

3. **Monitor Sync:**
   - Go to Supabase Dashboard → Functions → sync-clustering-output → Logs
   - Should see logs from function execution (if using Web Activity)

4. **Verify Supabase:**
   - Run SQL queries from Step 7 again
   - Verify `updated_at` is now very recent

5. **Check Dashboard in DoodleDesk:**
   - Open DoodleDesk app → Profile menu → Analytics
   - Engagement tier badge should show fresh data
   - Engagement chart should update with latest metrics

**Do now:**
- [ ] Upload test JSON to `raw-events`
- [ ] Wait for ADF to complete
- [ ] Check for new CSV in `model-output`
- [ ] Verify Supabase tables updated
- [ ] Open DoodleDesk and check analytics refresh

---

## 🔍 Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| **Error: `Failed to fetch CSV blob: 404`** | Blob doesn't exist or name is wrong | Check exact blob name in Azure Portal, copy carefully |
| **Error: `Failed to fetch CSV blob: 403`** | Azure auth failed | Verify AZURE_STORAGE_ACCOUNT_KEY secret is set and correct |
| **Error: `Missing required column`** | CSV format mismatch | Check clustering script outputted correct columns |
| **Success but rows = 0** | CSV is empty or all rows invalid | Check clustering pipeline ran and output data |
| **Web Activity in ADF fails** | Function URL wrong or secrets missing | Double-check function URL, verify secrets in Supabase |
| **Dashboard doesn't refresh** | Tables updated but widget cache stale | Refresh browser page (Ctrl+Shift+R) |

---

## 📊 How to Monitor

**Supabase Function Logs:**
- Dashboard → Functions → sync-clustering-output → Logs
- Shows each invocation with timestamps and results

**ADF Pipeline Run:**
- Open ADF → your pipeline → Monitor tab
- Click run to see each activity status
- Click Web Activity to see response body

**Azure Blob Storage:**
- Portal → Storage Accounts → model-output container
- Filter by date modified to find recent CSVs

---

## 🎯 Success Criteria

✅ Phase 12.3 is complete when:
- [ ] Function deployed to Supabase
- [ ] Secrets set (AZURE_STORAGE_ACCOUNT_NAME, KEY)
- [ ] Integration wired (ADF, blob trigger, or timer)
- [ ] Manual test passes (CSV syncs to Supabase)
- [ ] E2E test passes (export → ADF → ML → CSV → Sync → Dashboard)
- [ ] DoodleDesk analytics shows fresh engagement data

**Estimated total time: 45 minutes - 1 hour**

---

## 📝 After Completion

Once Phase 12.3 is validated:

**Phase 12.4 (Final Phase) - Data Freshness & Alerts:**
- Add stale data warning (no update in 24h)
- Add pipeline failure detection
- Optional: Slack notifications
- Estimated: 30 minutes

Then the **full end-to-end pipeline is complete and operational!**
