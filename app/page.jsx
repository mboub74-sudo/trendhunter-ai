'use client';
import { useState } from 'react';

const DEFAULT_SITES = 'https://www.mealrivo.com\nhttps://www.besteverrecipes.com\nhttps://www.luncheanddinner.com';
const STOP = new Set('the and with from easy best recipe recipes for this that your into over under plus simple quick delicious tasty homemade ultimate perfect fresh healthy how make using one pan pot minutes minute dinner lunch breakfast food ideas made a an to of in on at by or is are'.split(' '));
function keywords(rows, niche) {
  const counts = new Map();
  for (const row of rows) {
    let words;
    try { words = decodeURIComponent(new URL(row.url).pathname).split('/').filter(Boolean).pop().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(w=>w.length>2&&!STOP.has(w)&&!/^\d+$/.test(w)); }
    catch { continue; }
    const phrases = new Set();
    for (let size=2;size<=4;size++) for(let i=0;i+size<=words.length;i++) phrases.add(words.slice(i,i+size).join(' '));
    for(const phrase of phrases){const v=counts.get(phrase)||{keyword:phrase,mentions:0,sites:new Set(),recent:0};v.mentions++;v.sites.add(row.site);if(row.lastmod&&Date.now()-Date.parse(row.lastmod)<30*86400000)v.recent++;counts.set(phrase,v)}
  }
  return [...counts.values()].filter(v=>v.mentions>=2).sort((a,b)=>b.recent-a.recent||b.sites.size-a.sites.size||b.mentions-a.mentions).slice(0,100);
}
export default function Page(){
 const [sites,setSites]=useState(DEFAULT_SITES),[niche,setNiche]=useState('chicken'),[items,setItems]=useState([]),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 async function run(){setBusy(true);setStatus('Analyzing public recipe sitemaps…');setItems([]);try{const res=await fetch('/api/scan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sites:sites.split('\n').map(x=>x.trim()).filter(Boolean),keyword:niche})});const data=await res.json();if(!res.ok)throw Error(data.error||'Request failed');const list=keywords(data.results||[],niche);setItems(list);setStatus(list.length+' keyword candidates found from '+(data.results||[]).length+' article URLs. These are publishing signals, NOT verified Google Trends.')}catch(e){setStatus(e.message)}finally{setBusy(false)}}
 function csv(){const esc=x=>'"'+String(x).replaceAll('"','""')+'"';const lines=[['Keyword','Recent articles (30d)','Mentions','Websites'],...items.map(x=>[x.keyword,x.recent,x.mentions,x.sites.size])].map(a=>a.map(esc).join(',')).join('\r\n');const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([lines],{type:'text/csv'}));link.download='trendhunter-keywords.csv';link.click();URL.revokeObjectURL(link.href)}
 return <main><h1>🔎 TrendHunter AI</h1><p>Recipe keyword discovery — publishing activity signals, not verified search trends.</p><div className="card"><div className="grid"><label>Niche / keyword<input value={niche} onChange={e=>setNiche(e.target.value)} placeholder="chicken, pumpkin, pasta"/></label><label>Recipe sites (one per line)<textarea rows="4" value={sites} onChange={e=>setSites(e.target.value)}/></label></div><p><button disabled={busy} onClick={run}>{busy?'Analyzing…':'Find keywords'}</button></p><p role="status">{status}</p></div><div className="card"><h2>Keyword candidates ({items.length})</h2><p>Sorted by recent article activity. No fabricated search volume or rising percentages.</p>{items.length>0&&<p><button onClick={csv}>Export keywords CSV</button></p>}<table><thead><tr><th>Keyword</th><th>Recent posts (30d)</th><th>Mentions</th><th>Sites</th></tr></thead><tbody>{items.map(x=><tr key={x.keyword}><td>{x.keyword}</td><td>{x.recent}</td><td>{x.mentions}</td><td>{x.sites.size}</td></tr>)}</tbody></table></div></main>
}