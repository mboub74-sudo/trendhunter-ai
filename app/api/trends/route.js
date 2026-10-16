import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const RECIPE_TERMS = /recipe|chicken|pasta|dinner|breakfast|lunch|dessert|baking|cake|cookie|salad|soup|air fryer|crockpot|slow cooker|protein|meal prep|food|pumpkin|potato|rice|salmon|bread|pizza|cheese|chocolate|beef|vegetarian/i;
function decode(s){return s.replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>')}
export async function GET(request){
 const country = new URL(request.url).searchParams.get('geo') || 'US';
 if(!['US','CA','GB','FR'].includes(country))return NextResponse.json({error:'Unsupported market'},{status:400});
 try{
  const response=await fetch('https://trends.google.com/trending/rss?geo='+country,{signal:AbortSignal.timeout(9000),headers:{'user-agent':'Mozilla/5.0'},next:{revalidate:3600}});
  if(!response.ok)throw Error('Google Trends returned '+response.status);
  const xml=await response.text();
  const items=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(m=>m[1]).map(x=>({keyword:decode((x.match(/<title>([\s\S]*?)<\/title>/i)||[])[1]||'').trim(),published:(x.match(/<pubDate>(.*?)<\/pubDate>/i)||[])[1]||'',source:'Google Trends trending RSS'})).filter(x=>RECIPE_TERMS.test(x.keyword));
  return NextResponse.json({items,geo:country,checkedAt:new Date().toISOString(),note:'Google Trends trending RSS is a snapshot of trending searches, not a growth percentage or monthly volume. A missing keyword does not mean no demand.'});
 }catch(e){return NextResponse.json({items:[],error:'Google Trends feed unavailable: '+e.message},{status:503})}
}
