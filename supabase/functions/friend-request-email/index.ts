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

type ProfileRow = {
  id: string
  email: string
  preferred_name?: string | null
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
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

    if (payload.schema !== 'public' || payload.table !== 'friend_requests') {
      return jsonResponse(200, { skipped: true, reason: 'Unsupported webhook source table' })
    }

    if (!isValidUuid(row.sender_id) || !isValidUuid(row.receiver_id)) {
      return jsonResponse(400, { error: 'Invalid sender_id/receiver_id in payload' })
    }

    const oldRow = payload?.old_record || null

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

    const isNewPendingRequest = payload.type === 'INSERT' && row.status === 'pending'
    const isAcceptedUpdate = payload.type === 'UPDATE'
      && row.status === 'accepted'
      && oldRow?.status !== 'accepted'

    if (!isNewPendingRequest && !isAcceptedUpdate) {
      return jsonResponse(200, { skipped: true, reason: 'Not a notifiable friend request event' })
    }

    async function getProfile(profileId: string): Promise<ProfileRow> {
      const { data, error } = await adminClient
        .from('profiles')
        .select('id, email, preferred_name')
        .eq('id', profileId)
        .single()

      if (error || !data) {
        throw new Error(error?.message || `Could not load profile ${profileId}`)
      }

      if (!data.email) {
        throw new Error(`Profile ${profileId} is missing email`)
      }

      return data
    }

    const sender = await getProfile(row.sender_id)
    const receiver = await getProfile(row.receiver_id)
    const senderNameRaw = (sender.preferred_name || '').trim() || sender.email
    const receiverNameRaw = (receiver.preferred_name || '').trim() || receiver.email
    const senderName = escapeHtml(senderNameRaw)
    const receiverName = escapeHtml(receiverNameRaw)
    const inboxLink = `${appUrl.replace(/\/$/, '')}/`

    const toEmail = isNewPendingRequest ? receiver.email : sender.email
    const subject = isNewPendingRequest
      ? `${senderName} sent you a friend request on DoodleDesk`
      : `${receiverName} accepted your friend request on DoodleDesk`
    const html = isNewPendingRequest
      ? `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin: 0 0 12px;">New friend request</h2>
        <p style="margin: 0 0 12px;"><strong>${senderName}</strong> sent you a friend request on DoodleDesk.</p>
        <p style="margin: 0 0 16px;">Open DoodleDesk and accept or decline it from your profile.</p>
        <a href="${inboxLink}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#2563eb;color:#fff;text-decoration:none;">Open DoodleDesk</a>
      </div>
    `
      : `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin: 0 0 12px;">Friend request accepted</h2>
        <p style="margin: 0 0 12px;"><strong>${receiverName}</strong> accepted your friend request on DoodleDesk.</p>
        <p style="margin: 0 0 16px;">Open DoodleDesk to start collaborating.</p>
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
        to: [toEmail],
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

    return jsonResponse(200, {
      success: true,
      requestId: row.id,
      notificationType: isNewPendingRequest ? 'request_created' : 'request_accepted',
      sentTo: toEmail
    })
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : 'Unexpected error'
    })
  }
})
