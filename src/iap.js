import { Platform } from 'react-native';
import { supabase, DEMO } from './supabase';

export const PRODUCT_IDS = {
  nowPlusMonthly: Platform.select({ ios:'app.now.dating.plus.monthly', android:'now_plus_monthly', default:'now_plus_monthly' }),
  credits10: Platform.select({ ios:'app.now.dating.credits.10', android:'credits_10', default:'credits_10' }),
  credits30: Platform.select({ ios:'app.now.dating.credits.30', android:'credits_30', default:'credits_30' })
};

const getIap = () => {
  try { return require('expo-iap'); }
  catch { return null; }
};

export const nativeIapAvailable = () => Platform.OS !== 'web' && !!getIap();

export async function initIap() {
  const iap = getIap();
  if (!iap || Platform.OS === 'web') return { available:false, products:[] };
  await iap.initConnection();
  const products = await iap.fetchProducts({ skus:Object.values(PRODUCT_IDS), type:'all' });
  return { available:true, products:products || [] };
}

export async function buy(productId) {
  const iap = getIap();
  if (!iap) throw new Error('IAP-Modul fehlt. Native Dependencies installieren und Development Build erstellen.');
  return iap.requestPurchase({ request:{ sku:productId } });
}

export async function restorePurchases() {
  const iap = getIap();
  if (!iap) throw new Error('IAP-Modul fehlt.');
  return iap.getAvailablePurchases();
}

export async function verifyPurchaseOnServer(purchase) {
  if (DEMO || !supabase) return { demo:true };
  const { data, error } = await supabase.functions.invoke('verify-iap', { body:{ purchase, platform:Platform.OS } });
  if (error) throw error;
  return data;
}

export async function finishPurchase(purchase, consumable=false) {
  const iap = getIap();
  if (!iap) throw new Error('IAP-Modul fehlt.');
  await iap.finishTransaction({ purchase, isConsumable:consumable });
}

export async function closeIap() {
  const iap = getIap();
  if (iap?.endConnection) await iap.endConnection();
}
