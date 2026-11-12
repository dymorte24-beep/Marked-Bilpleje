// Statistik-fanen i admin-panelet. Bruger `db` fra admin-siden (samme login).
// TikTok-tallene fyldes i tiktok_dag/tiktok_videoer af en daglig planlagt opgave (Metricool -> Supabase).
// Google-tallene fyldes i google_dag/google_soegeord af en daglig planlagt opgave (Search Console via Windsor.ai -> Supabase).
let days = 30;
let statLoaded = false;

const fmt = n => (n ?? 0).toLocaleString('da-DK');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dayKey = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth()+1).padStart(2,'0') + '-' + String(x.getDate()).padStart(2,'0'); };
const shortDate = key => { const [y,m,d] = key.split('-'); return `${+d}/${+m}`; };
const METHOD_NAMES = { phone:'Ring', call:'Ring', tel:'Ring', email:'Mail', mail:'Mail', website:'Hjemmeside', sms:'SMS', facebook:'Facebook', instagram:'Instagram', maps:'Rutevejledning', directions:'Rutevejledning' };

// ---------- Data ----------
// Supabase giver højst 1000 rækker ad gangen, så vi henter i bidder.
async function fetchAll(table, cols, since){
  let out = [], from = 0;
  while (true) {
    const { data, error } = await db.from(table).select(cols).gte('created_at', since).order('created_at').range(from, from + 999);
    if (error) throw error;
    out = out.concat(data); if (data.length < 1000) break; from += 1000;
  }
  return out;
}

function dayList(n){
  const list = []; const today = new Date(); today.setHours(12,0,0,0);
  for (let i = n - 1; i >= 0; i--) list.push(dayKey(new Date(today.getTime() - i * 864e5)));
  return list;
}
function perDay(rows, keys, field='created_at'){
  const m = Object.fromEntries(keys.map(k => [k, 0]));
  rows.forEach(r => { const k = dayKey(r[field]); if (k in m) m[k]++; });
  return keys.map(k => ({ key:k, value:m[k] }));
}
function splitPeriods(rows, startCur){
  const cur = [], prev = [];
  rows.forEach(r => (new Date(r.created_at) >= startCur ? cur : prev).push(r));
  return { cur, prev };
}
function delta(cur, prev){
  if (!prev && !cur) return '';
  if (!prev) return `<span class="st-delta up">nyt</span> ift. forrige ${days} dage`;
  const p = Math.round((cur - prev) / prev * 100);
  return `<span class="st-delta ${p >= 0 ? 'up' : 'down'}">${p >= 0 ? '▲' : '▼'} ${Math.abs(p)}%</span> ift. forrige ${days} dage`;
}

async function loadStatistik(){
  document.getElementById('stUpdated').textContent = 'Henter tal…';
  const startCur = new Date(); startCur.setHours(0,0,0,0); startCur.setDate(startCur.getDate() - (days - 1));
  const startPrev = new Date(startCur.getTime() - days * 864e5);
  const sinceIso = startPrev.toISOString();
  try {
    const [views, clicks, searches, shopsRes, tkDays, tkVideos, gDays, gWords, tkPeriod] = await Promise.all([
      fetchAll('profil_visninger', 'butik, created_at', sinceIso),
      fetchAll('butik_klik', 'butik, metode, created_at', sinceIso),
      fetchAll('soegninger', 'by, ydelse, created_at', sinceIso),
      db.from('shops').select('name, city, godkendt, tier, ad_active'),
      db.from('tiktok_dag').select('*').gte('dato', dayKey(startPrev)).order('dato'),
      db.from('tiktok_videoer').select('*').order('udgivet', { ascending:false }).limit(12),
      db.from('google_dag').select('*').gte('dato', dayKey(startPrev)).order('dato'),
      db.from('google_soegeord').select('*').order('visninger', { ascending:false }).limit(15),
      db.from('tiktok_videoer').select('udgivet, visninger').gte('udgivet', sinceIso)
    ]);
    const shops = shopsRes.data || [];
    const isByknap = r => r.ydelse === 'by-knap';
    const V = splitPeriods(views, startCur), C = splitPeriods(clicks, startCur), S = splitPeriods(searches.filter(r => !isByknap(r)), startCur);
    const B = splitPeriods(searches.filter(isByknap), startCur);
    const tk = tkDays.data || [];
    const tkCur = tk.filter(d => d.dato >= dayKey(startCur)), tkPrev = tk.filter(d => d.dato < dayKey(startCur));
    const sum = (a, f) => a.reduce((s, x) => s + (x[f] || 0), 0);
    const lastWith = (a, f) => { for (let i = a.length - 1; i >= 0; i--) if (a[i][f] != null) return a[i][f]; return null; };

    const active = shops.filter(s => s.godkendt);
    const komplet = active.filter(s => s.tier === 'betalt').length;
    const ads = active.filter(s => s.ad_active).length;
    const g = gDays.data || [];
    const gCur = g.filter(d => d.dato >= dayKey(startCur)), gPrev = g.filter(d => d.dato < dayKey(startCur));
    const avgPos = a => { const w = a.filter(d => d.position != null && d.visninger); const v = sum(w, 'visninger'); return v ? w.reduce((s, d) => s + d.position * d.visninger, 0) / v : null; };
    const gPos = avgPos(gCur), gPosPrev = avgPos(gPrev);
    // Metricool giver ikke daglige visninger for TikTok-kontoen (altid 0), men den giver
    // visninger pr. video. Derfor tæller vi visningerne på de videoer, der er lagt op i perioden.
    const tkVids = tkPeriod.data || [];
    const vidCur = tkVids.filter(v => new Date(v.udgivet) >= startCur), vidPrev = tkVids.filter(v => new Date(v.udgivet) < startCur);
    const useVideos = sum(tk, 'visninger') === 0 && tkVids.length > 0;
    const tkViewsCur = useVideos ? sum(vidCur, 'visninger') : sum(tkCur, 'visninger');
    const tkViewsPrev = useVideos ? sum(vidPrev, 'visninger') : sum(tkPrev, 'visninger');
    const followers = lastWith(tk, 'foelgere');
    const followersPrev = lastWith(tkPrev, 'foelgere');

    document.getElementById('tiles').innerHTML = [
      { lbl:'Aktive bilplejere', val:active.length, sub:`${komplet} komplet · ${active.length - komplet} basis · ${ads} annonce${ads === 1 ? '' : 'r'}`, accent:true },
      { lbl:'Profilvisninger', val:V.cur.length, sub:delta(V.cur.length, V.prev.length) },
      { lbl:'Kontaktklik', val:C.cur.length, sub:delta(C.cur.length, C.prev.length) },
      { lbl:'Søgninger', val:S.cur.length, sub:delta(S.cur.length, S.prev.length) },
      { lbl:'Klik på by-knapper', val:B.cur.length, sub:delta(B.cur.length, B.prev.length) || 'Tælles fra i dag' },
      { lbl:'Klik fra Google', val:sum(gCur, 'klik'), sub:g.length ? delta(sum(gCur, 'klik'), sum(gPrev, 'klik')) : 'Venter på første tal' },
      { lbl:'Visninger på Google', val:sum(gCur, 'visninger'), sub:g.length ? delta(sum(gCur, 'visninger'), sum(gPrev, 'visninger')) : 'Venter på første tal' },
      { lbl:'Placering på Google', val:gPos != null ? Math.round(gPos) : '–', sub:gPos != null ? (gPosPrev != null ? `${gPos <= gPosPrev ? '<span class="st-delta up">▲ bedre</span>' : '<span class="st-delta down">▼ dårligere</span>'} end forrige ${days} dage (${Math.round(gPosPrev)})` : 'Gennemsnit. Lavere tal er bedre') : 'Venter på første tal' },
      { lbl:'TikTok-visninger', val:tkViewsCur, sub:(tk.length || tkVids.length) ? (useVideos ? `på ${vidCur.length} videoer lagt op i perioden` : delta(tkViewsCur, tkViewsPrev)) : 'Venter på første tal', accent:true },
      { lbl:'TikTok-følgere', val:followers ?? 0, sub:followersPrev != null && followers != null ? `${followers - followersPrev >= 0 ? '+' : ''}${fmt(followers - followersPrev)} i perioden` : 'I alt', accent:true }
    ].map(t => `<div class="st-tile${t.accent ? ' st-accent' : ''}"><div class="st-lbl">${t.lbl}</div><div class="st-val">${typeof t.val === 'number' ? fmt(t.val) : t.val}</div><div class="st-sub">${t.sub || '&nbsp;'}</div></div>`).join('');

    const keys = dayList(days);
    barChart('chartViews', perDay(V.cur, keys), 'visninger', '#131D2E');
    barChart('chartClicks', perDay(C.cur, keys), 'klik', '#B68B48');
    const tkMap = {};
    if (useVideos) vidCur.forEach(v => { const k = dayKey(v.udgivet); tkMap[k] = (tkMap[k] || 0) + (v.visninger || 0); });
    else tkCur.forEach(d => tkMap[d.dato] = d.visninger || 0);
    barChart('chartTiktok', keys.map(k => ({ key:k, value:tkMap[k] || 0 })), 'visninger', '#131D2E');

    const gMap = Object.fromEntries(gCur.map(d => [d.dato, d.visninger || 0]));
    barChart('chartGoogle', keys.map(k => ({ key:k, value:gMap[k] || 0 })), 'visninger', '#B68B48');

    // Bilplejer-tabel
    const vc = {}, cc = {};
    V.cur.forEach(r => vc[r.butik] = (vc[r.butik] || 0) + 1);
    C.cur.forEach(r => cc[r.butik] = (cc[r.butik] || 0) + 1);
    const rows = active.map(s => ({ name:s.name, city:s.city, v:vc[s.name] || 0, c:cc[s.name] || 0 }))
      .sort((a, b) => b.c - a.c || b.v - a.v || a.name.localeCompare(b.name, 'da'));
    document.getElementById('shopTable').innerHTML = rows.length ? rows.map(r =>
      `<tr><td>${esc(r.name)}</td><td class="hide-sm">${esc(r.city)}</td><td class="st-num">${fmt(r.v)}</td><td class="st-num">${fmt(r.c)}</td><td class="st-num">${r.v ? Math.round(r.c / r.v * 100) + '%' : '–'}</td></tr>`
    ).join('') : '<tr><td colspan="5" class="st-empty">Ingen aktive bilplejere.</td></tr>';

    // Kontaktmetoder
    const mc = {};
    C.cur.forEach(r => { const k = METHOD_NAMES[(r.metode || '').toLowerCase()] || (r.metode ? r.metode : 'Ukendt (før i dag)'); mc[k] = (mc[k] || 0) + 1; });
    hBars('methodBars', mc, 'Ingen kontaktklik i perioden endnu.');

    // Byer
    const bc = {};
    S.cur.forEach(r => { if (!r.by) return; const k = r.by.trim().charAt(0).toUpperCase() + r.by.trim().slice(1).toLowerCase(); bc[k] = (bc[k] || 0) + 1; });
    hBars('cityBars', bc, 'Ingen søgninger endnu. De bliver talt fra i dag.', 8);

    // Populære byer-knapperne på forsiden
    const bk = { 'København':0, 'Aarhus':0, 'Odense':0 };
    B.cur.forEach(r => { if (r.by) bk[r.by] = (bk[r.by] || 0) + 1; });
    if (B.cur.length) hBars('byknapBars', bk, '');
    else document.getElementById('byknapBars').innerHTML = '<div class="st-empty">Ingen klik endnu. De bliver talt fra i dag.</div>';

    // TikTok
    const lastUpd = tk.length ? tk.reduce((m, d) => d.opdateret > m ? d.opdateret : m, tk[0].opdateret) : null;
    document.getElementById('tiktokHint').textContent = lastUpd
      ? `${useVideos ? 'Alle visninger på hver video, vist på den dag videoen blev lagt op. ' : ''}Hentes automatisk fra Metricool hver morgen · sidst ${new Date(lastUpd).toLocaleString('da-DK', { dateStyle:'short', timeStyle:'short' })}`
      : 'Hentes automatisk fra Metricool hver morgen. Første tal kommer, når videoerne har fået visninger.';
    // Google
    const gLast = g.length ? g.reduce((m, d) => d.opdateret > m ? d.opdateret : m, g[0].opdateret) : null;
    document.getElementById('googleHint').textContent = gLast
      ? `Hentes automatisk fra Google Search Console hver morgen (Google er 2-3 dage bagud) · sidst ${new Date(gLast).toLocaleString('da-DK', { dateStyle:'short', timeStyle:'short' })}`
      : 'Hentes automatisk fra Google Search Console hver morgen.';
    const words = gWords.data || [];
    document.getElementById('googleTable').innerHTML = words.length ? words.map(w =>
      `<tr><td>${esc(w.soegeord)}</td><td class="st-num">${fmt(w.visninger)}</td><td class="st-num">${w.position != null ? Math.round(w.position) : '–'}</td></tr>`
    ).join('') : '<tr><td colspan="3" class="st-empty">Ingen søgeord hentet endnu.</td></tr>';

    const vids = tkVideos.data || [];
    document.getElementById('videoTable').innerHTML = vids.length ? vids.map(v =>
      `<tr><td><a href="${esc(v.url)}" target="_blank" rel="noopener">${esc((v.beskrivelse || 'Video').slice(0, 60))}</a></td><td class="hide-sm">${v.udgivet ? new Date(v.udgivet).toLocaleDateString('da-DK') : '–'}</td><td class="st-num">${fmt(v.visninger)}</td><td class="st-num">${fmt(v.likes)}</td><td class="st-num hide-sm">${fmt(v.kommentarer)}</td><td class="st-num hide-sm">${fmt(v.delinger)}</td></tr>`
    ).join('') : '<tr><td colspan="6" class="st-empty">Ingen videoer hentet endnu.</td></tr>';

    document.getElementById('stUpdated').textContent = `Opdateret ${new Date().toLocaleString('da-DK', { dateStyle:'short', timeStyle:'short' })} · viser de sidste ${days} dage`;
  } catch (e) {
    console.error(e);
    document.getElementById('stUpdated').textContent = 'Kunne ikke hente tallene. Prøv at trykke Opdater.';
  }
}

// ---------- Grafer ----------
function barChart(id, data, unit, color){
  const el = document.getElementById(id);
  chartState[id] = [data, unit, color];
  const W = Math.max(280, el.clientWidth || 520), H = 180, padL = 30, padB = 22, padT = 8;
  const max = Math.max(1, ...data.map(d => d.value));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const iw = W - padL, ih = H - padB - padT;
  const bw = iw / data.length, gap = Math.min(2, bw * 0.25);
  const y = v => padT + ih - v / top * ih;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${unit} pr. dag">`;
  for (let v = 0; v <= top; v += step) {
    s += `<line x1="${padL}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="${v ? '#EEEDE9' : '#C9C8C2'}" stroke-width="1"/>`;
    s += `<text x="${padL - 6}" y="${y(v) + 4}" font-size="10" fill="#6B7280" text-anchor="end">${fmt(v)}</text>`;
  }
  const every = Math.ceil(data.length / Math.max(3, Math.floor(W / 80)));
  data.forEach((d, i) => {
    const x = padL + i * bw + gap / 2, w = Math.max(1, bw - gap), h = ih - (y(d.value) - padT);
    if (d.value > 0) {
      const r = Math.min(4, w / 2, h);
      s += `<path d="M${x},${y(0)} V${y(d.value) + r} Q${x},${y(d.value)} ${x + r},${y(d.value)} H${x + w - r} Q${x + w},${y(d.value)} ${x + w},${y(d.value) + r} V${y(0)} Z" fill="${color}"/>`;
    }
    if (i % every === 0 || i === data.length - 1 && data.length <= 8) s += `<text x="${x + w / 2}" y="${H - 6}" font-size="10" fill="#6B7280" text-anchor="middle">${shortDate(d.key)}</text>`;
    s += `<rect class="st-hit" data-i="${i}" x="${padL + i * bw}" y="${padT}" width="${bw}" height="${ih}" fill="transparent"/>`;
  });
  s += '</svg><div class="st-tip"></div>';
  el.innerHTML = s;
  const tip = el.querySelector('.st-tip'), svg = el.querySelector('svg');
  svg.querySelectorAll('.st-hit').forEach(r => {
    r.addEventListener('mouseenter', show); r.addEventListener('touchstart', show, { passive:true });
  });
  svg.addEventListener('mouseleave', () => tip.style.display = 'none');
  function show(e){
    const d = data[+e.target.dataset.i];
    const sc = svg.getBoundingClientRect().width / W;
    tip.innerHTML = `${shortDate(d.key)}: <b>${fmt(d.value)}</b> ${unit}`;
    tip.style.left = ((padL + (+e.target.dataset.i + 0.5) * bw) * sc) + 'px';
    tip.style.top = (y(d.value) * sc) + 'px';
    tip.style.display = 'block';
  }
}
const chartState = {};
let resizeT;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => Object.entries(chartState).forEach(([id, a]) => barChart(id, ...a)), 150); });
function niceStep(max){
  const raw = max / 4, p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p; return Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p);
}
function hBars(id, counts, emptyText, limit = 6){
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit);
  const el = document.getElementById(id);
  if (!entries.length) { el.innerHTML = `<div class="st-empty">${emptyText}</div>`; return; }
  const max = entries[0][1];
  el.innerHTML = entries.map(([k, n]) => `<div class="st-barrow"><div>${esc(k)}</div><div class="st-track"><div class="st-fill" style="width:${n / max * 100}%"></div></div><div class="st-n">${fmt(n)}</div></div>`).join('');
}


// ---------- Faner + periode ----------
document.querySelectorAll('.st-chip[data-days]').forEach(b => b.onclick = () => {
  document.querySelectorAll('.st-chip[data-days]').forEach(x => x.classList.toggle('on', x === b));
  days = +b.dataset.days; loadStatistik();
});
function isStatTab(){ return document.getElementById('tab-stat').style.display !== 'none'; }
function showTab(name){
  document.getElementById('tab-admin').style.display = name === 'stat' ? 'none' : 'block';
  document.getElementById('tab-stat').style.display = name === 'stat' ? 'block' : 'none';
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('on', t.dataset.tab === name));
  localStorage.setItem('adminTab', name);
  if (name === 'stat') { statLoaded = true; loadStatistik(); loadMailliste(); }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && statLoaded && isStatTab()) loadStatistik(); });

// ---- Mailliste (nyhedsbrev til bilejere) ----
let nbRows = [];
const NB_NAVN = { saesontips: 'Sæsontips', tilbud: 'Tilbud' };
async function loadMailliste(){
  const { data, error } = await db.from('nyhedsbrev').select('email, postnummer, interesser, tilmeldt_at, afmeldt_at, afmeld_token').order('tilmeldt_at', { ascending:false });
  const h = document.getElementById('nbOverblik'); if (!h) return;
  if (error){ h.textContent = 'Kunne ikke hente maillisten'; return; }
  nbRows = data || [];
  const aktive = nbRows.filter(r => !r.afmeldt_at);
  const n = k => aktive.filter(r => (r.interesser || []).includes(k)).length;
  h.textContent = `${aktive.length} aktive · ${n('saesontips')} vil have sæsontips · ${n('tilbud')} vil have tilbud · ${nbRows.length - aktive.length} afmeldt`;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
  document.getElementById('nbTable').innerHTML = aktive.slice(0, 50).map(r => `<tr><td>${esc(r.email)}</td><td class="hide-sm">${esc(r.postnummer || '')}</td><td>${(r.interesser || []).map(i => NB_NAVN[i] || i).join(', ')}</td><td class="st-num hide-sm">${new Date(r.tilmeldt_at).toLocaleDateString('da-DK')}</td></tr>`).join('') || '<tr><td colspan="4" style="color:#6B7280;">Ingen tilmeldte endnu</td></tr>';
}
function downloadMailliste(){
  const aktive = nbRows.filter(r => !r.afmeldt_at);
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const lines = ['EMAIL;POSTNUMMER;SAESONTIPS;TILBUD;TILMELDT;AFMELD_LINK'].concat(aktive.map(r => [
    q(r.email), q(r.postnummer || ''), (r.interesser || []).includes('saesontips') ? 'ja' : 'nej', (r.interesser || []).includes('tilbud') ? 'ja' : 'nej',
    q(r.tilmeldt_at), q('https://findbilplejere.dk/afmeld.html?t=' + r.afmeld_token)
  ].join(';')));
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mailliste-findbilplejere.csv'; a.click();
}
