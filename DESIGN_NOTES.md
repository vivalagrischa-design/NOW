# NOW 0.4.1 – Design overhaul

Goal: make the prototype feel like a real premium mobile dating app instead of a stretched developer view.

## Changed
- Web preview is constrained to a centered mobile-app frame (`maxWidth: 480`) instead of stretching across the desktop.
- Discovery uses local fictional profile imagery rather than colored initials.
- Profile cards use full-bleed imagery, dark gradients, salmon availability pills, distance/online chips and large action buttons.
- Profile detail uses a large hero image plus separate About / Availability cards.
- Match/chat rows use real demo avatars.
- Empty demo deck now offers a one-tap reset instead of leaving a giant empty page.
- Bottom nav remains fixed inside the mobile frame.
- Salmon/coral brand system remains the primary accent.

## Product rules preserved
- No active own availability slot = no Discovery, no swiping, no new matches.
- Existing Matches and Chat History remain available.
- Free = 1 active slot; NOW+ = up to 5 active slots.
- Slots persist until they expire or are edited/paused/deleted.
- Match automatically saved; favorite is a separate star.
- Match opens free chat.
- Credits and NOW+ remain separate monetization layers.

## Demo imagery
The included profile images are fictional demo imagery for prototype evaluation only.

## Start (web)
```bash
npm install
npx expo start --web
```

## Start (Expo mobile)
The underlying Claude project is still on Expo SDK 52. Current Expo Go on iOS requires a newer SDK, so web is the reliable preview path for this build. Upgrade the project to SDK 57 before using the latest Expo Go on iPhone.
