# NOW 0.7 Beta Candidate

**Meet people who want the same thing, when you're both free.**

**Other apps match attraction. NOW matches intent + availability.**

This package moves NOW from prototype toward a real beta architecture. Without `.env`, it still opens in local demo mode. With Supabase configured, accounts, slots, intent, matching, chat, safety, credits and entitlement plumbing use the backend.

## Quick local UI test
```bash
npm install
npx expo start --web
```

## Native beta setup
```bash
cp .env.example .env
npm run native:setup
npm install -g eas-cli
eas login
eas init
npm run beta:ios
# or
npm run beta:android
```

## Backend
Run Supabase migrations in order:
- `001_init.sql`
- `002_app_wiring.sql`
- `003_beta_candidate.sql`

Then configure Email / Phone / Apple / Google providers in Supabase Auth.

## Payments
The app contains the native IAP client boundary for Apple StoreKit / Google Play Billing via `expo-iap`. Product IDs are in `src/iap.js`.

Real-money activation intentionally requires server-side receipt verification. `supabase/functions/verify-iap` currently **fails closed** until the Apple/Google verifier credentials and provider verification code are configured. Do not bypass this by trusting client purchase payloads.

## Read next
See `BETA_CHECKLIST.md` for the remaining external steps before TestFlight / Google Closed Beta.


## 0.7.1 iPhone login compactness
- Hero remains dominant.
- Email/password fields are now compact and side-by-side on iPhone.
- Login button reduced.
- Create account is a text action.
- Apple / Google / Phone are compact buttons in one row.
- Goal: complete login area visible on a normal iPhone viewport without oversized controls.
