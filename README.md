# NOW – Real people. Real time. No endless browsing.

Mobile Dating-/Meetup-App (React Native + Expo + Supabase). Design: Dark Premium + **Lachs/Koralle** (`#FF8F7E`, `#FF725F`, `#FFD5CC`) – kein Pink.

## Schnellstart (Demo-Modus, ohne Backend)
```bash
npm install
npx expo start      # QR-Code mit Expo Go (iPhone/Android) scannen
```
Ohne `.env` läuft die App mit lokalen Mock-Daten.

## Was schon funktioniert (Demo)
Auth-Screen → Intent wählen → Slot anlegen (Ort/Datum/Zeit) → **Availability Gate** (ohne aktiven Slot keine Profile)
→ Swipe-Deck nur mit echter **Zeitüberschneidung + Ort + Distanz/Alter** → Like → Match-Popup → Chat (Verlauf bleibt)
→ Matches (Favoriten) → Chats → Slots bearbeiten/pausieren/löschen (Free 1, NOW+ 5, Ablauf) → Filter
→ NOW+/Credits (lokal simuliert) → Settings (Incognito) → Referral-Share.

## Backend anbinden (Supabase) – bereits in der App verdrahtet
1. Projekt auf supabase.com anlegen. Im SQL-Editor **nacheinander** `001_init.sql` und `002_app_wiring.sql` ausführen.
2. `.env.example` → `.env` kopieren, URL + anon key eintragen (**keine Keys committen**), dann `npx expo start -c`.
3. Auth → Providers: E-Mail aktivieren (für Tests „Confirm email“ ausschalten). Phone/Apple/Google: siehe unten.
4. Dann laufen echt: Registrierung (18+-Check per DB), Login/Session, Slots (CRUD + Limit Free 1/NOW+ 5), Discovery (`discover()` mit Gate + Zeitüberschneidung),
   Like → Match → Conversation (`like_user()`), Realtime-Chat und dauerhafte Chat-History.
5. Zum Testen zwei Accounts anlegen, beide Slot am selben Ort/Zeit, gegenseitig liken.

## Noch nicht verdrahtet
Phone-OTP, Apple/Google Login (native Konfiguration), echte Käufe (IAP → `subscriptions` + `add_credits()` per Edge Function), Foto-Upload, Push, PostGIS-Distanz.
## Ehrlicher Status
- **Fertig:** UI/Flow, Matching-Logik (Demo), komplettes DB-Schema, RLS, Gate, Slot-Limit, Match-Funktion, Credit-Ledger, Referral-Funktion.
- **Noch offen:** App ↔ Supabase verdrahten, echte Auth, Foto-Upload/Moderation, IAP, Push, Admin-Dashboard, Verifizierung, Distanzberechnung (PostGIS), Rechtstexte (AGB/Datenschutz).
- Profilbilder sind Platzhalter (Initialen); echte Fotos später über Supabase Storage.

Stack: Expo 52, React Native 0.76, Supabase JS v2.
