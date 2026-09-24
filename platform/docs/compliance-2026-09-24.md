# Compliance hardening — 2026-09-24

This document records the technical safeguards added during the September 2026 legal/privacy/accessibility review. It is an engineering checklist, not legal advice.

## Production gates

New personal-data collection stays disabled until these variables are configured with real, verifiable information:

- `NEXT_PUBLIC_NIVAL_LEGAL_NAME`
- `NEXT_PUBLIC_NIVAL_LEGAL_ADDRESS`
- `NEXT_PUBLIC_NIVAL_PHONE`

Paid commerce also requires the same provider disclosures. Do not use placeholders or a personal address/phone unless that is actually the lawful provider contact information intended for consumers.

Recurring subscriptions additionally require:

- `NIVAL_RENEWAL_NOTICE_READY=true`

Only set this to true after a reliable process has been implemented and tested to notify subscribers at least five calendar days before an automatic renewal and to preserve the immediate in-account cancellation mechanism.

## Policies/routes

- `/privacy` — integral privacy notice
- `/terms` — terms and conditions
- `/cookies` — cookie/technology notice
- `/refunds` — cancellations, returns and refunds
- `/support` — provider/support contact

## Data minimization and tracking

- No Google Analytics, Meta Pixel, PostHog, Plausible or Umami package was found in the reviewed code.
- Supabase Auth uses session cookies required for authentication.
- Nival Pay records first-party operational counters such as page opens and CLABE copies without attaching a visitor identity in the reviewed event handlers.
- Google Wallet receives only the first name needed for the displayed loyalty pass instead of the full customer name.
- Mercado Pago receives order/subscription data necessary to create and reconcile the selected transaction.

Any future analytics, advertising pixel, fingerprinting or cross-site tracking integration requires a new privacy/cookie review before deployment.

## Accessibility baseline

- Global skip link.
- Visible keyboard focus.
- Reduced-motion support.
- Explicit labels/ARIA labels on reviewed controls.
- Meaningful logos use alternative text; decorative marks use empty alt text or `aria-hidden`.
- Native inputs/buttons/links remain keyboard operable.

Accessibility should still be regression-tested after major UI changes and with automated + manual keyboard/screen-reader checks.

## Commercial claims

Demonstration values must remain visibly labeled as examples. Do not publish guaranteed growth, recurrence, revenue, security or conversion claims without evidence supporting the exact wording.

## Third parties reviewed

- Vercel — hosting/runtime.
- Supabase — database, authentication and storage.
- Mercado Pago — payments and recurring billing.
- Google Wallet — optional wallet pass when requested by the user.

Review any new processor before connecting it, document the minimum data shared, and update the privacy/cookie notice where needed.

## Legal references checked

Review was based on the current Mexican Federal Consumer Protection Law, including the December 12, 2025 recurring-charge amendments to article 76 Bis, and the Federal Law on Protection of Personal Data Held by Private Parties and its privacy-notice/express-consent requirements. Re-check the law before materially changing payment, marketing or personal-data flows.

## Safe rollout order

The public-RPC lockdown is intentionally a two-phase rollout because production on `main` still calls some public RPCs directly.

1. Configure the real provider/privacy variables in Vercel. Do not use placeholders.
2. Deploy the application changes that route public RPCs through the server-only Supabase service role.
3. Smoke-test login plus the public Nival Pay, Nival Puntos, digital-profile, smart-link and invitation routes.
4. Apply `20260924065929_revoke_legacy_public_rpc_execute_20260924.sql`.
5. Re-run Supabase security advisors and confirm the anonymous `SECURITY DEFINER` findings are removed/reduced as expected.
6. Re-test the same public routes and authenticated dashboard actions.
7. Only after a real five-day renewal-notice mechanism exists and has been tested, set `NIVAL_RENEWAL_NOTICE_READY=true`.

Do **not** apply the revoke migration before step 2. It is safe in syntax/permission behavior and was verified inside a transaction with `ROLLBACK`, but applying it against the current production code first would break public routes.

## Security verification status

- Platform CI uses Node 22 and runs `npm ci`, TypeScript, ESLint, a production-dependency audit that fails on high/critical findings, and `next build`.
- The compliance branch passed TypeScript, lint, dependency audit and production build after the cookie-notice lint fix.
- Vercel preview creation is currently blocked by the account build-rate limit; this is a platform quota failure, not the GitHub build result.
- Supabase leaked-password protection remains a project-setting warning. Supabase documents this feature as available on Pro plans and above; enable it in Auth settings when the project plan supports it.
- Authenticated `SECURITY DEFINER` functions that remain callable are not automatically unsafe: many enforce membership/role checks with `auth.uid()` and are required by dashboard actions. Legacy wrappers identified as unused are staged for revocation in phase 2.
