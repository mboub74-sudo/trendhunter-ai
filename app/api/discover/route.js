import {NextResponse} from 'next/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const permitted=new Set(['US','CA','GB','FR']);
const clean=(x)=>String(x||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").trim();
export async function GET(req){
 const u=new URL(req.url),q=(u.searchParams.get('q')||'recipes').trim().slice(0,80),geo=u.searchParams.get('geo')||'US';
 if(!permitted.has(geo)||!q)return NextResponse.json({error:'Invalid search'},{status:400});
 const sources=[],errors=[];
 async function source(name,url,parser){try{const r=await fetch(url,{signal:AbortSignal.timeout(6500),headers:{'user-agent':'TrendHunterAI/0.3 research app','accept':'application/json, application/xml, text/xml, */*'},next:{revalidate:3600},redirect:'error'});if(!r.ok)throw Error('HTTP '+r.status);const raw=await r.text();sources.push(...parser(raw).slice(0,35).map(x=>({keyword:clean(x),source:name})).filter(x=>x.keyword.length>2))}catch(e){errors.push(name+': '+e.message)}}
 const google='https://suggestqueries.google.com/complete/search?client=firefox&q='+encodeURIComponent(q);
 const youtube='https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q='+encodeURIComponent(q);
 await Promise.all([
  source('Google suggestions',google,s=>{const x=JSON.parse(s);return Array.isArray(x[1])?x[1]:[]}),
  source('YouTube suggestions',youtube,s=>{const x=JSON.parse(s);return Array.isArray(x[1])?x[1]:[]}),
  source('Reddit RSS','https://www.reddit.com/r/recipes/search.rss?q='+encodeURIComponent(q)+'&restrict_sr=1&sort=new&t=month',s=>[...s.matchAll(/<entry>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/gi)].map(x=>x[1]))
 ]);
 return NextResponse.json({items:sources,errors,checkedAt:new Date().toISOString(),note:'Autocomplete and recent Reddit titles are discovery signals, not verified rising trends or traffic volumes. Sources may block automated requests.'});
}
