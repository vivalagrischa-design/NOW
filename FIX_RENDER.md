# Render fix

The previous SDK57 package used non-existent Expo module versions.

Verified SDK57 package versions:
- expo-asset: ~57.0.18
- expo-linear-gradient: ~57.0.2
- expo-status-bar: ~57.0.1
- @expo/metro-runtime: ~57.0.16

Render:
Build Command: npm install && npm run build:web
Publish Directory: dist

After uploading to GitHub:
Manual Deploy -> Clear build cache & deploy.
