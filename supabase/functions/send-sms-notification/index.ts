/**
 * send-sms-notification — Supabase Edge Function
 *
 * Sends SMS via Africa's Talking (works in Ethiopia + all Africa).
 * Free sandbox available for testing — no credit card needed.
 *
 * DEPLOYMENT:
 *   supabase functions deploy send-sms-notification
 *
 * REQUIRED SECRETS (set in Supabase Dashboard → Edge Functions → Secrets):
 *   AT_USERNAME  — your Africa's Talking username (use "sandbox" for testing)
 *   AT_API_KEY   — your Africa's Talking API key
 *   AT_SENDER_ID — optional sender name, e.g. "FitTrack" (max 11 chars, must be approved)
 *
 * HOW TO SET UP AFRICA'S TALKING (free sandbox):
 *   1. Sign up at https://africastalking.com (free)
 *   2. Use username "sandbox" and the sandbox API key for testing
 *   3. For production: top up credit and request sender ID approval
 *
 * NOTE: SMS only sends to users whose phone number is stored in auth.users
 *       or public.users. Users must provide their phone at signup/profile.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user_ids, title, body } = await req.json() as {
      user_ids: string[]
      title: string
      body: string
    }

    const atUsername = Deno.env.get('AT_USERNAME')
    const atApiKey   = Deno.env.get('AT_API_KEY')
    const senderId   = Deno.env.get('AT_SENDER_ID') ?? ''

    if (!atUsername || !atApiKey) throw new Error('AT_USERNAME and AT_API_KEY secrets must be set')
    if (!user_ids?.length) {
      return new Response(JSON.stringify({ sent: 0, errors: ['No user IDs provided'] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Get phone numbers from auth.users
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const userIdSet = new Set(user_ids)
    const targets = (authUsers?.users ?? [])
      .filter((u) => userIdSet.has(u.id) && u.phone)
      .map((u) => ({ id: u.id, phone: u.phone! }))

    if (!targets.length) {
      return new Response(JSON.stringify({ sent: 0, errors: ['No users with phone numbers found'] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Compose message — keep it short (160 chars per SMS segment)
    const message = `${title}: ${body}`.slice(0, 320)

    // Africa's Talking API accepts comma-separated phone numbers
    const phoneNumbers = targets.map((t) => t.phone).join(',')

    const apiBase = atUsername === 'sandbox'
      ? 'https://api.sandbox.africastalking.com'
      : 'https://api.africastalking.com'

    const formData = new URLSearchParams({
      username: atUsername,
      to:       phoneNumbers,
      message,
      ...(senderId ? { from: senderId } : {}),
    })

    const res = await fetch(`${apiBase}/version1/messaging`, {
      method: 'POST',
      headers: {
        apiKey: atApiKey,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    const result = await res.json()

    if (!res.ok) {
      throw new Error(`Africa's Talking error: ${JSON.stringify(result)}`)
    }

    const recipients = result?.SMSMessageData?.Recipients ?? []
    const sent    = recipients.filter((r: any) => r.status === 'Success').length
    const errors  = recipients
      .filter((r: any) => r.status !== 'Success')
      .map((r: any) => `${r.number}: ${r.status}`)

    return new Response(JSON.stringify({ sent, total: targets.length, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[send-sms-notification]', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
