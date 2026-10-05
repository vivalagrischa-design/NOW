#!/bin/bash
# NOW – Mac-Setup: installiert alles und startet die App
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js fehlt. Installiere es mit: brew install node"; exit 1; }
echo "Node $(node -v) gefunden. Installiere Pakete ..."
npm install
npx expo install --fix
if [ -f .env ]; then echo "Modus: Supabase (.env gefunden)"; else echo "Modus: Demo (keine .env)"; fi
npx expo start -c
