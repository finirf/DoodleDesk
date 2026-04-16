import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

// Azure Storage credentials from environment
const AZURE_STORAGE_ACCOUNT = Deno.env.get('AZURE_STORAGE_ACCOUNT_NAME') || ''
const AZURE_STORAGE_KEY = Deno.env.get('AZURE_STORAGE_ACCOUNT_KEY') || ''
const AZURE_CONTAINER = 'raw-events'

interface ActivityEvent {
  event_id: string
  user_id: string
  desk_id: string
  event_type: string
  event_ts_utc: string
  session_id: string | null
  note_id: string | null
  edit_count: number
  collaboration_count: number
  session_seconds: number
  device_type: string
  platform: string
  metadata_json?: Record<string, unknown>
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
}

async function uploadToAzure(
  filename: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/${AZURE_CONTAINER}/${filename}`
    const payloadLength = new TextEncoder().encode(content).length
    const msDate = new Date().toUTCString()
    const msVersion = '2021-06-08'

    // SharedKey requires canonicalized x-ms-* headers sorted lexicographically.
    const canonicalizedHeaders = [
      'x-ms-blob-type:BlockBlob',
      `x-ms-date:${msDate}`,
      `x-ms-version:${msVersion}`,
    ].join('\n') + '\n'

    const canonicalizedResource = `/${AZURE_STORAGE_ACCOUNT}/${AZURE_CONTAINER}/${filename}`
    const stringToSign = [
      'PUT',
      '',
      '',
      payloadLength.toString(),
      '',
      'application/json',
      '',
      '',
      '',
      '',
      '',
      '',
      `${canonicalizedHeaders}${canonicalizedResource}`,
    ].join('\n')

    const keyBytes = Uint8Array.from(atob(AZURE_STORAGE_KEY), (char) => char.charCodeAt(0))
    const hmacKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const signatureBytes = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(stringToSign))
    const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))
    const authorization = `SharedKey ${AZURE_STORAGE_ACCOUNT}:${signature}`

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'x-ms-version': msVersion,
        'x-ms-blob-type': 'BlockBlob',
        'x-ms-date': msDate,
        'Content-Type': 'application/json',
        'Content-Length': payloadLength.toString(),
        Authorization: authorization,
      },
      body: content,
    })

    if (!response.ok) {
      const azureErrorText = await response.text()
      return {
        success: false,
        error: `Azure upload failed (${response.status}): ${azureErrorText || response.statusText}`,
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: `Upload error: ${error instanceof Error ? error.message : String(error)}` }
  }
}

async function exportActivitiesToAzure(userId: string): Promise<{ success: boolean; eventCount: number; filename?: string; error?: string }> {
  try {
    // Query activity events for user
    const { data: events, error: queryError } = await supabase
      .from('activity_events')
      .select('*')
      .eq('user_id', userId)
      .order('event_ts_utc', { ascending: true })

    if (queryError) {
      return { success: false, eventCount: 0, error: `Query error: ${queryError.message}` }
    }

    if (!events || events.length === 0) {
      return { success: true, eventCount: 0, filename: 'no-events' }
    }

    // Transform to activity_event_schema_v1 format
    const formattedEvents: ActivityEvent[] = events.map((event: any) => ({
      event_id: event.event_id || `evt_${Date.now()}_${Math.random()}`,
      user_id: event.user_id,
      desk_id: event.desk_id || 'unknown',
      event_type: event.event_type || 'unknown',
      event_ts_utc: event.event_ts_utc || new Date().toISOString(),
      session_id: event.session_id || null,
      note_id: event.note_id || null,
      edit_count: Number(event.edit_count) || 0,
      collaboration_count: Number(event.collaboration_count) || 0,
      session_seconds: Number(event.session_seconds) || 0,
      device_type: event.device_type || 'unknown',
      platform: event.platform || 'unknown',
      metadata_json: event.metadata_json || {},
    }))

    // Upload to Azure with timestamp-based filename
    const timestamp = Date.now()
    const filename = `activity_export_${userId}_${timestamp}.json`
    const content = JSON.stringify(formattedEvents, null, 2)

    const uploadResult = await uploadToAzure(filename, content)

    if (!uploadResult.success) {
      return { success: false, eventCount: 0, error: uploadResult.error }
    }

    return {
      success: true,
      eventCount: formattedEvents.length,
      filename,
    }
  } catch (error) {
    return {
      success: false,
      eventCount: 0,
      error: `Export error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    let body: { userId?: string } = {}
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ success: false, eventCount: 0, error: 'Invalid JSON request body' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = body?.userId

    if (!userId) {
      return new Response(JSON.stringify({ success: false, eventCount: 0, error: 'userId is required' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Log environment check
    console.log(`[export-activities] Starting export for user: ${userId}`)
    console.log(`[export-activities] Azure account configured: ${!!AZURE_STORAGE_ACCOUNT}`)
    console.log(`[export-activities] Azure key configured: ${!!AZURE_STORAGE_KEY}`)

    if (!AZURE_STORAGE_ACCOUNT || !AZURE_STORAGE_KEY) {
      const errorMsg = `Azure credentials missing: account=${!!AZURE_STORAGE_ACCOUNT}, key=${!!AZURE_STORAGE_KEY}`
      console.error(`[export-activities] ${errorMsg}`)
      return new Response(JSON.stringify({ success: false, eventCount: 0, error: errorMsg }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await exportActivitiesToAzure(userId)

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[export-activities] Unhandled error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        eventCount: 0,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
