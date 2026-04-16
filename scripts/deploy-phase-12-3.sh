#!/bin/bash
# Phase 12.3 Deployment Helper
# Prerequisites: supabase CLI installed, authenticated with `supabase login`

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "PHASE 12.3: CSV SYNC FUNCTION DEPLOYMENT"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Step 1: Get project ID
read -p "Enter your Supabase Project ID: " PROJECT_ID
if [ -z "$PROJECT_ID" ]; then
  echo "❌ Project ID required"
  exit 1
fi

# Step 2: Get Azure credentials
echo ""
echo "Next, you'll need your Azure Storage credentials."
echo "Find them in: Azure Portal → Storage Accounts → doodledeskaml5831774892 → Access Keys"
echo ""
read -p "Enter AZURE_STORAGE_ACCOUNT_NAME (should be doodledeskaml5831774892): " STORAGE_ACCOUNT
read -sp "Enter AZURE_STORAGE_ACCOUNT_KEY (paste key1): " STORAGE_KEY
echo ""

# Step 3: Deploy function
echo ""
echo "📦 Deploying sync-clustering-output function..."
supabase functions deploy sync-clustering-output --project-id "$PROJECT_ID"

if [ $? -ne 0 ]; then
  echo "❌ Deployment failed. Check your Supabase CLI setup."
  exit 1
fi

# Step 4: Set secrets
echo ""
echo "🔐 Setting environment secrets..."
supabase secrets set \
  --project-id "$PROJECT_ID" \
  AZURE_STORAGE_ACCOUNT_NAME="$STORAGE_ACCOUNT" \
  AZURE_STORAGE_ACCOUNT_KEY="$STORAGE_KEY"

if [ $? -ne 0 ]; then
  echo "❌ Failed to set secrets"
  exit 1
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Get your function URL (see next section)"
echo "2. Configure integration (ADF Web Activity, blob trigger, or timer)"
echo "3. Run manual test: see test-sync-function.sh"
echo "4. Monitor logs in Supabase Dashboard → Functions → sync-clustering-output"
echo ""
echo "Function URL format:"
echo "https://{$PROJECT_ID}.supabase.co/functions/v1/sync-clustering-output"
