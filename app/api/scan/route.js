import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
const approved = new Set(['mealrivo.com', 'besteverrecipes.com', 'luncheanddinner.com', 'allrecipes.com', 'simplyrecipes.com', 'budgetbytes.com', 'sallysbakingaddiction.com', 'skinnytaste.com', 'thepioneerwoman.com', 'delish.com', 'wellplated.com', 'recipetineats.com', 'loveandlemons.com', 'minimalistbaker.com']);
const allowedHost = (host) => approved.has(host.replace(/^www\./, ''));

function elements(xml, tag) {
  const expression = new RegExp('<(?:[a-zA-Z0-9_-]+:)?' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?' + tag + '>', 'gi');
  return Array.from(xml.matchAll(expression), (match) => match[1].trim().replaceAll('&amp;', '&'));
}

async function getSitemap(address) {
  const url = new URL(address);
  if (url.protocol !== 'https:' || !allowedHost(url.hostname)) throw new Error('Domain not approved');
  const response = await fetch(url.toString(), {
    redirect: 'error',
    signal: AbortSignal.timeout(7000),
    headers: { 'user-agent': 'TrendHunterAI/0.1 sitemap discovery' }
  });
  if (!response.ok) throw new Error('Sitemap HTTP ' + response.status);
  const xml = await response.text();
  if (xml.length > 2000000) throw new Error('Sitemap too large');
  return xml;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const keyword = String(body.keyword || '').trim().toLowerCase().slice(0, 100);
    if (!keyword) return NextResponse.json({ error: 'Keyword required' }, { status: 400 });
    const sites = Array.isArray(body.sites) ? body.sites.slice(0, 10) : [];
    const results = [];
    for (const site of sites) {
      try {
        const base = new URL(site);
        if (base.protocol !== 'https:' || !allowedHost(base.hostname)) continue;
        const queue = ['/sitemap_index.xml', '/wp-sitemap.xml', '/sitemap.xml'].map((p) => base.origin + p);
        const visited = new Set();
        while (queue.length && visited.size < 12) {
          const sitemap = queue.shift();
          if (visited.has(sitemap)) continue;
          visited.add(sitemap);
          let xml;
          try { xml = await getSitemap(sitemap); } catch { continue; }
          if (/<sitemapindex\b/i.test(xml)) {
            for (const loc of elements(xml, 'loc').slice(0, 15)) {
              try {
                const target = new URL(loc);
                if (target.origin === base.origin) queue.push(target.href);
              } catch {}
            }
          } else {
            const blocks = xml.match(/<url(?:\s[^>]*)?>[\s\S]*?<\/url>/gi) || [];
            for (const block of blocks) {
              const loc = elements(block, 'loc')[0];
              if (!loc) continue;
              try {
                const target = new URL(loc);
                if (target.origin !== base.origin || !decodeURIComponent(target.pathname).toLowerCase().replace(/[-_]+/g, ' ').includes(keyword.replace(/[-_]+/g, ' '))) continue;
                results.push({ site: base.hostname, url: target.href, lastmod: elements(block, 'lastmod')[0] || '' });
              } catch {}
            }
          }
        }
      } catch {}
    }
    const unique = Array.from(new Map(results.map((row) => [row.url, row])).values());
    unique.sort((a, b) => b.lastmod.localeCompare(a.lastmod));
    return NextResponse.json({ results: unique.slice(0, 500) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Scan failed' }, { status: 400 });
  }
}
