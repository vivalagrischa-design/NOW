export async function pickProfilePhoto() {
  let ImagePicker;
  try { ImagePicker = require('expo-image-picker'); } catch { throw new Error('expo-image-picker fehlt. setup-native.sh ausführen.'); }
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Fotozugriff wurde nicht erlaubt.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes:['images'], allowsEditing:true, aspect:[4,5], quality:0.85 });
  if (result.canceled) return null;
  return result.assets?.[0] || null;
}
