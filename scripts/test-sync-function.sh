#!/bin/bash
# Test the sync-clustering-output function
# Usage: ./test-sync-function.sh {supabase-project-id} {blob-name}

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <project-id> <blob-name>"
  echo ""
  echo "Example:"
  echo "  $0 my-project-id engagement_tiers_output_20260416143052.csv"
  echo ""
  echo "Get project-id from Supabase Dashboard → Settings → General"
  echo "Get blob-name from Azure Portal → Storage Accounts → model-output container"
  exit 1
fi

PROJECT_ID="$1"
BLOB_NAME="$2"
FUNCTION_URL="https://${PROJECT_ID}.supabase.co/functions/v1/sync-clustering-output"

echo "═══════════════════════════════════════════════════════════════"
echo "Testing sync function"
echo "═══════════════════════════════════════════════════════════════"
echo "Function URL: $FUNCTION_URL"
echo "Blob Name: $BLOB_NAME"
echo ""

# Make POST request
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d "{\"blobName\": \"$BLOB_NAME\"}")

echo "Response:"
echo "$RESPONSE" | jq '.' || echo "$RESPONSE"

# Parse response
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo ""
  echo "✅ Test successful!"
  echo ""
  echo "Next: Verify Supabase tables were updated:"
  echo "  SELECT COUNT(*), MAX(updated_at) FROM user_engagement_tiers;"
  echo "  SELECT COUNT(*), MAX(updated_at) FROM user_engagement_metrics;"
else
  echo ""
  echo "❌ Test failed. Check error message above."
  echo ""
  echo "Troubleshooting:"
  echo "1. Verify blob exists in Azure Storage: doodledeskaml5831774892/model-output/${BLOB_NAME}"
  echo "2. Check function logs in Supabase Dashboard"
  echo "3. Verify secrets are set: AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY"
fi
