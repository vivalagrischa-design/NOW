// Sends a push to all active Expo push tokens for a target user.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const secret=req.headers.get('x-now-internal-secret');
  if (!secret || secret !== Deno.env.get('NOW_INTERNAL_SECRET')) return new Response('unauthorized',{status:401});
  const { user_id, title='NOW', body, data={} } = await req.json();
  if (!user_id || !body) return new Response('bad request',{status:400});
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data:tokens, error }=await admin.from('push_tokens').select('token').eq('user_id',user_id).eq('active',true);
  if(error) return new Response(error.message,{status:500});
  const messages=(tokens||[]).map((x:any)=>({to:x.token,sound:'default',title,body,data}));
  if(messages.length){
    const r=await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(messages)});
    if(!r.ok)return new Response(await r.text(),{status:502});
  }
  return Response.json({ok:true,count:messages.length});
});
