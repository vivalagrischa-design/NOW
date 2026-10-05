// NOW Beta: server-side IAP verification boundary.
// IMPORTANT: fail closed until Apple App Store Server API / Google Play Developer API secrets are configured.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const auth = req.headers.get('Authorization') || '';
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global:{ headers:{ Authorization:auth } } });
    const { data:{ user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ ok:false, error:'unauthorized' }), { status:401 });

    const { purchase, platform } = await req.json();
    if (!purchase || !['ios','android'].includes(platform)) return new Response(JSON.stringify({ ok:false, error:'invalid_request' }), { status:400 });

    // Production activation point:
    // iOS  -> verify transaction with App Store Server API / signed StoreKit transaction.
    // Android -> verify purchase token with Google Play Developer API.
    // Only AFTER provider verification, write purchase_events + subscriptions/credit ledger using service-role client.
    // This function intentionally does not trust client purchase payloads by itself.
    const configured = platform === 'ios'
      ? !!Deno.env.get('APPLE_IAP_VERIFIER_CONFIGURED')
      : !!Deno.env.get('GOOGLE_IAP_VERIFIER_CONFIGURED');
    if (!configured) return new Response(JSON.stringify({ ok:false, verified:false, error:'store_verifier_not_configured' }), { status:503 });

    return new Response(JSON.stringify({ ok:false, verified:false, error:'provider_verification_implementation_required' }), { status:501 });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500 });
  }
});
