@echo off
REM Phase 12.3 Deployment Helper for Windows
REM Prerequisites: supabase CLI installed, authenticated with `supabase login`

setlocal enabledelayedexpansion

echo ===============================================================
echo PHASE 12.3: CSV SYNC FUNCTION DEPLOYMENT
echo ===============================================================
echo.

REM Step 1: Get project ID
set /p PROJECT_ID="Enter your Supabase Project ID: "
if "!PROJECT_ID!"=="" (
  echo ❌ Project ID required
  exit /b 1
)

REM Step 2: Get Azure credentials
echo.
echo Next, you'll need your Azure Storage credentials.
echo Find them in: Azure Portal ^> Storage Accounts ^> doodledeskaml5831774892 ^> Access Keys
echo.
set /p STORAGE_ACCOUNT="Enter AZURE_STORAGE_ACCOUNT_NAME (should be doodledeskaml5831774892): "
set /p "STORAGE_KEY=Enter AZURE_STORAGE_ACCOUNT_KEY (paste key1): "

REM Step 3: Deploy function
echo.
echo 📦 Deploying sync-clustering-output function...
call supabase functions deploy sync-clustering-output --project-ref !PROJECT_ID!

if errorlevel 1 (
  echo ❌ Deployment failed. Check your Supabase CLI setup.
  exit /b 1
)

REM Step 4: Set secrets
echo.
echo 🔐 Setting environment secrets...
call supabase secrets set ^
  --project-ref !PROJECT_ID! ^
  AZURE_STORAGE_ACCOUNT_NAME=!STORAGE_ACCOUNT! ^
  AZURE_STORAGE_ACCOUNT_KEY=!STORAGE_KEY!

if errorlevel 1 (
  echo ❌ Failed to set secrets
  exit /b 1
)

echo.
echo ✅ Deployment complete!
echo.
echo 📝 Next steps:
echo 1. Get your function URL (see next section)
echo 2. Configure integration (ADF Web Activity, blob trigger, or timer)
echo 3. Run manual test: see test-sync-function.bat
echo 4. Monitor logs in Supabase Dashboard ^> Functions ^> sync-clustering-output
echo.
echo Function URL format:
echo https://!PROJECT_ID!.supabase.co/functions/v1/sync-clustering-output
echo.
pause
