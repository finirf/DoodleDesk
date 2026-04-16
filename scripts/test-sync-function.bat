@echo off
REM Test the sync-clustering-output function
REM Usage: test-sync-function.bat {supabase-project-id} {blob-name}

setlocal enabledelayedexpansion

if "!%1!"=="" (
  echo Usage: !0! ^<project-id^> ^<blob-name^>
  echo.
  echo Example:
  echo   !0! my-project-id engagement_tiers_output_20260416143052.csv
  echo.
  echo Get project-id from Supabase Dashboard ^> Settings ^> General
  echo Get blob-name from Azure Portal ^> Storage Accounts ^> model-output container
  pause
  exit /b 1
)

set PROJECT_ID=%1
set BLOB_NAME=%2
set FUNCTION_URL=https://!PROJECT_ID!.supabase.co/functions/v1/sync-clustering-output

echo ===============================================================
echo Testing sync function
echo ===============================================================
echo Function URL: !FUNCTION_URL!
echo Blob Name: !BLOB_NAME!
echo.

REM Make POST request using curl (comes with Git Bash / modern Windows)
echo Sending request...
curl -s -X POST "!FUNCTION_URL!" ^
  -H "Content-Type: application/json" ^
  -d {"blobName": "!BLOB_NAME!"}

echo.
echo.
echo If you see "success": true above, the test passed!
echo.
echo Next: Verify Supabase tables were updated by running in Supabase SQL Editor:
echo   SELECT COUNT(*), MAX(updated_at) FROM user_engagement_tiers;
echo   SELECT COUNT(*), MAX(updated_at) FROM user_engagement_metrics;
echo.
pause
