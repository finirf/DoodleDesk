// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type FriendRequestRow = {
  id: number
  sender_id: string
  receiver_id: string
  status: string
  created_at?: string
}

type WebhookPayload = {
  type?: string
  table?: string
  schema?: string
  record?: FriendRequestRow
  old_record?: FriendRequestRow | null
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  try {
    const webhookSecret = Deno.env.get('FRIEND_REQUEST_WEBHOOK_SECRET')
    if (webhookSecret) {
      const incomingSecret = request.headers.get('x-webhook-secret')
      if (!incomingSecret || incomingSecret !== webhookSecret) {
        return jsonResponse(401, { error: 'Unauthorized webhook request' })
      }
    }

    const payload = (await request.json()) as WebhookPayload
    const row = payload?.record

    if (!row) {
      return jsonResponse(400, { error: 'Missing webhook record payload' })
    }

    if (payload.type !== 'INSERT' || row.status !== 'pending') {
      return jsonResponse(200, { skipped: true, reason: 'Not a new pending request' })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('FRIEND_REQUEST_FROM_EMAIL')
    const appUrl = Deno.env.get('APP_BASE_URL') || 'https://doodledesk.app'

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !fromEmail) {
      return jsonResponse(500, {
        error: 'Missing required secrets (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, FRIEND_REQUEST_FROM_EMAIL)'
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: sender, error: senderError } = await adminClient
      .from('profiles')
      .select('id, email, preferred_name')
      .eq('id', row.sender_id)
      .single()

    if (senderError || !sender) {
      return jsonResponse(500, { error: senderError?.message || 'Could not load sender profile' })
    }

    const { data: receiver, error: receiverError } = await adminClient
      .from('profiles')
      .select('id, email, preferred_name')
      .eq('id', row.receiver_id)
      .single()

    if (receiverError || !receiver?.email) {
      return jsonResponse(500, { error: receiverError?.message || 'Could not load receiver profile email' })
    }

    const senderName = (sender.preferred_name || '').trim() || sender.email
    const inboxLink = `${appUrl.replace(/\/$/, '')}/`

    const subject = `${senderName} sent you a friend request on DoodleDesk`
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin: 0 0 12px;">New friend request</h2>
        <p style="margin: 0 0 12px;"><strong>${senderName}</strong> sent you a friend request on DoodleDesk.</p>
        <p style="margin: 0 0 16px;">Open DoodleDesk and accept or decline it from your profile.</p>
        <a href="${inboxLink}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#2563eb;color:#fff;text-decoration:none;">Open DoodleDesk</a>
      </div>
    `

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [receiver.email],
        subject,
        html
      })
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()
      return jsonResponse(502, {
        error: 'Email provider returned an error',
        providerStatus: resendResponse.status,
        details: errorText
      })
    }

    return jsonResponse(200, { success: true, requestId: row.id, sentTo: receiver.email })
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : 'Unexpected error'
    })
  }
})
