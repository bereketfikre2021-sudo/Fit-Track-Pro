/**
 * PrivacyPolicyPage.jsx
 *
 * Public-facing privacy policy for FitTrack Pro.
 * Route: /privacy-policy  (no auth required)
 *
 * Meets Google Play Store requirements:
 *   - Accessible URL that can be linked in the Play Console listing
 *   - Covers personal data, fitness data, third-party services
 *   - Explains user rights and data deletion
 *
 * TODO: Replace "your.email@example.com" with your actual contact email
 * TODO: Replace "https://fittrackpro.app" with your actual deployed URL
 * TODO: Update EFFECTIVE_DATE whenever this policy materially changes
 */

import { Link } from 'react-router-dom'
import { ArrowLeft, Dumbbell, Shield } from 'lucide-react'

// ── Update these constants when you publish or change the policy ─────────────
const EFFECTIVE_DATE   = 'August 3, 2026'
const CONTACT_EMAIL    = 'privacy@fittrackpro.app'     // TODO: your real email
const APP_URL          = 'https://fittrackpro.app'     // TODO: your deployed URL
const SUPABASE_PRIVACY = 'https://supabase.com/privacy'
const FIREBASE_PRIVACY = 'https://firebase.google.com/support/privacy'
const ADMOB_PRIVACY    = 'https://support.google.com/admob/answer/6128543'
const GOOGLE_PRIVACY   = 'https://policies.google.com/privacy'
// ─────────────────────────────────────────────────────────────────────────────

function Section({ id, title, children }) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-lg font-bold text-foreground border-b border-border pb-2">
        {title}
      </h2>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </section>
  )
}

function BulletList({ items }) {
  return (
    <ul className="list-disc list-inside space-y-1 pl-2">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

function ExternalLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
    >
      {children}
    </a>
  )
}

function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 flex items-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Link>
          <div className="flex items-center gap-2 ml-auto">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-primary-foreground" aria-hidden />
            </div>
            <span className="font-bold text-sm">FitTrack Pro</span>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-10 pb-20 space-y-10">

        {/* Title block */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Privacy Policy</h1>
              <p className="text-xs text-muted-foreground">Effective date: {EFFECTIVE_DATE}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            FitTrack Pro (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting
            your privacy. This Privacy Policy explains what information we collect, how we use
            it, and your rights regarding that information when you use the FitTrack Pro mobile
            and web application (&quot;the App&quot;).
          </p>
          <p className="text-sm text-muted-foreground">
            By using FitTrack Pro, you agree to the collection and use of information as
            described in this policy. If you do not agree, please discontinue use of the App.
          </p>
        </div>

        {/* Table of contents */}
        <nav aria-label="Table of contents">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Contents
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {[
              ['#information-we-collect', 'Information We Collect'],
              ['#how-we-use-data',        'How We Use Your Data'],
              ['#data-storage',           'Data Storage & Security'],
              ['#third-party-services',   'Third-Party Services'],
              ['#advertising',            'Advertising (Google AdMob)'],
              ['#analytics',              'Analytics'],
              ['#data-retention',         'Data Retention'],
              ['#user-rights',            'Your Rights'],
              ['#data-deletion',          'Data Deletion Request'],
              ['#children',               "Children's Privacy"],
              ['#changes',                'Changes to This Policy'],
              ['#contact',                'Contact Us'],
            ].map(([href, label]) => (
              <li key={href}>
                <a
                  href={href}
                  className="hover:underline underline-offset-2 transition-colors"
                >
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* ── 1. Information We Collect ── */}
        <Section id="information-we-collect" title="1. Information We Collect">
          <p>We collect the following categories of information when you use FitTrack Pro:</p>

          <div className="space-y-4">
            <div>
              <p className="font-semibold text-foreground text-xs uppercase tracking-wide mb-1">
                Account Information
              </p>
              <BulletList items={[
                'Email address — used to create and authenticate your account via Supabase Auth',
                'Display name — provided during onboarding, stored in your profile',
                'Profile photo (optional) — uploaded voluntarily',
              ]} />
            </div>

            <div>
              <p className="font-semibold text-foreground text-xs uppercase tracking-wide mb-1">
                Fitness &amp; Health Data
              </p>
              <BulletList items={[
                'Body measurements: weight, height, BMI (calculated locally)',
                'Date of birth and gender — used to personalise fitness suggestions',
                'Fitness goals, experience level, and preferred workout days',
                'Workout history: exercises performed, sets, reps, weight used, session dates',
                'Meal plan data: foods logged, calories, macros (protein, carbs, fat)',
                'Daily water intake logs',
                'Custom exercises and workout templates you create',
              ]} />
              <p className="mt-2 text-xs bg-muted/30 border border-border rounded-md px-3 py-2">
                <strong>Note:</strong> Fitness and health data is considered sensitive. We only
                use it to provide the App's core functionality. We do not sell it or share it
                with advertisers.
              </p>
            </div>

            <div>
              <p className="font-semibold text-foreground text-xs uppercase tracking-wide mb-1">
                Device &amp; Technical Data
              </p>
              <BulletList items={[
                'Device type and operating system (Android / iOS / web browser)',
                'Firebase Cloud Messaging (FCM) token — used to deliver push notifications to your device',
                'App version and crash reports (collected automatically by Firebase)',
              ]} />
            </div>

            <div>
              <p className="font-semibold text-foreground text-xs uppercase tracking-wide mb-1">
                Usage Data (Analytics)
              </p>
              <BulletList items={[
                'Features used within the App (e.g. which screens are visited)',
                'App performance metrics (load times, errors)',
                'Aggregated, anonymised usage patterns — never linked to your identity',
              ]} />
            </div>
          </div>
        </Section>

        {/* ── 2. How We Use Your Data ── */}
        <Section id="how-we-use-data" title="2. How We Use Your Data">
          <p>We use your information solely to provide and improve FitTrack Pro:</p>
          <BulletList items={[
            'Create and manage your user account',
            'Sync your fitness data across devices via Supabase',
            'Deliver push notification reminders (workout, meal, water, progress)',
            'Generate AI-powered workout and meal recommendations (processed on your device or via the Gemini API)',
            'Calculate fitness statistics such as BMI, streaks, and personal records',
            'Respond to support requests',
            'Detect and fix technical issues in the App',
            'Show contextual ads via Google AdMob (free tier users only — never based on health data)',
          ]} />
          <p>
            We do <strong className="text-foreground">not</strong> sell, rent, or trade your
            personal data or fitness data to any third party for commercial purposes.
          </p>
        </Section>

        {/* ── 3. Data Storage & Security ── */}
        <Section id="data-storage" title="3. Data Storage &amp; Security">
          <p>
            Your data is stored in two places:
          </p>

          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/10 p-4 space-y-1">
              <p className="font-semibold text-foreground text-sm">On-device (browser localStorage)</p>
              <p>
                A complete copy of your app state is stored locally in your browser or Android
                app so FitTrack Pro works offline. This data never leaves your device unless
                you explicitly sync it.
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted/10 p-4 space-y-1">
              <p className="font-semibold text-foreground text-sm">
                Supabase (cloud database)
              </p>
              <p>
                When you create an account, your profile and fitness data are securely stored
                in <ExternalLink href={SUPABASE_PRIVACY}>Supabase</ExternalLink>, a
                PostgreSQL cloud database provider. Supabase servers are hosted on AWS and are
                SOC 2 compliant.
              </p>
              <p>
                Row-Level Security (RLS) policies ensure that only you can read or write your
                own data — other users cannot access your records even if they share the same
                database instance.
              </p>
              <p>
                Data is encrypted in transit (TLS 1.2+) and at rest (AES-256).
              </p>
            </div>
          </div>

          <p>
            We implement industry-standard security practices. However, no method of electronic
            storage or transmission is 100% secure, and we cannot guarantee absolute security.
          </p>
        </Section>

        {/* ── 4. Third-Party Services ── */}
        <Section id="third-party-services" title="4. Third-Party Services">
          <p>FitTrack Pro integrates the following third-party services:</p>

          <div className="space-y-3">
            {[
              {
                name: 'Supabase',
                use:  'Authentication and cloud database storage',
                link: SUPABASE_PRIVACY,
              },
              {
                name: 'Firebase (Google)',
                use:  'Cloud Messaging (push notifications) and crash reporting',
                link: FIREBASE_PRIVACY,
              },
              {
                name: 'Google AdMob',
                use:  'Contextual advertising for free-tier users',
                link: ADMOB_PRIVACY,
              },
              {
                name: 'Google Gemini API (optional)',
                use:  'AI workout and meal recommendations — only contacted when you use the AI feature and have provided an API key',
                link: GOOGLE_PRIVACY,
              },
            ].map(({ name, use, link }) => (
              <div key={name} className="flex items-start gap-3 text-sm">
                <span className="shrink-0 mt-0.5 h-2 w-2 rounded-full bg-primary/60 mt-2" aria-hidden />
                <div>
                  <span className="font-semibold text-foreground">
                    <ExternalLink href={link}>{name}</ExternalLink>
                  </span>
                  {' — '}{use}
                </div>
              </div>
            ))}
          </div>

          <p>
            Each third-party service operates under its own privacy policy. We encourage you
            to review them using the links above.
          </p>
        </Section>

        {/* ── 5. Advertising ── */}
        <Section id="advertising" title="5. Advertising (Google AdMob)">
          <p>
            Free-tier users may see ads delivered by{' '}
            <ExternalLink href={ADMOB_PRIVACY}>Google AdMob</ExternalLink>. These ads are
            served based on contextual signals (e.g. the screen you are viewing) and general
            device information. AdMob may also use previously collected data to show
            personalised ads, subject to your device's ad personalisation settings.
          </p>
          <BulletList items={[
            'Ads are never shown during active workout tracking, meal logging, or onboarding',
            'Banner ads appear only on the Home and Progress screens',
            'Interstitial ads are shown sparingly — at most after a completed workout session',
            'Rewarded ads are always optional and user-initiated',
            'Fitness and health data is never shared with AdMob',
          ]} />
          <p>
            You can opt out of personalised ads at any time via your device settings:
            Android: <em>Settings → Google → Ads → Delete advertising ID</em>.
          </p>
          <p>
            Premium subscribers (when available) will not see ads.
          </p>
        </Section>

        {/* ── 6. Analytics ── */}
        <Section id="analytics" title="6. Analytics">
          <p>
            We collect anonymous usage analytics to understand how the App is used and to
            improve it. Analytics data is aggregated and does not identify you personally.
          </p>
          <BulletList items={[
            'Screen views and feature interactions',
            'Crash and error reports',
            'App performance metrics (load times, API latency)',
          ]} />
          <p>
            We do not use analytics to build advertising profiles or to track you across
            other apps and websites.
          </p>
        </Section>

        {/* ── 7. Data Retention ── */}
        <Section id="data-retention" title="7. Data Retention">
          <p>
            We retain your data for as long as your account remains active or as needed to
            provide the App's services.
          </p>
          <BulletList items={[
            'Account and profile data — retained until you delete your account',
            'Fitness logs (workouts, meals, body weight) — retained until you delete them or your account',
            'Push notification tokens — deleted when you disable notifications or sign out',
            'Analytics data — retained in anonymised, aggregated form for up to 24 months',
          ]} />
          <p>
            You can export all your data at any time via{' '}
            <strong className="text-foreground">Settings → Account Data → Export JSON</strong>.
          </p>
        </Section>

        {/* ── 8. Your Rights ── */}
        <Section id="user-rights" title="8. Your Rights">
          <p>
            Depending on your location, you may have the following rights under applicable
            data protection laws (including GDPR, CCPA, and similar regulations):
          </p>
          <BulletList items={[
            'Access — request a copy of the personal data we hold about you',
            'Rectification — correct inaccurate or incomplete data',
            'Erasure — request deletion of your personal data ("right to be forgotten")',
            'Portability — receive your data in a machine-readable format (JSON export available in Settings)',
            'Restriction — request that we limit how we process your data',
            'Objection — object to processing based on legitimate interests',
            'Withdraw consent — where processing is based on consent, withdraw it at any time',
          ]} />
          <p>
            To exercise any of these rights, contact us at{' '}
            <ExternalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</ExternalLink>.
            We will respond within 30 days.
          </p>
        </Section>

        {/* ── 9. Data Deletion ── */}
        <Section id="data-deletion" title="9. Data Deletion Request">
          <p>
            You can delete your data in two ways:
          </p>

          <div className="space-y-3">
            <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-2">
              <p className="font-semibold text-foreground text-sm">Option A — In-app (instant)</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Open FitTrack Pro</li>
                <li>Go to <strong className="text-foreground">Profile → Settings → Account Data</strong></li>
                <li>Tap <strong className="text-foreground">Clear All Data</strong></li>
                <li>This immediately deletes all local data on your device</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                To also delete your cloud account and all Supabase-stored data, sign out and
                then send us a deletion request by email (Option B).
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted/10 p-4 space-y-2">
              <p className="font-semibold text-foreground text-sm">Option B — Email request</p>
              <p>
                Send an email to{' '}
                <ExternalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</ExternalLink>{' '}
                with the subject line <strong className="text-foreground">"Data Deletion Request"</strong>{' '}
                and include the email address associated with your account. We will:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Verify your identity</li>
                <li>Permanently delete your account and all associated data from Supabase</li>
                <li>Confirm deletion within 30 days</li>
              </ol>
            </div>
          </div>

          <p>
            After deletion, anonymised aggregate analytics data (which cannot be linked back to
            you) may be retained in accordance with our analytics retention period.
          </p>

          {/* Google Play-required deletion URL — link this in the Play Console */}
          <p className="text-xs bg-muted/30 border border-border rounded-md px-3 py-2">
            <strong className="text-foreground">For Google Play:</strong> The data deletion
            request page is available at{' '}
            <ExternalLink href={`${APP_URL}/privacy-policy#data-deletion`}>
              {APP_URL}/privacy-policy#data-deletion
            </ExternalLink>
          </p>
        </Section>

        {/* ── 10. Children's Privacy ── */}
        <Section id="children" title="10. Children's Privacy">
          <p>
            FitTrack Pro is not directed at children under the age of 13 (or 16 in the
            European Union). We do not knowingly collect personal information from children.
            If you believe a child has provided us with personal information, please contact us
            at <ExternalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</ExternalLink>{' '}
            and we will delete the information promptly.
          </p>
        </Section>

        {/* ── 11. Changes ── */}
        <Section id="changes" title="11. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. When we make material changes,
            we will notify you by updating the Effective Date at the top of this page and, where
            appropriate, displaying an in-app notice.
          </p>
          <p>
            Your continued use of FitTrack Pro after any changes constitutes acceptance of the
            updated policy.
          </p>
        </Section>

        {/* ── 12. Contact ── */}
        <Section id="contact" title="12. Contact Us">
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy or
            your personal data, please contact us:
          </p>
          <div className="rounded-md border border-border bg-muted/10 p-4 space-y-1 text-sm">
            <p className="font-semibold text-foreground">FitTrack Pro — Privacy Team</p>
            <p>
              Email:{' '}
              <ExternalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</ExternalLink>
            </p>
            <p>
              Website:{' '}
              <ExternalLink href={APP_URL}>{APP_URL}</ExternalLink>
            </p>
          </div>
          <p>
            We aim to respond to all privacy-related enquiries within 30 days.
          </p>
        </Section>

        {/* Footer */}
        <footer className="pt-8 border-t border-border text-center text-xs text-muted-foreground space-y-1">
          <p>© {new Date().getFullYear()} FitTrack Pro. All rights reserved.</p>
          <p>Effective date: {EFFECTIVE_DATE}</p>
          <p>
            <Link to="/" className="text-primary hover:underline underline-offset-2">
              ← Back to App
            </Link>
          </p>
        </footer>
      </main>
    </div>
  )
}

export default PrivacyPolicyPage
