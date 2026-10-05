import { Platform } from 'react-native';
import { supabase, DEMO } from './supabase';

const load = (name) => { try { return require(name); } catch { return null; } };

export async function registerPushToken() {
  if (Platform.OS === 'web') return null;
  const Notifications = load('expo-notifications');
  const Device = load('expo-device');
  const Constants = load('expo-constants');
  if (!Notifications || !Device || !Constants) return null;
  if (!Device.isDevice) return null;
  const p = await Notifications.getPermissionsAsync();
  let status = p.status;
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  if (!DEMO && supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) await supabase.from('push_tokens').upsert({ user_id:data.session.user.id, token, platform:Platform.OS, active:true }, { onConflict:'token' });
  }
  return token;
}
