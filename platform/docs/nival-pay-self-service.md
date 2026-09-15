# Nival Pay self-service

Nival Pay uses the existing accounts, businesses and payment profiles in `nival-tech-demo`.

- `/products`: choose Nival Pay, smart links or the existing Intelligence dashboard.
- `/dashboard/pay`: sign in, create a business if needed, then configure holder, bank, CLABE, optional payment link and uploaded image. Includes preview, publication toggle, stable NFC URL and downloadable QR.
- `/pay/[token]`: public banking details and optional external payment link. Disabled profiles and suspended subscriptions return 404.

The additive migration `20260915220427_payment_profile_self_service.sql` was applied to the existing Supabase project. It preserves the old RPC and all existing public tokens. Uploaded PNG/JPEG/WebP images are public, limited to 2 MB and stored in business-specific folders. Only owners/managers can upload or edit; database RLS enforces isolation. The public RPC intentionally allows anonymous, token-scoped reads of published profiles (hence the Supabase SECURITY DEFINER advisor notice).

`NEXT_PUBLIC_SITE_URL` can override the existing Vercel domain for generated links. Existing Supabase environment variables are reused. No AI credit or payment-provider credentials are needed for this feature.

This does not activate billing, sell physical cards, automatically change subscriptions or complete the overall landing-page redesign. The product screen explicitly says that configuration does not charge the business.

Validation: production build; lint (existing image optimization warnings); CLABE checksum and HTTPS URL checks; transactional database tests for owner writes, stable tokens, cross-business isolation, public read and pause. Browser testing covered sign-in, business onboarding, file upload, save and QR generation. The damaged committed package lock was regenerated so dependency installation and builds work.
