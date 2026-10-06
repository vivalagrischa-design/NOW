# NOW 0.8 — Growth Loop release

## Added
- Explicit 18+ signup gate with DOB validation and confirmation.
- Referral code capture from invite links and profile-share links.
- Referral code forwarded into signup metadata; immediate redemption attempted when a session exists.
- Share button directly in Discovery cards.
- "Someone for your friend?" profile sharing CTA.
- Shared profile links carry both profile id and referral attribution.
- Empty-deck growth CTA: invite people and earn credits.
- Stronger Invite & Earn copy (+3 credits for both remains server-side).

## Existing core retained
- Availability gate: no active slot = no discovery/new matches.
- Free: 1 active slot; NOW+: up to 5 parallel slots.
- Persistent matches/chats.
- Credits, NOW+, safety/report/block, Supabase beta backend.

## Production follow-up
Universal/App Links for now.app must be configured on the production domain and native builds so shared links open the installed app directly. Until then the URLs remain valid acquisition/referral URLs for the web/landing flow.
