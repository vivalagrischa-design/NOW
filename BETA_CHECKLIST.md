# NOW 0.7 Beta Candidate — Activation checklist

## Already implemented in this source tree
- Image-led mobile-first start screen with fixed USP
- Email/password account flow + Supabase session restore
- Phone OTP flow
- Apple / Google OAuth entry points through Supabase
- 18+ birth-date enforcement in database
- Profile image picker/upload plumbing
- Intent selection and persistence
- Persistent availability slots: add/edit/pause/resume/delete
- Server-side availability gate: no active slot = no discovery/likes
- Server-side Free 1 slot / NOW+ 5 slot rule
- Discovery based on overlapping time + same city + shared intent
- Like / skip / rewind history
- Persistent matches and conversations
- Realtime chat plumbing and read state
- Favorites
- Report / block and moderation-case creation
- Referral code + one-time server-side rewards
- Credit wallet + immutable ledger + secure spending RPC
- NOW+ entitlement model
- Apple / Google IAP client boundary through expo-iap
- Restore purchases flow
- Push token registration + server dispatch function scaffold
- Soft account deletion / immediate profile hiding
- Privacy / terms / community-guideline beta drafts
- EAS development/preview/production profiles

## External setup still required before real money/public beta
1. Create/configure Supabase project and run migrations 001 -> 003.
2. Copy `.env.example` to `.env` and insert Supabase URL + anon key.
3. Configure Supabase Auth providers: Email, Phone, Apple, Google.
4. Configure SMS provider for phone OTP.
5. Run `npm run native:setup`.
6. Create EAS project and replace `REPLACE_WITH_EAS_PROJECT_ID`.
7. Create App Store Connect products:
   - `app.now.dating.plus.monthly`
   - `app.now.dating.credits.10`
   - `app.now.dating.credits.30`
8. Create matching Google Play products:
   - `now_plus_monthly`
   - `credits_10`
   - `credits_30`
9. Complete server-side Apple/Google purchase verification in `supabase/functions/verify-iap` and deploy it. This is intentionally fail-closed now.
10. Deploy `push-dispatch`, configure `NOW_INTERNAL_SECRET`, and connect match/message events to it.
11. Replace beta legal drafts with final company/controller details and legal review.
12. Add final app icon, splash, store screenshots, store copy and support/contact URL.
13. Test on real iPhone + Android development builds, then TestFlight + Google closed testing.
14. Run safety/moderation abuse tests before opening registration publicly.

## Important
Expo Go is fine for UI/demo work, but Apple IAP, Google Play Billing and some push/native flows require an EAS development/TestFlight/Play build.
