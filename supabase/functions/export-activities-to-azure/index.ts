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
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info',
}

async function uploadToAzure(
  filename: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/${AZURE_CONTAINER}/${filename}`
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'x-ms-version': '2021-06-08',
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': 'application/json',
        'Content-Length': new TextEncoder().encode(content).length.toString(),
      },
      body: content,
    })

    if (!response.ok) {
      // Try with shared key authentication if direct upload fails
      const timestamp = new Date().toUTCString()
      const stringToSign = `PUT\n\n\n${new TextEncoder().encode(content).length}\n\napplication/json\n\n\n\n\n\nx-ms-blob-type:BlockBlob\nx-ms-version:2021-06-08\n/${AZURE_STORAGE_ACCOUNT}/${AZURE_CONTAINER}/${filename}`
      
      const encoder = new TextEncoder()
      const keyBytes = new Uint8Array(atob(AZURE_STORAGE_KEY).split('').map(c => c.charCodeAt(0)))
      const signatureBytes = await crypto.subtle.sign('HMAC', 
        await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
        encoder.encode(stringToSign)
      )
      const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))
      const authHeader = `SharedKey ${AZURE_STORAGE_ACCOUNT}:${signature}`

      const retryResponse = await fetch(url, {
        method: 'PUT',
        headers: {
          'x-ms-version': '2021-06-08',
          'x-ms-blob-type': 'BlockBlob',
          'Content-Type': 'application/json',
          'Content-Length': new TextEncoder().encode(content).length.toString(),
          'x-ms-date': timestamp,
          'Authorization': authHeader,
        },
        body: content,
      })

      if (!retryResponse.ok) {
        return { success: false, error: `Azure upload failed: ${retryResponse.statusText}` }
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
    const { userId } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await exportActivitiesToAzure(userId)

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        eventCount: 0,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
