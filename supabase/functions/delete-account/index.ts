import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MAX_REQUEST_BYTES = 2_048

function parseAllowedOrigins() {
  const configured = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map((entry) => entry.trim()).filter(Boolean)
  if (configured.length > 0) {
    return configured
  }

  const appBaseUrl = (Deno.env.get('APP_BASE_URL') || '').trim()
  if (appBaseUrl) {
    return [appBaseUrl]
  }

  return []
}

function isOriginAllowed(origin: string | null, allowedOrigins: string[]) {
  if (!origin) return false
  return allowedOrigins.includes(origin)
}

function buildCorsHeaders(origin: string | null, allowedOrigins: string[]) {
  const resolvedOrigin = isOriginAllowed(origin, allowedOrigins) ? origin : 'null'
  return {
    'Access-Control-Allow-Origin': resolvedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin'
  }
}

function jsonResponse(status: number, body: Record<string, unknown>, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin')
  const allowedOrigins = parseAllowedOrigins()
  const corsHeaders = buildCorsHeaders(origin, allowedOrigins)

  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!isOriginAllowed(origin, allowedOrigins)) {
    return jsonResponse(403, { error: 'Request origin is not allowed.' }, corsHeaders)
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' }, corsHeaders)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse(500, { error: 'Missing Supabase environment variables.' }, corsHeaders)
    }

    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse(401, { error: 'Missing Authorization header.' }, corsHeaders)
    }

    const contentType = request.headers.get('content-type') || ''
    if (!contentType.toLowerCase().includes('application/json')) {
      return jsonResponse(415, { error: 'Content-Type must be application/json.' }, corsHeaders)
    }

    const contentLengthHeader = request.headers.get('content-length') || ''
    const contentLength = Number(contentLengthHeader)
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return jsonResponse(413, { error: 'Payload too large.' }, corsHeaders)
    }

    let body: { confirmation?: string } = {}
    try {
      body = await request.json()
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON payload.' }, corsHeaders)
    }

    if ((body?.confirmation || '').trim().toUpperCase() !== 'DELETE') {
      return jsonResponse(400, { error: 'Invalid confirmation payload.' }, corsHeaders)
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    })

    const {
      data: { user },
      error: getUserError
    } = await userClient.auth.getUser()

    if (getUserError || !user) {
      return jsonResponse(401, { error: 'Unauthorized request.' }, corsHeaders)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error('delete-account: failed to delete user', {
        userId: user.id,
        code: deleteError.status,
        message: deleteError.message
      })
      return jsonResponse(500, { error: 'Failed to delete account.' }, corsHeaders)
    }

    return jsonResponse(200, { success: true }, corsHeaders)
  } catch (error) {
    console.error('delete-account: unexpected error', error)
    return jsonResponse(500, { error: 'Unexpected error.' }, corsHeaders)
  }
})
