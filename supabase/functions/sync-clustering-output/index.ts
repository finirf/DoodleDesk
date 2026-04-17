import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const AZURE_STORAGE_ACCOUNT_NAME = Deno.env.get("AZURE_STORAGE_ACCOUNT_NAME");
const AZURE_STORAGE_ACCOUNT_KEY = Deno.env.get("AZURE_STORAGE_ACCOUNT_KEY");

interface ClusteringRow {
  user_id: string;
  engagement_tier: "low" | "medium" | "high";
  engagement_score: number;
  total_notes: number;
  total_edits: number;
  avg_session_duration_seconds: number;
  collaboration_count: number;
}

interface SyncResult {
  success: boolean;
  blobName?: string;
  rowsProcessed?: number;
  rowsUpserted?: number;
  error?: string;
  details?: string;
}

/**
 * Parse CSV string into structured rows
 */
function parseCSV(csvContent: string): ClusteringRow[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV has no data rows (header only or empty)");
  }

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const requiredColumns = [
    "user_id",
    "engagement_tier",
    "engagement_score",
    "total_notes",
    "total_edits",
    "avg_session_duration_seconds",
    "collaboration_count",
  ];

  // Validate header
  for (const col of requiredColumns) {
    if (!header.includes(col)) {
      throw new Error(`Missing required column: ${col}`);
    }
  }

  const rows: ClusteringRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, unknown> = {};

    for (let j = 0; j < header.length; j++) {
      row[header[j]] = values[j];
    }

    // Validate and coerce types
    const parsed: ClusteringRow = {
      user_id: String(row.user_id),
      engagement_tier: String(row.engagement_tier).toLowerCase() as
        | "low"
        | "medium"
        | "high",
      engagement_score: parseFloat(String(row.engagement_score)),
      total_notes: parseInt(String(row.total_notes), 10),
      total_edits: parseInt(String(row.total_edits), 10),
      avg_session_duration_seconds: parseFloat(
        String(row.avg_session_duration_seconds)
      ),
      collaboration_count: parseInt(String(row.collaboration_count), 10),
    };

    // Validate tier value
    if (!["low", "medium", "high"].includes(parsed.engagement_tier)) {
      console.warn(
        `Row ${i}: Invalid engagement_tier "${parsed.engagement_tier}", skipping`
      );
      continue;
    }

    // Validate numeric fields
    if (
      isNaN(parsed.engagement_score) ||
      isNaN(parsed.total_notes) ||
      isNaN(parsed.total_edits) ||
      isNaN(parsed.avg_session_duration_seconds) ||
      isNaN(parsed.collaboration_count)
    ) {
      console.warn(`Row ${i}: Invalid numeric values, skipping`);
      continue;
    }

    rows.push(parsed);
  }

  return rows;
}

/**
 * Fetch CSV blob content from Azure Storage
 */
async function fetchCSVFromBlob(blobName: string): Promise<string> {
  const containerName = "model-output";
  const storageVersion = "2021-06-08";

  // Store once — must be identical in header and string-to-sign
  const msDate = new Date().toUTCString();

  const canonicalResource = `/${AZURE_STORAGE_ACCOUNT_NAME}/${containerName}/${blobName}`;

  // Canonicalized headers: lowercase, sorted, no trailing space
  const canonicalHeaders = [
    `x-ms-date:${msDate}`,
    `x-ms-version:${storageVersion}`,
  ].join("\n");

  // String-to-sign for GET — Content-Type slot must be empty (no body)
  const stringToSign = [
    "GET",   // HTTP Verb
    "",      // Content-Encoding
    "",      // Content-Language
    "",      // Content-Length (empty string, not "0", for unknown)
    "",      // Content-MD5
    "",      // Content-Type — empty for GET
    "",      // Date (empty because we use x-ms-date)
    "",      // If-Modified-Since
    "",      // If-Match
    "",      // If-None-Match
    "",      // If-Unmodified-Since
    "",      // Range
    canonicalHeaders,
    canonicalResource,
  ].join("\n");

  const encoder = new TextEncoder();
  const keyBytes = Uint8Array.from(
    atob(AZURE_STORAGE_ACCOUNT_KEY!),
    (c) => c.charCodeAt(0)
  );

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(stringToSign)
  );

  const signatureB64 = btoa(
    String.fromCharCode(...new Uint8Array(signature))
  );

  const url = `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${containerName}/${blobName}`;

  // Add diagnostic logging before the request
  console.log("=== Azure Auth Debug ===");
  console.log("Account:", AZURE_STORAGE_ACCOUNT_NAME);
  console.log("Key defined:", !!AZURE_STORAGE_ACCOUNT_KEY);
  console.log("Key length:", AZURE_STORAGE_ACCOUNT_KEY?.length);
  console.log("msDate:", msDate);
  console.log("String to sign (repr):", JSON.stringify(stringToSign));
  console.log("URL:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-ms-date": msDate,          // Same value used in signature
      "x-ms-version": storageVersion,
      "Authorization": `SharedKey ${AZURE_STORAGE_ACCOUNT_NAME}:${signatureB64}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    // Azure returns XML error details on 403 — log it
    console.error(`Azure error ${response.status}:`, body);
    throw new Error(`Failed to fetch CSV blob: ${response.status} ${response.statusText}\n${body}`);
  }

  return await response.text();
}

/**
 * Upsert engagement tiers and metrics into Supabase
 */
async function upsertToSupabase(
  rows: ClusteringRow[]
): Promise<{ tiersUpserted: number; metricsUpserted: number }> {
  const supabase = createClient(
    SUPABASE_URL!,
    SUPABASE_SERVICE_ROLE_KEY!
  );

  let tiersUpserted = 0;
  let metricsUpserted = 0;

  // Upsert into user_engagement_tiers
  const tiersData = rows.map((row) => ({
    user_id: row.user_id,
    engagement_tier: row.engagement_tier,
    engagement_score: row.engagement_score,
    total_notes: row.total_notes,
    total_edits: row.total_edits,
    avg_session_duration_seconds: row.avg_session_duration_seconds,
    collaboration_count: row.collaboration_count,
    updated_at: new Date().toISOString(),
  }));

  if (tiersData.length > 0) {
    const { error: tiersError, data: tiersResult } = await supabase
      .from("user_engagement_tiers")
      .upsert(tiersData, { onConflict: "user_id" });

    if (tiersError) {
      throw new Error(`Tiers upsert failed: ${tiersError.message}`);
    }

    tiersUpserted = tiersResult?.length || tiersData.length;
  }

  // Upsert into user_engagement_metrics
  const metricsData = rows.map((row) => ({
    user_id: row.user_id,
    total_notes: row.total_notes,
    total_edits: row.total_edits,
    collaboration_count: row.collaboration_count,
    updated_at: new Date().toISOString(),
    // Note: daily_breakdown would be populated by a separate process
    // For now, we sync the summary metrics and let app compute daily_breakdown
  }));

  if (metricsData.length > 0) {
    const { error: metricsError, data: metricsResult } = await supabase
      .from("user_engagement_metrics")
      .upsert(metricsData, { onConflict: "user_id" });

    if (metricsError) {
      throw new Error(`Metrics upsert failed: ${metricsError.message}`);
    }

    metricsUpserted = metricsResult?.length || metricsData.length;
  }

  return { tiersUpserted, metricsUpserted };
}

/**
 * Main handler for blob trigger events
 * Expected blob naming pattern: engagement_tiers_output_{timestamp}.csv
 */
async function handleBlobTrigger(
  context: Record<string, unknown>
): Promise<SyncResult> {
  try {
    // Extract blob name from trigger context
    // In Azure Functions, trigger input comes as the blob name in the context
    const blobName = context.triggerMetadata?.uri?.split("/").pop() ||
      context.name || (typeof context === "string" ? context : null);

    if (!blobName) {
      return {
        success: false,
        error: "Could not extract blob name from trigger context",
      };
    }

    console.log(`Processing blob: ${blobName}`);

    // Validate blob is from model-output and is a CSV
    if (!blobName.includes("engagement_tiers_output") || !blobName.endsWith(".csv")) {
      return {
        success: false,
        blobName,
        error: `Skipping: blob does not match pattern engagement_tiers_output_*.csv`,
      };
    }

    // Fetch CSV from Azure Blob Storage
    const csvContent = await fetchCSVFromBlob(blobName);
    console.log(`Fetched ${csvContent.length} bytes from ${blobName}`);

    // Parse CSV
    const rows = parseCSV(csvContent);
    console.log(`Parsed ${rows.length} rows from CSV`);

    if (rows.length === 0) {
      return {
        success: false,
        blobName,
        error: "No valid data rows found in CSV",
      };
    }

    // Upsert to Supabase
    const { tiersUpserted, metricsUpserted } =
      await upsertToSupabase(rows);

    console.log(
      `Upserted: ${tiersUpserted} tiers, ${metricsUpserted} metrics`
    );

    return {
      success: true,
      blobName,
      rowsProcessed: rows.length,
      rowsUpserted: tiersUpserted,
      details: `Synced ${tiersUpserted} user tiers and ${metricsUpserted} user metrics`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Sync failed:", errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * HTTP endpoint for testing / manual invocation
 * Example: POST with JSON { "blobName": "engagement_tiers_output_20260416143052.csv" }
 */
serve(async (req: Request) => {
  if (req.method === "POST") {
    // Debug endpoint: print access token if requested
    const url = new URL(req.url);
    if (url.pathname.endsWith("/debug-token")) {
      try {
        // Try to extract Authorization header
        const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
        return new Response(
          JSON.stringify({ access_token: authHeader }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }
    try {
      const { blobName } = await req.json();

      if (!blobName) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Missing blobName in request body",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await handleBlobTrigger({ name: blobName });

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return new Response("Blob sync function. Trigger on model-output blob events.", {
    status: 200,
  });
});

// For local testing: support direct function invocation
export async function syncClusteringOutput(
  context: Record<string, unknown>
): Promise<void> {
  const result = await handleBlobTrigger(context);
  console.log(JSON.stringify(result, null, 2));
}
