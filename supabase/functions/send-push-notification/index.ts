/**
 * send-push-notification — Supabase Edge Function
 *
 * Sends FCM push notifications to a list of user IDs.
 * Called from the admin Notification Compose page.
 *
 * DEPLOYMENT:
 *   supabase functions deploy send-push-notification
 *
 * REQUIRED SECRETS (set in Supabase Dashboard → Edge Functions → Secrets):
 *   FIREBASE_PROJECT_ID   — e.g. fit-track-pro-d4e6f
 *   FIREBASE_CLIENT_EMAIL — service account email from Firebase service account JSON
 *   FIREBASE_PRIVATE_KEY  — service account private key from Firebase service account JSON
 *
 * HOW TO GET FIREBASE SERVICE ACCOUNT CREDENTIALS:
 *   1. Go to Firebase Console → Project Settings → Service Accounts
 *   2. Click "Generate new private key"
 *   3. Copy projectId, client_email, private_key from the downloaded JSON
 *   4. Set each as a Supabase secret (see above)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Firebase Admin JWT (no npm package needed in Deno) ───────────────────────

async function getFirebaseAccessToken(): Promise<string> {
  const projectId   = Deno.env.get('FIREBASE_PROJECT_ID')!
  const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL')!
  const privateKey  = Deno.env.get('FIREBASE_PRIVATE_KEY')!.replace(/\\n/g, '\n')

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  }

  // Build JWT header.payload
  const header = { alg: 'RS256', typ: 'JWT' }
  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const signingInput = `${enc(header)}.${enc(payload)}`

  // Import the private key
  const keyData = pemToArrayBuffer(privateKey)
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const jwt = `${signingInput}.${arrayBufferToBase64Url(signature)}`

  // Exchange JWT for OAuth2 access token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  const data = await res.json()
  if (!data.access_token) throw new Error(`Failed to get Firebase access token: ${JSON.stringify(data)}`)
  return data.access_token
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const binary = atob(b64)
  const buf = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i)
  return buf.buffer
}

function arrayBufferToBase64Url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

// ── Send FCM message to a single token ───────────────────────────────────────

async function sendFcmMessage(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<{ success: boolean; error?: string }> {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`

  const message = {
    message: {
      token,
      notification: { title, body },
      data,
      webpush: {
        notification: {
          title,
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
        },
        fcm_options: { link: data.action_url || '/' },
      },
      android: {
        notification: {
          title,
          body,
          icon: 'ic_launcher',
          channel_id: data.category || 'default',
        },
      },
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })

  if (res.ok) return { success: true }

  const err = await res.json()
  // Token invalid/expired — caller should remove it
  const isInvalidToken =
    err?.error?.details?.some((d: any) => d.errorCode === 'INVALID_ARGUMENT' || d.errorCode === 'UNREGISTERED')
  return { success: false, error: isInvalidToken ? 'INVALID_TOKEN' : JSON.stringify(err?.error) }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user_ids, title, body, data = {} } = await req.json() as {
      user_ids: string[]
      title: string
      body: string
      data?: Record<string, string>
    }

    if (!user_ids?.length) {
      return new Response(JSON.stringify({ queued: 0, errors: ['No user IDs provided'] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    const projectId = Deno.env.get('FIREBASE_PROJECT_ID')
    if (!projectId) throw new Error('FIREBASE_PROJECT_ID secret not set')

    // Supabase client (service role — bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch FCM tokens for these users
    const { data: prefs, error: prefsErr } = await supabase
      .from('notification_preferences')
      .select('user_id, fcm_token, platform')
      .in('user_id', user_ids)
      .eq('notifications_enabled', true)
      .not('fcm_token', 'is', null)

    if (prefsErr) throw prefsErr

    const entries = (prefs ?? []).filter((p) => p.fcm_token)
    if (!entries.length) {
      return new Response(JSON.stringify({ queued: 0, sent: 0, errors: ['No users have push notifications enabled'] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const accessToken = await getFirebaseAccessToken()
    let sent = 0
    const errors: string[] = []
    const invalidTokenUserIds: string[] = []

    // Send in parallel (up to 500 at a time)
    const results = await Promise.allSettled(
      entries.map((p) =>
        sendFcmMessage(accessToken, projectId, p.fcm_token!, title, body,
          Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
        ).then((r) => ({ ...r, user_id: p.user_id, token: p.fcm_token! }))
      )
    )

    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.success) {
          sent++
        } else {
          if (r.value.error === 'INVALID_TOKEN') {
            invalidTokenUserIds.push(r.value.user_id)
          } else {
            errors.push(`User ${r.value.user_id}: ${r.value.error}`)
          }
        }
      } else {
        errors.push(r.reason?.message ?? 'Unknown error')
      }
    }

    // Clean up invalid tokens
    if (invalidTokenUserIds.length) {
      await supabase
        .from('notification_preferences')
        .update({ fcm_token: null, notifications_enabled: false })
        .in('user_id', invalidTokenUserIds)
    }

    return new Response(JSON.stringify({ queued: entries.length, sent, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[send-push-notification]', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
