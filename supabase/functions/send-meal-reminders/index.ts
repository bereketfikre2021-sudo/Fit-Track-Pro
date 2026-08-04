/**
 * send-meal-reminders — Supabase Edge Function
 *
 * Sends FCM push notifications for meal reminders based on each user's
 * saved notification_preferences (meal_reminders_enabled = true).
 *
 * DEPLOYMENT:
 *   supabase functions deploy send-meal-reminders
 *
 * SCHEDULING (run every minute via pg_cron or Supabase cron):
 *   In Supabase Dashboard → Database → Extensions → enable pg_cron, then:
 *
 *   select cron.schedule(
 *     'meal-reminders',
 *     '* * * * *',   -- every minute
 *     $$
 *       select net.http_post(
 *         url    := 'https://<project-ref>.supabase.co/functions/v1/send-meal-reminders',
 *         headers := '{"Authorization":"Bearer <service_role_key>","Content-Type":"application/json"}',
 *         body   := '{}'
 *       );
 *     $$
 *   );
 *
 * REQUIRED ENVIRONMENT VARIABLES (set in Supabase Dashboard → Edge Functions → Secrets):
 *   FIREBASE_PROJECT_ID   — your Firebase project ID
 *   FIREBASE_CLIENT_EMAIL — service account email (from Firebase service account JSON)
 *   FIREBASE_PRIVATE_KEY  — service account private key (from Firebase service account JSON)
 *   SUPABASE_URL          — your Supabase project URL (auto-injected)
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (auto-injected)
 *
 * GET FIREBASE SERVICE ACCOUNT:
 *   Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   Download the JSON and extract clientEmail + privateKey
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL            = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FIREBASE_PROJECT_ID     = Deno.env.get('FIREBASE_PROJECT_ID')!
const FIREBASE_CLIENT_EMAIL   = Deno.env.get('FIREBASE_CLIENT_EMAIL')!
const FIREBASE_PRIVATE_KEY    = Deno.env.get('FIREBASE_PRIVATE_KEY')!.replace(/\\n/g, '\n')

const FCM_URL = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`

const MEAL_SLOTS = [
  'breakfast',
  'morningSnack',
  'lunch',
  'afternoonSnack',
  'dinner',
  'beforeBed',
] as const

const SLOT_LABELS: Record<string, string> = {
  breakfast:      'Breakfast time',
  morningSnack:   'Morning snack',
  lunch:          'Lunch time',
  afternoonSnack: 'Afternoon snack',
  dinner:         'Dinner time',
  beforeBed:      'Before bed snack',
}

// ── JWT helper for FCM OAuth2 ─────────────────────────────────────────────────
async function getAccessToken(): Promise<string> {
  const header  = { alg: 'RS256', typ: 'JWT' }
  const now     = Math.floor(Date.now() / 1000)
  const payload = {
    iss:   FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  }

  const enc    = (obj: object) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const signingInput = `${enc(header)}.${enc(payload)}`

  // Import private key
  const pemContents = FIREBASE_PRIVATE_KEY
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const jwt = `${signingInput}.${sigB64}`

  // Exchange JWT for access token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const data = await res.json()
  return data.access_token
}

// ── Send one FCM message ──────────────────────────────────────────────────────
async function sendFcmMessage(token: string, slot: string, accessToken: string) {
  const body = {
    title: 'FitTrack Pro',
    body:  SLOT_LABELS[slot] ?? 'Meal reminder',
  }

  const res = await fetch(FCM_URL, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token,
        notification: body,
        data: { tag: `meal-${slot}`, slot },
        android: { priority: 'high' },
        webpush: {
          notification: { ...body, icon: '/icon-192.png', badge: '/icon-192.png' },
        },
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.warn(`[FCM] Failed to send to token (slot ${slot}):`, err)
    return false
  }
  return true
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

    // Current UTC time — HH:MM
    const now = new Date()
    const hh  = String(now.getUTCHours()).padStart(2, '0')
    const mm  = String(now.getUTCMinutes()).padStart(2, '0')
    const currentTime = `${hh}:${mm}`

    // Load all users with meal reminders enabled and an FCM token
    const { data: prefs, error } = await supabase
      .from('notification_preferences')
      .select('user_id, fcm_token, meal_reminder_times')
      .eq('meal_reminders_enabled', true)
      .not('fcm_token', 'is', null)

    if (error) throw error
    if (!prefs?.length) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    const accessToken = await getAccessToken()
    let sent = 0

    for (const pref of prefs) {
      const times = pref.meal_reminder_times as Record<string, string> | null
      if (!times) continue

      for (const slot of MEAL_SLOTS) {
        const slotTime = times[slot]
        // Only fire for the slot whose time matches current minute
        if (slotTime !== currentTime) continue

        const ok = await sendFcmMessage(pref.fcm_token, slot, accessToken)
        if (ok) sent++
      }
    }

    return new Response(JSON.stringify({ sent, time: currentTime }), { status: 200 })
  } catch (err) {
    console.error('[send-meal-reminders]', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
