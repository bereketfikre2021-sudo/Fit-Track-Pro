/**
 * send-email-notification — Supabase Edge Function
 *
 * Sends transactional emails via Resend (https://resend.com).
 * Free tier: 3,000 emails/month, no credit card required.
 *
 * DEPLOYMENT:
 *   supabase functions deploy send-email-notification
 *
 * REQUIRED SECRETS (set in Supabase Dashboard → Edge Functions → Secrets):
 *   RESEND_API_KEY  — from https://resend.com/api-keys
 *   EMAIL_FROM      — verified sender address, e.g. "FitTrack Pro <noreply@fittrackpro.com>"
 *                     Must be a domain verified in Resend dashboard.
 *
 * HOW TO SET UP RESEND (free):
 *   1. Sign up at https://resend.com (free, no card needed)
 *   2. Add & verify your domain (or use the Resend test domain for testing)
 *   3. Create an API key → copy it
 *   4. Set RESEND_API_KEY in Supabase secrets
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
    const { user_ids, title, body, action_url, category } = await req.json() as {
      user_ids: string[]
      title: string
      body: string
      action_url?: string
      category?: string
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    const emailFrom = Deno.env.get('EMAIL_FROM') ?? 'FitTrack Pro <noreply@fittrackpro.com>'

    if (!resendKey) throw new Error('RESEND_API_KEY secret not set')
    if (!user_ids?.length) {
      return new Response(JSON.stringify({ sent: 0, errors: ['No user IDs provided'] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Get email addresses from auth.users (service role can read auth schema)
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers()
    if (authErr) throw authErr

    const userIdSet = new Set(user_ids)
    const targets = (authUsers?.users ?? [])
      .filter((u) => userIdSet.has(u.id) && u.email)
      .map((u) => ({ id: u.id, email: u.email! }))

    if (!targets.length) {
      return new Response(JSON.stringify({ sent: 0, errors: ['No users with email addresses found'] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let sent = 0
    const errors: string[] = []

    // Send emails in batches of 50
    for (let i = 0; i < targets.length; i += 50) {
      const batch = targets.slice(i, i + 50)

      const results = await Promise.allSettled(
        batch.map(async ({ id, email }) => {
          const html = buildEmailHtml(title, body, action_url, category)
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: emailFrom,
              to: [email],
              subject: title,
              html,
            }),
          })

          if (!res.ok) {
            const err = await res.json()
            throw new Error(`${email}: ${err?.message ?? res.statusText}`)
          }
          return id
        })
      )

      for (const r of results) {
        if (r.status === 'fulfilled') sent++
        else errors.push(r.reason?.message ?? 'Unknown error')
      }
    }

    return new Response(JSON.stringify({ sent, total: targets.length, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[send-email-notification]', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})

// ── Simple branded HTML email template ───────────────────────────────────────

function buildEmailHtml(title: string, body: string, actionUrl?: string, category?: string): string {
  const ctaButton = actionUrl ? `
    <div style="text-align:center;margin:24px 0;">
      <a href="${actionUrl}"
         style="background:#84cc16;color:#000;padding:12px 28px;border-radius:8px;
                text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        Open FitTrack Pro
      </a>
    </div>` : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#84cc16;padding:24px 32px;text-align:center;">
            <span style="font-size:22px;font-weight:900;color:#000;letter-spacing:-0.5px;">
              💪 FitTrack Pro
            </span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 12px;color:#f0f0f0;font-size:20px;font-weight:700;">${escapeHtml(title)}</h2>
            <p style="margin:0 0 20px;color:#a0a0a0;font-size:15px;line-height:1.6;">${escapeHtml(body).replace(/\n/g, '<br>')}</p>
            ${ctaButton}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #2a2a2a;text-align:center;">
            <p style="margin:0;color:#555;font-size:12px;">
              You received this because you have an account on FitTrack Pro.<br>
              © ${new Date().getFullYear()} FitTrack Pro
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
