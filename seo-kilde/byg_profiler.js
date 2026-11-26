// Bygger statiske profilsider for alle godkendte bilplejere, så Google kan
// læse navn, ydelser og kontaktinfo direkte i HTML'en (ikke først efter JavaScript).
//
// Kør fra repoets rod:  node seo-kilde/byg_profiler.js
// Kræver Playwright (findes i GitHub Actions-workflowet "Byg statiske SEO-sider").
//
// Sådan virker det: den fælles skabelon bilpleje/profil.html åbnes i en
// browser for hver bilplejer, præcis som en besøgende ser den. Den færdige
// side gemmes som bilpleje/{by}/{navn}/index.html. Skabelonens JavaScript
// kører stadig, når en besøgende åbner siden, så ændringer i databasen vises
// med det samme. Den statiske udgave opdateres ved næste byg.
// Profilvisninger og Google Analytics blokeres under bygget, så tallene ikke
// bliver forkerte.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROD = path.resolve(__dirname, '..');
const DOMÆNE = 'https://findbilplejere.dk';
const SUPABASE_URL = 'https://xeosltdpvkcaudiijtge.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iG0iWu8szH_7-uwErdxN9g_pE9YGFWd'; // offentlig nøgle, samme som js/main.js
const MARKØR = '<!-- statisk profil: bygget af seo-kilde/byg_profiler.js -->';
const LOKAL = 'http://findbilplejere.local';
const TYPER = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

// ---- Afstande (samme regel som js/geo.js: første ord, laveste postnummer) ----
const slug = t => (t || '').trim().split(/\s+/)[0].toLowerCase().replace(/æ/g, 'e').replace(/ø/g, 'o').replace(/å/g, 'a').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const post = new Map();
for (const p of JSON.parse(fs.readFileSync(path.join(ROD, 'data/postnumre.json'), 'utf8'))) {
  const k = slug(p.navn);
  if (k && (!post.has(k) || +p.nr < +post.get(k).nr)) post.set(k, p);
}
function km(a, b) {
  const r = x => x * Math.PI / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}
const esc = t => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ld = o => '<script type="application/ld+json">\n' + JSON.stringify(o, null, 1).replace(/</g, '\\u003c') + '\n</script>\n';

function schema(s, url) {
  const web = s.website ? (/^https?:\/\//.test(s.website) ? s.website : 'https://' + s.website) : null;
  const social = (kind, v) => /^https?:\/\//.test(v) ? v : `https://www.${kind}.com/${v.replace(/^@/, '').replace(/^(www\.)?(instagram|facebook)\.com\//, '')}`;
  const sameAs = [web, s.instagram && social('instagram', s.instagram), s.facebook && social('facebook', s.facebook)].filter(Boolean);
  // Ingen aggregateRating: Google vil kun have bedømmelser indsamlet på siden selv, ikke fra fx Trustpilot.
  const o = {
    '@context': 'https://schema.org', '@type': 'AutomotiveBusiness', name: s.name, url: DOMÆNE + url,
    address: { '@type': 'PostalAddress', ...(s.address ? { streetAddress: s.address } : {}), addressLocality: s.city, addressCountry: 'DK' },
  };
  if (s.phone) o.telephone = s.phone;
  if (s.hero_image_url) o.image = s.hero_image_url;
  if (s.tagline || s.description) o.description = s.tagline || s.description;
  if (s.coverage_areas) o.areaServed = s.coverage_areas;
  if ((s.services || []).length) o.knowsAbout = s.services;
  if (sameAs.length) o.sameAs = sameAs;
  return o;
}

function nærhed(s, alle) {
  const g = post.get(slug(s.city));
  if (!g) return '';
  const andre = alle.filter(x => x.id !== s.id && x.profile_url && post.get(slug(x.city)))
    .map(x => ({ ...x, _km: km(g, post.get(slug(x.city))) }))
    .sort((a, b) => a._km - b._km).slice(0, 3);
  if (!andre.length) return '';
  const links = andre.map(x => `<a href="/${esc(x.profile_url)}">${esc(x.name)} (${esc(x.city)}${x._km >= 3 ? ', ' + x._km + ' km' : ''})</a>`);
  links.push(`<a href="/bilpleje/${esc(s.city_key)}/">Alle bilplejere i ${esc(s.city)}</a>`);
  return `<div class="profile-section"><h2>Andre bilplejere i nærheden</h2><div class="related-links">${links.join('')}</div></div>`;
}

async function main() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/shops?select=*&godkendt=eq.true&order=name`, { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } });
  if (!res.ok) throw new Error('Kunne ikke hente bilplejere: ' + res.status);
  const shops = (await res.json()).filter(s => s.profile_url);
  const skabelon = fs.readFileSync(path.join(ROD, 'bilpleje/profil.html'));

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route('**/*', async route => {
    const req = route.request();
    const u = new URL(req.url());
    if (/googletagmanager|google-analytics|doubleclick/.test(u.host)) return route.abort();
    if (u.host.endsWith('supabase.co') && req.method() !== 'GET' && req.method() !== 'OPTIONS') return route.fulfill({ status: 201, body: '' }); // ingen falske profilvisninger
    if (u.origin !== LOKAL) return route.continue();
    let fil = path.join(ROD, decodeURIComponent(u.pathname));
    if (/^\/bilpleje\/[^/]+\/[^/]+\/?$/.test(u.pathname)) return route.fulfill({ status: 200, contentType: TYPER['.html'], body: skabelon });
    if (fs.existsSync(fil) && fs.statSync(fil).isDirectory()) fil = path.join(fil, 'index.html');
    if (!fs.existsSync(fil)) return route.fulfill({ status: 404, body: '' });
    route.fulfill({ status: 200, contentType: TYPER[path.extname(fil)] || 'application/octet-stream', body: fs.readFileSync(fil) });
  });

  const lavet = new Set();
  for (const s of shops) {
    const url = '/' + s.profile_url.replace(/^\/+/, '').replace(/\/?$/, '/');
    await page.goto(LOKAL + url, { waitUntil: 'networkidle' });
    await page.waitForSelector('#shopContent h1.pf-name', { timeout: 20000 });
    await page.evaluate(html => { document.getElementById('naerhed').innerHTML = html; }, nærhed(s, shops));
    let html = '<!DOCTYPE html>\n' + await page.evaluate(() => document.documentElement.outerHTML);
    const titel = `${s.name} – bilpleje i ${s.city} | FindBilplejere.dk`;
    const beskr = (s.tagline || `${s.name} tilbyder ${(s.services || []).slice(0, 3).join(', ').toLowerCase()} i ${s.city}. Se ydelser og kontakt dem direkte.`).slice(0, 300);
    html = html
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(titel)}</title>`)
      .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(beskr)}"`)
      .replace('</head>',
        `<link rel="canonical" href="${DOMÆNE}${url}">\n<meta property="og:title" content="${esc(s.name)}">\n<meta property="og:description" content="${esc(beskr)}">\n<meta property="og:url" content="${DOMÆNE}${url}">\n<meta property="og:type" content="website">\n${ld(schema(s, url))}</head>`)
      .replace('<html lang="da">', '<html lang="da">\n' + MARKØR);
    const ud = path.join(ROD, url, 'index.html');
    fs.mkdirSync(path.dirname(ud), { recursive: true });
    fs.writeFileSync(ud, html);
    lavet.add(path.resolve(ud));
    console.log('skrev', url);
  }
  await browser.close();

  // Slet statiske profiler for bilplejere, der ikke længere er godkendt.
  for (const by of fs.readdirSync(path.join(ROD, 'bilpleje'))) {
    const d = path.join(ROD, 'bilpleje', by);
    if (!fs.statSync(d).isDirectory()) continue;
    for (const navn of fs.readdirSync(d)) {
      const f = path.join(d, navn, 'index.html');
      if (fs.existsSync(f) && !lavet.has(path.resolve(f)) && fs.readFileSync(f, 'utf8').includes(MARKØR)) {
        fs.rmSync(path.join(d, navn), { recursive: true });
        console.log('slettede', path.relative(ROD, path.join(d, navn)));
      }
    }
  }
  fs.writeFileSync(path.join(ROD, 'seo-kilde/profiler.json'), JSON.stringify([...shops].map(s => '/' + s.profile_url.replace(/^\/+/, '').replace(/\/?$/, '/')).sort(), null, 1) + '\n');
}
main().catch(e => { console.error(e); process.exit(1); });
