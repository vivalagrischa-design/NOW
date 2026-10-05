#!/usr/bin/env bash
set -e
# Run once before creating an iOS/Android development build.
npx expo install expo-iap expo-notifications expo-device expo-constants expo-image-picker
printf '\nNative modules installed. Next: npx eas build --profile development --platform ios\n'
