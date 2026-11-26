// Stamkunde-appen · findbilplejere.dk/app/
// Bilplejeren logger ind med samme konto som butik-panelet. Data ligger i Supabase (sk_*-tabellerne).
// SMS sendes af edge-funktionen "stamkunde-send" (hvert 5. min). Appen planlægger kun beskederne.
const SUPABASE_URL = 'https://xeosltdpvkcaudiijtge.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iG0iWu8szH_7-uwErdxN9g_pE9YGFWd';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

const I = {
  dag: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  kal: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  kunder: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2.4.6 4 2.3 4 5.2"/></svg>',
  stat: '<svg viewBox="0 0 24 24"><path d="M5 20v-8M12 20V5M19 20v-5"/></svg>',
  auto: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/></svg>'
};
const S = {
  user: null, admin: false, shops: [], shop: null, tab: 'dag',
  ind: null, kunder: [], job: [], beskeder: [], paa: [], aft: [], kalSpringLokal: false,
  nyJob: { navn: '', tlf: '', beh: '', ja: false }
};

// ---------- små hjælpere ----------
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ini = n => esc(((n || '').trim().split(/\s+/).filter(x => /^\p{L}/u.test(x)).slice(0, 2).map(x => x[0]).join('') || '?').toUpperCase());
const fornavn = n => (n || '').trim().split(/\s+/)[0] || '';
const tlf8 = s => String(s || '').replace(/\D/g, '').slice(-8);
const visTlf = s => (s || '').replace(/(\d{2})(?=\d)/g, '$1 ').trim();
const TZ = 'Europe/Copenhagen';
const dagKey = d => new Date(d).toLocaleDateString('sv-SE', { timeZone: TZ });
const idag = () => dagKey(new Date());
const kl = d => new Date(d).toLocaleTimeString('da-DK', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const dato = d => new Date(d).toLocaleDateString('da-DK', { timeZone: TZ, day: 'numeric', month: 'short' });
function naar(d) {
  const k = dagKey(d), t = idag();
  const imorgen = dagKey(Date.now() + 864e5), igaar = dagKey(Date.now() - 864e5);
  if (k === t) return 'i dag kl. ' + kl(d);
  if (k === imorgen) return 'i morgen kl. ' + kl(d);
  if (k === igaar) return 'i går kl. ' + kl(d);
  return dato(d) + (new Date(d).getFullYear() !== new Date().getFullYear() ? ' ' + new Date(d).getFullYear() : '') + ' kl. ' + kl(d);
}
function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('show'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('show'), 2600); }
function sheet(h) { $('sheet').innerHTML = '<div class="shead"><div class="grab"></div><button class="luk" onclick="luk()" aria-label="Luk"><svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg></button></div>' + h; $('ov').classList.add('show'); $('sheet').scrollTop = 0; $('sheet').style.transform = ''; }
// Træk arket ned for at lukke det (som på iPhone)
(() => { let y0 = null, dy = 0; const el = () => $('sheet');
  document.addEventListener('touchstart', e => { if (!$('ov').classList.contains('show') || !el().contains(e.target) || el().scrollTop > 0) return; y0 = e.touches[0].clientY; dy = 0; }, { passive: true });
  document.addEventListener('touchmove', e => { if (y0 === null) return; dy = e.touches[0].clientY - y0; if (dy > 0) el().style.transform = `translateY(${dy}px)`; }, { passive: true });
  document.addEventListener('touchend', () => { if (y0 === null) return; y0 = null; if (dy > 90) luk(); el().style.transform = ''; }); })();
function luk() { $('ov').classList.remove('show'); }
$('ov').onclick = e => { if (e.target.id === 'ov') luk(); };

const STATUS = {
  planlagt: ['Planlagt', 'p-g'], sender: ['Sendes nu', 'p-g'], sendt: ['Sendt', 'p-b'],
  test_sendt: ['Sendt til test', 'p-n'], simuleret: ['Ikke sendt (prøve)', 'p-n'],
  fejl: ['Fejl', 'p-r'], annulleret: ['Annulleret', 'p-r'], sprunget_over: ['Sprunget over', 'p-n']
};
const TYPE = { tak: '⭐ Tak + anmeldelse', paamindelse: '🔁 Påmindelse', annonce: '📣 Annonce', test: '🧪 Test-SMS' };
// Hvornår tak-SMS'en bliver sendt. Samme regel som databasen (sk_tak_tidspunkt): næste dag kl. 10 (aldrig søndag) eller samme aften kl. 18:30
function takTidspunkt(slut) {
  let [d, t] = new Date(slut).toLocaleString('sv-SE', { timeZone: TZ }).split(' ');
  const plus = (ds, n) => new Date(Date.parse(ds + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  let k;
  if (S.ind.tak_tid === 'samme_aften_1830' && t < '18:00') k = '18.30'; else { d = plus(d, 1); k = '10.00'; }
  if (new Date(d + 'T12:00:00Z').getUTCDay() === 0) { d = plus(d, 1); k = '10.00'; }
  return dagNavn(d) + ' kl. ' + k;
}
function dagNavn(d) {
  if (d === idag()) return 'i dag';
  if (d === dagKey(Date.now() + 864e5)) return 'i morgen';
  return new Date(d + 'T12:00:00Z').toLocaleDateString('da-DK', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'short' });
}
const senesteTak = kid => S.beskeder.filter(b => b.kunde_id === kid && b.type === 'tak' && !['annulleret', 'sprunget_over'].includes(b.status) && new Date(b.planlagt_til) > Date.now() - 30 * 864e5).sort((a, b) => new Date(b.planlagt_til) - new Date(a.planlagt_til))[0];
// Én linje om tak-SMS'en for en besked: [tekst, farve]
function takLinje(b) {
  const n = naar(b.sendt_at || b.planlagt_til);
  if (b.status === 'planlagt' || b.status === 'sender') return ['Tak-SMS ' + n, 'c-gold'];
  if (b.status === 'sendt') return ['✓ Tak-SMS sendt ' + n, 'c-green'];
  if (b.status === 'test_sendt' || b.status === 'simuleret') return ['✓ Tak-SMS sendt ' + n + ' (test)', 'c-blue'];
  return ['Tak-SMS: ' + (STATUS[b.status] || [b.status])[0].toLowerCase(), 'c-red'];
}
const TYPE_NAVN = { tak: 'Tak + anmeldelse', paamindelse: 'Påmindelse', annonce: 'Annonce', test: 'Test' };
// Teksten i en SMS: den rigtige hvis den er sendt, ellers sådan den kommer til at se ud
function smsTekst(b) {
  if (b.type === 'annonce' && b.status === 'planlagt') return annonceEksempel(b.tekst);
  if (b.tekst) return b.tekst;
  const k = kunde(b.kunde_id) || {}, j = S.job.find(x => x.id === b.job_id) || {};
  if (b.type === 'paamindelse') { const mdr = Math.max(1, Math.round((new Date(b.planlagt_til) - new Date(j.udfoert_at || Date.now())) / (30.44 * 864e5))); return paaEksempel(k.navn, j.behandling, mdr); }
  return takEksempel(k.navn);
}
function visSms(id) {
  const b = S.beskeder.find(x => x.id === id); if (!b) return;
  const k = kunde(b.kunde_id) || {};
  sheet(`<h3>${TYPE_NAVN[b.type] || b.type}</h3><div class="sub">Til ${esc(k.navn || 'kunde')} · ${esc(naar(b.sendt_at || b.planlagt_til))} · ${statusTag(b)}</div>
  <div class="sec">${b.tekst ? 'Det fik kunden' : 'Sådan kommer den til at se ud'}</div>
  <div class="box"><div class="bubble">${esc(smsTekst(b))}</div></div>
  ${b.type === 'annonce' && !k.ja_tak ? '<div class="foot">Tilbud bliver kun sendt til kunder, der har sagt ja tak.</div>' : ''}
  ${k.id ? `<div class="grp" style="margin-top:22px">${R({ on: `kundeSheet('${b.kunde_id}')`, pre: ic('person', 'var(--gray)'), t: 'Se ' + esc(k.navn || 'kunden') })}</div>` : ''}`);
}
const statusTag = b => { const s = STATUS[b.status] || [b.status, 'p-n']; return pl(s[0], s[1]); };
// ---------- login ----------
async function start() {
  const { data } = await db.auth.getSession();
  await brugSession(data.session);
  db.auth.onAuthStateChange((_e, session) => { if (!session && S.user) { S.user = null; render(); } });
}
async function brugSession(session) {
  if (!session) { S.user = null; return render(); }
  S.user = session.user;
  S.admin = (session.user.email || '').toLowerCase() === 'dymorte24@gmail.com';
  let q = db.from('shops').select('id,name,city,contact_person,phone,services,owner_id,review_url').order('name');
  if (!S.admin) q = q.eq('owner_id', session.user.id);
  const { data, error } = await q;
  if (error) { toast('Kunne ikke hente din butik'); console.error(error); }
  S.shops = data || [];
  const gemt = localStorage.getItem('sk_shop');
  S.shop = S.shops.find(s => s.id === gemt) || (S.shops.length === 1 ? S.shops[0] : null);
  if (S.shop) await hentAlt(); else render();
}
async function login() {
  const email = $('le').value.trim(), pw = $('lp').value;
  $('lerr').textContent = '';
  if (!email || !pw) { $('lerr').textContent = 'Skriv mail og adgangskode'; return; }
  const { data, error } = await db.auth.signInWithPassword({ email, password: pw });
  if (error) { $('lerr').textContent = 'Forkert mail eller adgangskode'; return; }
  await brugSession(data.session);
}
async function glemt() {
  const email = $('le').value.trim();
  if (!email) { $('lerr').textContent = 'Skriv din mail først, så sender vi et link'; return; }
  await db.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/app/' });
  $('lerr').textContent = 'Hvis mailen findes, har vi sendt et link til ny adgangskode.';
}
async function logud() { await db.auth.signOut(); localStorage.removeItem('sk_shop'); S.user = null; S.shop = null; render(); }
function vaelgShop(id) { S.kalSpringLokal = false; S.kalVis = false; S.shop = S.shops.find(s => s.id === id); localStorage.setItem('sk_shop', id); hentAlt(); }

// ---------- data ----------
async function hentAlt() {
  const id = S.shop.id;
  const fra = new Date(Date.now() - 62 * 864e5).toISOString();
  const aftFra = new Date(Date.now() - 2 * 864e5).toISOString(), aftTil = new Date(Date.now() + 15 * 864e5).toISOString();
  const [ind, k, j, b, p, a] = await Promise.all([
    db.from('sk_indstillinger').select('*').eq('shop_id', id).maybeSingle(),
    db.from('sk_kunder').select('*').eq('shop_id', id).order('oprettet_at', { ascending: false }),
    db.from('sk_job').select('*').eq('shop_id', id).gte('udfoert_at', fra).order('udfoert_at', { ascending: false }),
    db.from('sk_beskeder').select('*').eq('shop_id', id).or(`planlagt_til.gte.${fra},status.eq.planlagt`).order('planlagt_til', { ascending: false }).limit(500),
    db.from('sk_paamindelser').select('*').eq('shop_id', id).order('oprettet_at'),
    db.from('sk_aftaler').select('*').eq('shop_id', id).gte('slut_at', aftFra).lte('start_at', aftTil).order('start_at')
  ]);
  const fejl = [ind, k, j, b, p, a].find(r => r.error);
  if (fejl) { console.error(fejl.error); toast('Kunne ikke hente data'); }
  S.ind = ind.data || { shop_id: id, aktiv: false, google_link: '', anmeld_sted: 'google', trustpilot_link: '', afsender: '', tak_tid: 'naeste_dag_10', testtilstand: true, testnummer: '', ny: true };
  S.sidstHentet = Date.now();
  S.kunder = k.data || []; S.job = j.data || []; S.beskeder = b.data || []; S.paa = p.data || []; S.aft = a.data || [];
  render();
}
const kunde = id => S.kunder.find(k => k.id === id);

// ---------- I dag ----------
function dag() {
  const ind = S.ind;
  const dagTxt = new Date().toLocaleDateString('da-DK', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
  const rows = [];
  S.aft.filter(a => dagKey(a.start_at) === idag() && a.status !== 'aflyst').forEach(a => rows.push({ t: a.start_at, slut: a.slut_at, navn: a.navn || a.titel || 'Aftale', beh: a.behandling, sms: aftaleSms(a), on: `aftaleSheet('${a.id}')` }));
  const aftTlf = new Set(S.aft.filter(a => dagKey(a.start_at) === idag() && a.telefon).map(a => a.telefon));
  S.job.filter(j => dagKey(j.udfoert_at) === idag() && !j.aftale_id).forEach(j => { const k = kunde(j.kunde_id) || {}; if (aftTlf.has(k.telefon)) return; const b = S.beskeder.find(x => x.job_id === j.id && x.type === 'tak'); const n = !b && senesteTak(j.kunde_id);
    rows.push({ t: j.udfoert_at, navn: k.navn, beh: j.behandling, sms: k.stop ? ['Ingen SMS (stoppet)', 'c-red'] : b ? takLinje(b) : n && n.status === 'planlagt' ? takLinje(n) : ['Ingen ny tak-SMS (fik en for nylig)', 'c-blue'], on: `kundeSheet('${j.kunde_id}')` }); });
  rows.sort((a, b) => new Date(a.t) - new Date(b.t));
  const planl = S.beskeder.filter(b => b.status === 'planlagt').sort((a, b) => new Date(a.planlagt_til) - new Date(b.planlagt_til));
  let st;
  if (!ind.aktiv) st = ['stop', 'var(--red)', 'SMS er slået fra', 'Tryk her og slå det til under Automatik'];
  else if (ind.kalender_fejl) st = ['cal', 'var(--orange)', 'Kalenderen kunne ikke hentes', esc(ind.kalender_fejl)];
  else if (ind.testtilstand) st = ['flask', 'var(--orange)', 'Testtilstand er slået til', 'Alle SMS går til dit eget nummer'];
  else st = ['check', 'var(--green)', 'Alt kører af sig selv', [ind.kalender_url && ind.kalender_sidst ? 'Kalender hentet ' + esc(naar(ind.kalender_sidst)) : '', planl.length ? planl.length + ' SMS på vej' : 'Ingen SMS på vej lige nu'].filter(Boolean).join(' · ')];
  return `${bar('<button class="act" onclick="jobSheet()">+ Job færdig</button>')}
  <h1>I dag</h1><div class="sub1">${esc(dagTxt[0].toUpperCase() + dagTxt.slice(1))}</div>
  <div class="hero" onclick="S.tab='auto';render()">${ic(st[0], st[1])}<div><b>${st[2]}</b><span>${st[3]}</span></div></div>
  <div class="sec" style="display:flex;justify-content:space-between;align-items:center">Kommer i dag${ind.kalender_url ? '<button class="lnk" style="font-size:13px;text-transform:none;background:none;border:0;color:var(--navy)" onclick="synkNu()">Opdatér</button>' : ''}</div>
  <div class="grp">${rows.length ? rows.map(r => R({ on: r.on, pre: `<div class="tm">${kl(r.t)}${r.slut ? `<small>${kl(r.slut)}</small>` : ''}</div>`, t: `<div class="streg" style="${r.sms[1] === 'c-blue' ? 'border-color:#C7C7CC' : r.sms[1] === 'c-red' ? 'border-color:var(--red)' : ''}">${esc(r.navn || 'Kunde')}${r.beh ? `<small>${esc(r.beh)}</small>` : ''}<div class="pl ${PILLE[r.sms[1]] || 'p-n'}" style="margin-top:7px">${esc(r.sms[0])}</div></div>` })).join('')
    : `<div class="empty">Ingen kunder i dag.${ind.kalender_url ? '' : ' Tryk på "+ Job færdig", når du er færdig med en bil.'}</div>`}</div>
  ${planl.length ? `<div class="sec">Næste automatiske SMS</div><div class="grp">${planl.slice(0, 3).map(b => R({ on: `visSms('${b.id}')`, pre: typeIc(b.type), t: TYPE_NAVN[b.type] || b.type, s: `${esc((kunde(b.kunde_id) || {}).navn || 'Kunde')} · ${esc(naar(b.planlagt_til))}` })).join('')}
   ${planl.length > 3 ? R({ on: 'naesteSheet()', t: `<span style="color:var(--navy)">Se alle ${planl.length}</span>` }) : ''}</div>` : ''}`;
}
function naesteSheet() {
  const l = S.beskeder.filter(b => b.status === 'planlagt').sort((a, b) => new Date(a.planlagt_til) - new Date(b.planlagt_til)).slice(0, 40);
  sheet(`<h3>Planlagte SMS</h3><div class="sub">Appen sender dem selv. Tryk for at se teksten.</div>
  <div class="grp" style="margin-top:16px">${l.map(b => R({ on: `visSms('${b.id}')`, pre: typeIc(b.type), t: esc((kunde(b.kunde_id) || {}).navn || 'Kunde'), s: `${TYPE_NAVN[b.type] || b.type} · ${esc(naar(b.planlagt_til))}` })).join('')}</div>`);
}
function jobSheet() {
  const J = S.nyJob;
  const forslag = [...new Set([...(S.shop.services || []), ...S.paa.map(p => p.behandling)])].slice(0, 8);
  sheet(`<h3>Job færdig</h3><div class="sub">Kunden får tak-SMS ${S.ind.tak_tid === 'samme_aften_1830' ? 'i aften kl. 18.30' : 'i morgen kl. 10'}.</div>
  <div class="lbl">Kundens navn</div><input class="f" id="jn" value="${esc(J.navn)}" placeholder="Fx Mette Hansen" autocomplete="off" oninput="S.nyJob.navn=this.value">
  <div class="lbl">Mobilnummer</div><input class="f" id="jt" value="${esc(J.tlf)}" placeholder="8 cifre" inputmode="tel" autocomplete="off" oninput="S.nyJob.tlf=this.value;findKunde()">
  <div class="hint" id="jkendt"></div>
  <div class="lbl">Behandling</div><input class="f" id="jb" value="${esc(J.beh)}" placeholder="Fx Coating" oninput="S.nyJob.beh=this.value">
  <div class="chips">${forslag.map(x => `<button class="chip2" onclick="S.nyJob.beh=this.textContent;$('jb').value=this.textContent">${esc(x)}</button>`).join('')}</div>
  <div class="grp" style="margin-top:20px">${R({ pre: ic('mega', 'var(--purple)'), t: 'Ja tak til tilbud', s: 'Kunden må få dine tilbud på SMS', r: `<span class="sw ${J.ja ? 'on' : ''}" id="jja" onclick="S.nyJob.ja=!S.nyJob.ja;this.classList.toggle('on')"></span>` })}</div>
  <div class="err" id="jerr"></div>
  <button class="btn" style="margin-top:6px" id="jgem" onclick="gemJob()">Gem job</button>`);
  findKunde();
}
function findKunde() {
  const t = tlf8(S.nyJob.tlf), e = $('jkendt'); if (!e) return;
  const k = t.length === 8 && S.kunder.find(x => x.telefon === t);
  e.textContent = k ? `Kendt kunde: ${k.navn}${k.ja_tak ? ' · ja tak til tilbud' : ''}${k.stop ? ' · STOPPET (får ingen SMS)' : ''}` : '';
  if (k && !$('jn').value) { $('jn').value = k.navn; S.nyJob.navn = k.navn; }
}
async function gemJob() {
  const J = S.nyJob, t = tlf8(J.tlf), navn = J.navn.trim(), beh = J.beh.trim();
  const err = m => { $('jerr').textContent = m; };
  if (!navn) return err('Skriv kundens navn');
  if (!/^[2-9]\d{7}$/.test(t)) return err('Mobilnummeret skal have 8 cifre');
  if (!beh) return err('Skriv hvilken behandling');
  $('jgem').disabled = true;
  try {
    let k = S.kunder.find(x => x.telefon === t);
    if (!k) {
      const r = await db.from('sk_kunder').insert({ shop_id: S.shop.id, navn, telefon: t, ja_tak: J.ja }).select().single();
      if (r.error) throw r.error; k = r.data;
    } else if ((J.ja && !k.ja_tak) || k.navn !== navn) {
      const r = await db.from('sk_kunder').update({ navn, ja_tak: k.ja_tak || J.ja }).eq('id', k.id).select().single();
      if (r.error) throw r.error; k = r.data;
    }
    const r2 = await db.from('sk_job').insert({ shop_id: S.shop.id, kunde_id: k.id, behandling: beh }).select().single();
    if (r2.error) throw r2.error;
    S.nyJob = { navn: '', tlf: '', beh: '', ja: false };
    luk(); await hentAlt();
    const b = S.beskeder.find(x => x.job_id === r2.data.id && x.type === 'tak');
    toast(k.stop ? 'Gemt ✓ Kunden er stoppet, så ingen SMS' : b ? `Gemt ✓ Tak-SMS ${naar(b.planlagt_til)}` : 'Gemt ✓ (fik tak-SMS for nylig)');
  } catch (e) { console.error(e); err(e.message || 'Kunne ikke gemme'); $('jgem').disabled = false; }
}


// ---------- Kalender ----------
const AFT = {
  venter: ['Tak-SMS efter aftalen', 't-gold'], job: ['Tak-SMS planlagt', 't-green'], mangler_nummer: ['Mangler nummer', 't-red'],
  sprunget_over: ['Ingen SMS', 't-blue'], aflyst: ['Aflyst', 't-blue']
};
function aftaleSms(a) {
  if (a.status === 'aflyst') return ['Aflyst', 'c-blue'];
  if (a.status === 'sprunget_over') return ['Ingen SMS', 'c-blue'];
  if (a.status === 'mangler_nummer' || !a.telefon) return ['Mangler nummer, tryk her', 'c-red'];
  const k = S.kunder.find(x => x.telefon === a.telefon);
  if (k && k.stop) return ['Ingen SMS (stoppet)', 'c-red'];
  if (a.status === 'job') { const b = S.beskeder.find(x => x.job_id === a.job_id && x.type === 'tak'); if (b) return takLinje(b); }
  const nylig = k && senesteTak(k.id);
  if (nylig) return nylig.status === 'planlagt' ? takLinje(nylig) : ['Ingen ny tak-SMS (fik en for nylig)', 'c-blue'];
  return ['Tak-SMS ' + takTidspunkt(a.slut_at), 'c-gold'];
}
function aftaleSheet(id) {
  const a = S.aft.find(x => x.id === id); if (!a) return;
  const laast = ['job'].includes(a.status);
  sheet(`<h3>${esc(a.titel || 'Aftale')}</h3><div class="sub">${esc(naar(a.start_at))} til ${kl(a.slut_at)}</div>
  ${laast ? `<div class="banner" style="margin-top:16px">Aftalen er slut, og tak-SMS'en er planlagt. Du kan stoppe den under kunden.</div>` : `
  <div class="lbl">Kundens navn</div><input class="f" id="an" value="${esc(a.navn || '')}" placeholder="Fx Mette Hansen">
  <div class="lbl">Mobilnummer</div><input class="f" id="at" value="${esc(a.telefon || '')}" placeholder="8 cifre" inputmode="tel">
  <div class="lbl">Behandling</div><input class="f" id="ab" value="${esc(a.behandling || '')}" placeholder="Fx Coating">
  <div class="err" id="aerr"></div>
  <button class="btn" style="margin-top:6px" onclick="gemAftale('${id}')">Gem</button>
  ${a.status !== 'sprunget_over' ? `<button class="btn dark" style="margin-top:10px" onclick="springAftale('${id}', true)">Send ingen SMS for denne aftale</button>` : `<button class="btn dark" style="margin-top:10px" onclick="springAftale('${id}', false)">Send alligevel tak-SMS</button>`}`}`);
}
async function gemAftale(id) {
  const a = S.aft.find(x => x.id === id), t = tlf8($('at').value), navn = $('an').value.trim(), beh = $('ab').value.trim();
  if (t && !/^[2-9]\d{7}$/.test(t)) { $('aerr').textContent = 'Mobilnummeret skal have 8 cifre'; return; }
  const status = a.status === 'sprunget_over' ? 'sprunget_over' : t ? 'venter' : 'mangler_nummer';
  const { error } = await db.from('sk_aftaler').update({ navn: navn || null, telefon: t || null, behandling: beh || null, rettet: true, status }).eq('id', id);
  if (error) return toast('Kunne ikke gemme');
  luk(); await hentAlt();
  toast(status === 'venter' ? (new Date(a.slut_at) <= new Date() ? 'Gemt ✓ Tak-SMS planlægges om lidt' : 'Gemt ✓ Tak-SMS efter aftalen') : 'Gemt ✓');
}
async function springAftale(id, spring) {
  const a = S.aft.find(x => x.id === id);
  const { error } = await db.from('sk_aftaler').update({ status: spring ? 'sprunget_over' : (a.telefon ? 'venter' : 'mangler_nummer'), rettet: true }).eq('id', id);
  if (error) return toast('Kunne ikke gemme');
  luk(); await hentAlt(); toast(spring ? 'OK, ingen SMS for den aftale' : 'Tak-SMS sendes alligevel');
}
async function synkNu() {
  toast('Henter kalender…');
  const { data, error } = await db.functions.invoke('stamkunde-send', { body: { action: 'kalender_synk', shop_id: S.shop.id } });
  if (error) { let m = 'Kunne ikke hente kalenderen'; try { m = (await error.context.json()).fejl || m; } catch (_) {} toast(m); return hentAlt(); }
  await hentAlt(); toast(data.fejl ? data.fejl : `Opdateret ✓ ${data.aftaler} aftaler`);
}

const KAL = {
  google: { navn: 'Google Kalender', trin: [
    'Åbn <b>calendar.google.com</b> i browseren. På mobilen: vælg "Websted til computer" (Safari: tryk <b>Aa</b>, Chrome: tryk <b>⋮</b>).',
    'Tryk på tandhjulet ⚙️ → <b>Indstillinger</b> → vælg din kalender i venstre side under "Indstillinger for mine kalendere".',
    'Rul ned til <b>Hemmelig adresse i iCal-format</b> og kopiér linket.'] },
  icloud: { navn: 'iPhone-kalender', trin: [
    'Åbn <b>Kalender</b>-appen og tryk på <b>Kalendere</b> nederst.',
    'Tryk på <b>ⓘ</b> ud for den kalender, du bruger til kunder.',
    'Slå <b>Offentlig kalender</b> til, tryk <b>Del link…</b> og vælg <b>Kopiér</b>.'] },
  outlook: { navn: 'Outlook', trin: [
    'Åbn <b>outlook.com</b> i browseren → tandhjulet ⚙️ → <b>Kalender</b> → <b>Delte kalendere</b>.',
    'Under "Udgiv en kalender": vælg din kalender og <b>Kan se alle detaljer</b> → <b>Udgiv</b>.',
    'Kopiér <b>ICS</b>-linket.'] },
  andet: { navn: 'Bookingsystem', trin: [
    'Gå til indstillingerne i dit bookingsystem og find <b>iCal</b>, <b>ICS</b>, "Kalender-synkronisering" eller "Abonnér på kalender".',
    'Kopiér linket (det ender tit på <b>.ics</b>).',
    'Kan du ikke finde det, så skriv navnet på systemet til Daniel, så hjælper han.'] }
};
let K = { type: '', url: '', test: null, tjekker: false };
function kalenderSide() {
  const valgt = KAL[K.type];
  return `${bar(S.ind.kalender_url ? tilbage('Tilbage', 'S.kalVis=false;render()') : '')}
  <h1>Kobl din kalender på</h1><div class="sub1">Så sender appen selv tak-SMS'en, når en aftale er slut. Du skal ikke skrive kunderne ind.</div>
  <div class="wrap">
  <div class="lbl" style="margin-top:22px">Hvor ligger dine aftaler?</div>
  <div class="chips" style="margin-top:4px">${Object.entries(KAL).map(([k, v]) => `<button class="chip2 ${K.type === k ? 'on' : ''}" onclick="K.type='${k}';K.test=null;render()">${v.navn}</button>`).join('')}</div>
  ${valgt ? `<div class="box" style="margin-top:16px">${valgt.trin.map((t, i) => `<div class="trin"><div class="nr">${i + 1}</div><div>${t}</div></div>`).join('')}</div>
   <div class="lbl">Indsæt linket her</div>
   <input class="f" id="kurl" value="${esc(K.url)}" placeholder="https://… eller webcal://…" autocomplete="off" autocapitalize="off" oninput="K.url=this.value.trim();K.test=null">
   <button class="btn" style="margin-top:12px" onclick="tjekKalender()" ${K.tjekker ? 'disabled' : ''}>${K.tjekker ? 'Tjekker…' : 'Tjek kalenderen'}</button>
   ${kalTestHtml()}` : ''}
  <div class="box" style="margin-top:22px"><b>Skriv kundens mobilnummer i aftalen</b><div class="sub">I titlen eller beskrivelsen, fx <i>"Mette Hansen – Coating – 22 33 44 55"</i>. Aftaler uden nummer får ingen SMS, men du kan tilføje nummeret i appen bagefter.</div></div>
  <button class="btn dark" style="margin-top:12px" onclick="springKalender()">Spring over, jeg skriver kunderne ind selv</button></div>`;
}
function kalTestHtml() {
  const t = K.test; if (!t) return '';
  if (t.fejl) return `<div class="err" style="margin-top:10px">${esc(t.fejl)}</div>`;
  return `<div class="banner ${t.antal ? '' : 'warn'}" style="margin-top:14px"><b>${t.antal ? `Det virker! Vi fandt ${t.antal} aftaler` : 'Linket virker, men vi fandt ingen aftaler'}</b>${t.antal ? `, og ${t.med_nummer} af dem har et mobilnummer.` : ' de sidste 7 dage eller næste 14 dage.'}</div>
   ${t.eksempler.length ? `<div class="grp" style="margin:12px 0 0">${t.eksempler.map(e => R({ t: esc(e.navn || e.titel || 'Aftale'), s: `${esc(naar(e.start))}${e.behandling ? ' · ' + esc(e.behandling) : ''}`, r: e.telefon ? pl(visTlf(e.telefon), 'p-g') : pl('Intet nr.', 'p-r') })).join('')}</div>` : ''}
   <button class="btn" style="margin-top:12px" onclick="kobKalender()">Kobl kalenderen på</button>`;
}
async function tjekKalender() {
  if (!K.url) return toast('Indsæt linket først');
  K.tjekker = true; K.test = null; render();
  const { data, error } = await db.functions.invoke('stamkunde-send', { body: { action: 'kalender_test', shop_id: S.shop.id, url: K.url } });
  K.tjekker = false;
  if (error) { let m = 'Kunne ikke læse kalenderen'; try { m = (await error.context.json()).fejl || m; } catch (_) {} K.test = { fejl: m }; }
  else K.test = data;
  render();
}
async function kobKalender() {
  const ny = { ...S.ind, kalender_url: K.url, kalender_type: K.type, kalender_koblet_at: new Date().toISOString(), kalender_fejl: null, kalender_spring: false, opdateret_at: new Date().toISOString() }; delete ny.ny;
  const { data, error } = await db.from('sk_indstillinger').upsert(ny).select().single();
  if (error) { console.error(error); return toast('Kunne ikke gemme'); }
  S.ind = data; S.kalVis = false; K = { type: '', url: '', test: null, tjekker: false };
  S.tab = 'dag'; toast('Kalender koblet på ✓'); await synkNu();
}
async function springKalender() {
  if (S.ind.kalender_url) { S.kalVis = false; return render(); }
  if (S.admin && S.shop.owner_id !== S.user.id) { S.kalSpringLokal = true; return render(); }
  const ny = { ...S.ind, kalender_spring: true, opdateret_at: new Date().toISOString() }; delete ny.ny;
  const { data, error } = await db.from('sk_indstillinger').upsert(ny).select().single();
  if (error) return toast('Kunne ikke gemme');
  S.ind = data; render();
}
async function fjernKalender() {
  if (!confirm('Fjern kalenderen? Så skal du selv skrive kunderne ind.')) return;
  await gemInd({ kalender_url: null, kalender_type: null, kalender_koblet_at: null, kalender_fejl: null, kalender_spring: true });
}
const visKalenderSide = () => S.kalVis || (!S.ind.kalender_url && !S.ind.kalender_spring && !S.kalSpringLokal);

// ---------- Kunder ----------
function kunderSide() {
  const f = S.kFilter || 'alle', nyGr = Date.now() - 30 * 864e5;
  const ny = k => new Date(k.oprettet_at) > nyGr;
  const sidstJob = {}; S.job.forEach(j => { if (!sidstJob[j.kunde_id] || new Date(j.udfoert_at) > new Date(sidstJob[j.kunde_id].udfoert_at)) sidstJob[j.kunde_id] = j; });
  const l = S.kunder.filter(k => f === 'alle' || (f === 'ja' && k.ja_tak && !k.stop) || (f === 'nye' && ny(k))).sort((a, b) => (a.navn || '').localeCompare(b.navn || '', 'da'));
  const gr = {}; l.forEach(k => { const b = ((k.navn || '#').trim()[0] || '#').toUpperCase(); (gr[b] = gr[b] || []).push(k); });
  const ant = { alle: S.kunder.length, ja: S.kunder.filter(k => k.ja_tak && !k.stop).length, nye: S.kunder.filter(ny).length };
  return `${bar('<button class="lnk" style="font-size:28px;font-weight:300;line-height:1" onclick="S.nyJob={navn:\'\',tlf:\'\',beh:\'\',ja:false};jobSheet()" aria-label="Ny kunde">+</button>')}
  <h1>Kunder</h1>
  <div class="search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8A8E" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input placeholder="Søg navn eller nummer" oninput="filtrer(this.value)"></div>
  <div class="seg">${[['alle', 'Alle'], ['ja', 'Ja til tilbud'], ['nye', 'Nye']].map(x => `<button class="${f === x[0] ? 'on' : ''}" onclick="S.kFilter='${x[0]}';render()">${x[1]} ${ant[x[0]]}</button>`).join('')}</div>
  <div id="klist">${l.length ? Object.entries(gr).map(([b, ks]) => `<div class="kg"><div class="sec" style="padding-top:16px;font-weight:600;color:#3A3A3C">${esc(b)}</div><div class="grp">${ks.map(k => { const j = sidstJob[k.id];
    return `<div class="kr" data-s="${esc(((k.navn || '') + ' ' + k.telefon).toLowerCase())}">${R({ on: `kundeSheet('${k.id}')`, pre: `<div class="av">${ini(k.navn)}</div>`, t: esc(k.navn || 'Kunde') + (ny(k) ? ' ' + pl('Ny', 'p-b') : ''), s: j ? `${esc(j.behandling)} · ${esc(dato(j.udfoert_at))}` : visTlf(k.telefon), r: k.stop ? pl('Stoppet', 'p-r') : '' })}</div>`; }).join('')}</div></div>`).join('')
    : `<div class="grp" style="margin-top:16px"><div class="empty">${f === 'alle' ? 'Ingen kunder endnu. De kommer af sig selv, når aftaler fra kalenderen er slut.' : 'Ingen kunder her.'}</div></div>`}</div>`;
}
async function skiftAnnonce(id) {
  const k = kunde(id); if (!k) return;
  const { error } = await db.from('sk_kunder').update({ ja_tak: !k.ja_tak }).eq('id', id);
  if (error) return toast('Kunne ikke gemme');
  await hentAlt(); toast(k.ja_tak ? 'Nej til tilbud' : 'Ja til tilbud ✓');
}
function laesMere() {
  const ind = S.ind;
  const paa = S.paa.filter(p => p.aktiv)[0];
  sheet(`<h3>Sådan virker det</h3><div class="sub">Appen sender selv. Du skal ikke gøre noget.</div>
  <div class="sec">Alle kunder får</div>
  <div class="grp">${R({ pre: ic('star', 'var(--yellow)'), t: 'Tak + anmeldelse', s: ind.tak_tid === 'samme_aften_1830' ? 'Samme aften kl. 18.30' : 'Dagen efter kl. 10' })}<div style="padding:4px 16px 14px"><div class="bubble">${esc(takEksempel())}</div></div></div>
  <div class="grp" style="margin-top:12px">${R({ pre: ic('bell', 'var(--orange)'), t: 'Påmindelse', s: paa ? `${paa.maaneder} mdr. efter ${esc(paa.behandling.toLowerCase())}` : 'Lav en under Automatik → Påmindelser' })}<div style="padding:4px 16px 14px"><div class="bubble">${esc(paaEksempel('Mette', paa ? paa.behandling : 'coating', paa ? paa.maaneder : 12))}</div></div></div>
  <div class="sec">Kun kunder, der har sagt ja tak</div>
  <div class="grp">${R({ pre: ic('mega', 'var(--purple)'), t: 'Tilbud', s: 'Med din egen tekst, når du vil' })}<div style="padding:4px 16px 14px"><div class="bubble">${esc(annonceEksempel('Hej! Kun denne uge: 20% på indvendig rens. Ring på ' + (S.shop.phone || 'vores nummer') + '. Mvh ' + S.shop.name))}</div></div></div>`);
}
function filtrer(q) {
  q = q.toLowerCase().trim();
  document.querySelectorAll('#klist .kr').forEach(e => e.style.display = !q || e.dataset.s.includes(q) || e.dataset.s.includes(q.replace(/\s/g, '')) ? '' : 'none');
  document.querySelectorAll('#klist .kg').forEach(g => g.style.display = [...g.querySelectorAll('.kr')].some(e => e.style.display !== 'none') ? '' : 'none');
}
function kundeSheet(id) {
  const k = kunde(id); if (!k) return;
  const hist = [
    ...S.job.filter(j => j.kunde_id === id).map(j => ({ d: j.udfoert_at, h: R({ pre: ic('car', 'var(--navy)'), t: esc(j.behandling), s: esc(naar(j.udfoert_at)) }) })),
    ...S.beskeder.filter(b => b.kunde_id === id).map(b => ({ d: b.sendt_at || b.planlagt_til, h: R({ on: `visSms('${b.id}')`, pre: typeIc(b.type), t: TYPE_NAVN[b.type] || b.type, s: esc(naar(b.sendt_at || b.planlagt_til)) + (b.fejl ? ' · ' + esc(b.fejl) : ''), r: statusTag(b) }) }))
  ].sort((a, b) => new Date(b.d) - new Date(a.d));
  const fn = esc(fornavn(k.navn) || 'kunden');
  const knap = (ik, txt, klik) => `<${klik.startsWith('http') || klik.startsWith('tel') || klik.startsWith('sms') ? `a href="${klik}"` : `button onclick="${klik}"`} style="background:#fff;border:0;border-radius:12px;padding:10px 0 9px;text-align:center;color:var(--navy);font-size:12px;font-weight:500;text-decoration:none;display:block">${ikon(ik, 'style="width:22px;height:22px;stroke:#131D2E;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;display:block;margin:0 auto 4px"')}${txt}</${klik.startsWith('tel') || klik.startsWith('sms') ? 'a' : 'button'}>`;
  sheet(`<div style="text-align:center;padding-top:4px"><div class="av" style="width:80px;height:80px;font-size:30px;margin:0 auto">${ini(k.navn)}</div>
  <h3 style="margin-top:10px">${esc(k.navn || 'Kunde')}</h3><div class="sub">${visTlf(k.telefon)}${k.stop ? ' · ' + pl('Stoppet', 'p-r') : ''}</div></div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px">
   ${knap('phone', 'Ring', `tel:+45${k.telefon}`)}${knap('msg', 'Besked', `sms:+45${k.telefon}`)}${knap('plus', 'Nyt job', `S.nyJob={navn:${esc(JSON.stringify(k.navn || ''))},tlf:'${esc(k.telefon)}',beh:'',ja:${!!k.ja_tak}};jobSheet()`)}
  </div>
  <div class="sec">Automatisk for ${fn}</div>
  <div class="grp">
   ${R({ pre: ic('mega', 'var(--purple)'), t: 'Tilbud og nyheder', s: k.ja_tak ? (k.ja_tak_at ? 'Sagde ja ' + esc(new Date(k.ja_tak_at).toLocaleDateString('da-DK', { timeZone: TZ })) : 'Har sagt ja tak') : 'Får tak-SMS og påmindelser, men ingen tilbud', r: sw(k.ja_tak, `opdKunde('${id}',{ja_tak:${!k.ja_tak}})`) })}
   ${R({ pre: ic('stop', 'var(--red)'), t: 'Stop alle SMS', s: 'Fx hvis kunden ikke var tilfreds', r: sw(k.stop, `opdKunde('${id}',{stop:${!k.stop}})`) })}
  </div>
  <div class="sec">Historik</div>
  <div class="grp">${hist.length ? hist.map(x => x.h).join('') : '<div class="empty">Intet endnu.</div>'}</div>
  <div class="grp" style="margin-top:22px">${R({ on: `sletKunde('${id}')`, t: 'Slet kunde', cls: 'red cen', chev: false })}</div>`);
}
async function sletKunde(id) {
  const k = kunde(id); if (!k) return;
  if (!confirm(`Slet ${k.navn || 'kunden'}? Kunden og alle planlagte SMS bliver slettet. Det kan ikke fortrydes.`)) return;
  const { error } = await db.from('sk_kunder').delete().eq('id', id);
  if (error) return toast('Kunne ikke slette');
  luk(); await hentAlt(); render(); toast('Kunden er slettet');
}
async function opdKunde(id, felter) {
  const { error } = await db.from('sk_kunder').update(felter).eq('id', id);
  if (error) return toast('Kunne ikke gemme');
  await hentAlt(); kundeSheet(id);
  toast(felter.stop === true ? 'Stoppet ✓ Ingen flere SMS' : felter.stop === false ? 'Kunden kan få SMS igen' : felter.ja_tak ? 'Ja tak gemt ✓' : 'Ja tak fjernet');
}

// ---------- SMS-tekster ----------
// Anmeldelser: bilplejeren vælger Google eller Trustpilot. SMS-linket er altid findbilplejere.dk/g/<kode>,
// og funktionen "anmeld" sender kunden videre til det valgte sted.
const erTp = () => S.ind.anmeld_sted === 'trustpilot';
const stedNavn = () => erTp() ? 'Trustpilot' : 'Google';
const aktivtLink = () => String((erTp() ? S.ind.trustpilot_link : S.ind.google_link) || '');
// Trustpilot-link fra bilplejerens profil (…/review/domæne) laves om til "skriv anmeldelse"-linket (…/evaluate/domæne)
const tpLink = u => { const m = String(u || '').trim().match(/^https?:\/\/(?:[a-z]+\.)?trustpilot\.com\/(?:review|evaluate)\/([^\s/?#]+)/i); return m ? 'https://dk.trustpilot.com/evaluate/' + m[1] : String(u || '').trim(); };
const tpForslag = () => /trustpilot\.com\//i.test(S.shop.review_url || '') ? tpLink(S.shop.review_url) : '';
const takEksempel = (navn = 'Mette') => `Hej ${fornavn(navn) || 'Mette'}, tak fordi du valgte ${S.shop.name}. Hvis du er glad for resultatet, vil vi blive rigtig glade for en anmeldelse på ${stedNavn()}. Det tager 30 sekunder: ${aktivtLink().startsWith('http') ? 'https://findbilplejere.dk/g/' + S.shop.id.slice(0, 8) : `[dit ${stedNavn()}-link]`} Mvh ${S.shop.name}`;
async function gemInd(felter) {
  if (felter.afsender && !/^[A-Za-z0-9 ]{1,11}$/.test(felter.afsender)) { toast('Afsender: kun a-z, tal og mellemrum (max 11)'); return false; }
  if (felter.testnummer && !/^[2-9]\d{7}$/.test(felter.testnummer)) { toast('Testnummer skal have 8 cifre'); return false; }
  if (felter.aktiv === true && !aktivtLink().startsWith('http')) { toast(`Indsæt dit ${stedNavn()}-link først`); return false; }
  if (felter.aktiv === true && !S.ind.afsender) { toast('Skriv et afsendernavn først'); return false; }
  if (felter.testtilstand === false && !confirm('Slå testtilstand fra? Så får rigtige kunder SMS\'erne.')) { render(); return false; }
  const ny = { ...S.ind, ...felter, opdateret_at: new Date().toISOString() }; delete ny.ny;
  const { data, error } = await db.from('sk_indstillinger').upsert(ny).select().single();
  if (error) { console.error(error); toast('Kunne ikke gemme'); return false; }
  S.ind = data; render(); toast('Gemt ✓');
  return true;
}
// ---------- Annoncer (kun ja tak-kunder) ----------
const annonceEksempel = t => `${(t || '').trim() || 'Din tekst'} Afmeld: findbilplejere.dk/stop?k=…`;
let A = { t: '', naar: 'nu' };
function nyAnnonce() { A = { t: A.t || '', naar: A.naar || 'nu' }; tegnAnnonce(); }
function tegnAnnonce() {
  const modt = S.kunder.filter(k => k.ja_tak && !k.stop);
  const sidst = S.beskeder.filter(b => b.type === 'annonce').sort((a, b) => new Date(b.planlagt_til) - new Date(a.planlagt_til))[0];
  sheet(`<h3>Send et tilbud</h3><div class="sub">Går til ${modt.length} ${modt.length === 1 ? 'kunde' : 'kunder'}, der har sagt ja tak.</div>
  ${S.ind.testtilstand ? '<div class="banner">Testtilstand: kun én SMS til dit eget nummer.</div>' : ''}
  <div class="lbl">Din tekst</div>
  <textarea class="f" id="atxt" rows="4" maxlength="300" placeholder="Fx Hej! Kun denne uge: 20% på indvendig rens. Ring på ${esc(S.shop.phone || '…')}. Mvh ${esc(S.shop.name)}" oninput="A.t=this.value;opdAnnonce()">${esc(A.t)}</textarea>
  <div class="hint" id="atael"></div>
  <div class="lbl">Sådan ser den ud</div><div class="box"><div class="bubble" id="aprev"></div></div>
  <div class="lbl">Hvornår</div>
  <div class="seg" style="margin:0">${[['nu', 'Nu'], ['imorgen', 'I morgen kl. 10']].map(x => `<button class="${A.naar === x[0] ? 'on' : ''}" onclick="A.naar='${x[0]}';tegnAnnonce()">${x[1]}</button>`).join('')}</div>
  <div class="hint">Send højst 1-2 om måneden.${sidst ? ` Sidste: ${esc(naar(sidst.planlagt_til))}.` : ''}</div>
  <div class="err" id="aerr"></div>
  <button class="btn" id="asend" style="margin-top:6px" onclick="sendAnnonce()" ${modt.length ? '' : 'disabled'}>${modt.length ? `Send til ${S.ind.testtilstand ? 'dit testnummer' : modt.length + (modt.length === 1 ? ' kunde' : ' kunder')}` : 'Ingen kunder har sagt ja tak endnu'}</button>`);
  opdAnnonce();
}
function opdAnnonce() {
  const fuld = annonceEksempel(A.t).replace('…', 'xxxxxxxx');
  const enkelt = /^[\x20-\x7EæøåÆØÅéÉüÜäÄöÖ\n\r]*$/.test(fuld), del = enkelt ? (fuld.length <= 160 ? 1 : Math.ceil(fuld.length / 153)) : (fuld.length <= 70 ? 1 : Math.ceil(fuld.length / 67));
  if ($('aprev')) $('aprev').textContent = annonceEksempel(A.t);
  if ($('atael')) $('atael').textContent = `${(A.t || '').length}/300 tegn · ${del} SMS pr. kunde`;
}
async function sendAnnonce() {
  const t = (A.t || '').trim(); if (t.length < 10) { $('aerr').textContent = 'Skriv lidt mere tekst'; return; }
  let modt = S.kunder.filter(k => k.ja_tak && !k.stop);
  if (!modt.length) return;
  if (S.ind.testtilstand) modt = modt.slice(0, 1);
  else if (!confirm(`Send annoncen til ${modt.length} ${modt.length === 1 ? 'kunde' : 'kunder'}? Det kan ikke fortrydes, når den er sendt.`)) return;
  let tid = new Date();
  if (A.naar === 'imorgen') { const d = dagKey(Date.now() + 864e5), g = Date.parse(d + 'T10:00:00Z'); const off = Date.parse(new Date(g).toLocaleString('sv-SE', { timeZone: TZ }).replace(' ', 'T') + 'Z') - g; tid = new Date(g - off); }
  $('asend').disabled = true;
  const { error } = await db.from('sk_beskeder').insert(modt.map(k => ({ shop_id: S.shop.id, kunde_id: k.id, type: 'annonce', tekst: t, planlagt_til: tid.toISOString(), status: 'planlagt' })));
  if (error) { console.error(error); $('aerr').textContent = 'Kunne ikke gemme annoncen'; $('asend').disabled = false; return; }
  const varNu = A.naar === 'nu'; A = { t: '', naar: 'nu' }; luk(); await hentAlt();
  toast(S.ind.testtilstand ? 'Annonce sendes til dit testnummer om lidt ✓' : varNu ? `Annonce sendes om lidt ✓` : 'Annonce planlagt i morgen kl. 10 ✓');
}
let P = { b: '', n: 12 };
function nyPaa() { P = { b: '', n: 12 }; tegnPaa(); }
function tegnPaa() {
  const forslag = [...new Set(['Coating', 'Voks', 'Polering', ...(S.shop.services || [])])].slice(0, 8);
  sheet(`<h3>Ny påmindelse</h3><div class="sub">Sendes til alle kunder, der har fået behandlingen.</div>
  <div class="lbl">Efter behandling</div><input class="f" id="pb" value="${esc(P.b)}" placeholder="Fx Coating" oninput="P.b=this.value;opdPaaTekst()">
  <div class="chips">${forslag.map(x => `<button class="chip2 ${P.b === x ? 'on' : ''}" onclick="P.b=this.textContent;tegnPaa()">${esc(x)}</button>`).join('')}</div>
  <div class="lbl">Hvornår</div><div class="seg" style="margin:0">${[3, 6, 12, 24].map(x => `<button class="${P.n === x ? 'on' : ''}" onclick="P.n=${x};tegnPaa()">${x} mdr.</button>`).join('')}</div>
  <div class="lbl">Sådan ser den ud</div><div class="box"><div class="bubble" id="ptxt"></div></div>
  <button class="btn" style="margin-top:18px" onclick="gemPaa()">Gem påmindelse</button>`);
  opdPaaTekst();
}
const paaEksempel = (navn, beh, n) => `Hej ${fornavn(navn) || 'Mette'}, nu er det ${n >= 11 && n <= 13 ? 'et år' : n >= 23 && n <= 25 ? 'to år' : n + ' måneder'} siden din ${(beh || 'behandling').toLowerCase()} hos ${S.shop.name}. Skal vi finde en ny tid? ${S.shop.phone ? 'Ring eller skriv på ' + S.shop.phone : 'Skriv til os'}. Afmeld: findbilplejere.dk/stop?k=…`;
function opdPaaTekst() { const e = $('ptxt'); if (e) e.textContent = paaEksempel('Mette', P.b, P.n); }
async function gemPaa() {
  const b = (P.b || '').trim(); if (!b) return toast('Skriv hvilken behandling');
  const { error } = await db.from('sk_paamindelser').insert({ shop_id: S.shop.id, behandling: b, maaneder: P.n });
  if (error) return toast('Kunne ikke gemme');
  luk(); await hentAlt(); toast('Påmindelse lavet ✓');
}
async function opdPaa(id, f) { const { error } = await db.from('sk_paamindelser').update(f).eq('id', id); if (error) return toast('Kunne ikke gemme'); await hentAlt(); }
async function sletPaa(id) { if (!confirm('Slet påmindelsen? Allerede planlagte SMS bliver stadig sendt.')) return; await db.from('sk_paamindelser').delete().eq('id', id); await hentAlt(); toast('Slettet'); }
async function testSms() {
  if (!S.ind.testnummer) return toast('Skriv dit eget mobilnummer først');
  if (S.ind.ny) return toast('Gem indstillingerne først');
  toast('Sender…');
  const { data, error } = await db.functions.invoke('stamkunde-send', { body: { action: 'test', shop_id: S.shop.id } });
  if (error) { let m = 'Kunne ikke sende'; try { m = (await error.context.json()).fejl || m; } catch (_) {} return toast(m); }
  toast(data.status === 'test_sendt' ? 'Test-SMS sendt ✓ Tjek din telefon' : 'Ikke sendt: ' + (data.fejl || data.status));
  hentAlt();
}

// ---------- nye dele ----------
const IC = {
  cal: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1L3.2 9.4l6.1-.8z"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  msg: '<path d="M4 5h16v11H9l-5 4z"/>',
  mega: '<path d="M3 10v4h4l7 4V6l-7 4z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  tag: '<path d="M5 5h7l8 8-7 7-8-8z"/><circle cx="9" cy="9" r="1.3"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h0"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  stop: '<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>',
  car: '<path d="M4 16v-3.5L6.2 7h11.6l2.2 5.5V16zM4 12.5h16"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2.4.6 4 2.3 4 5.2"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'
};
const ikon = (k, st = '') => `<svg viewBox="0 0 24 24" ${st}>${IC[k] || ''}</svg>`;
const ic = (k, c) => `<div class="ic" style="background:${c}">${ikon(k)}</div>`;
const CHEV = '<svg class="chev" viewBox="0 0 8 14"><path d="M1 1l6 6-6 6"/></svg>';
const TIC = { tak: ['star', 'var(--yellow)'], paamindelse: ['bell', 'var(--orange)'], annonce: ['mega', 'var(--purple)'], test: ['flask', 'var(--gray)'] };
const typeIc = t => ic(...(TIC[t] || ['msg', 'var(--green)']));
// Én række som i iPhone-Indstillinger. o: { on, pre, t, s, x, r, chev, cls }
function R(o) {
  const el = o.on ? 'button' : 'div';
  return `<${el} class="r ${o.on ? '' : 'st'} ${o.cls || ''}"${o.on ? ` onclick="${o.on}"` : ''}>${o.pre || ''}<div class="in"><div class="t">${o.t}${o.s ? `<small>${o.s}</small>` : ''}${o.x || ''}</div>${o.r || ''}${o.on && o.chev !== false ? CHEV : ''}</div></${el}>`;
}
const pl = (t, c) => `<span class="pl ${c}">${esc(t)}</span>`;
const sw = (on, klik) => `<span class="sw ${on ? 'on' : ''}" role="switch" onclick="event.stopPropagation();${klik}"></span>`;
const LOGO = '<img class="logo" src="/app/logo.png" alt="findbilplejere.dk">';
const bar = (hoejre = '') => `<div class="bar">${LOGO}${hoejre}</div>`;
const tilbage = (txt, klik) => `<button class="lnk" onclick="${klik}"><svg width="11" height="18" viewBox="0 0 11 18"><path d="M9 2L2 9l7 7" stroke="#131D2E" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>${txt}</button>`;
const PILLE = { 'c-gold': 'p-g', 'c-green': 'p-b', 'c-blue': 'p-n', 'c-red': 'p-r' };
function kalTab() {
  const d0 = S.kDag || idag(), md = S.kMd || idag().slice(0, 7);
  const y = +md.slice(0, 4), m = +md.slice(5, 7), dage = new Date(y, m, 0).getDate(), foerste = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const ting = {};
  const add = (k, x) => (ting[k] = ting[k] || []).push(x);
  S.aft.filter(a => a.status !== 'aflyst').forEach(a => add(dagKey(a.start_at), { t: a.start_at, slut: a.slut_at, navn: a.navn || a.titel || 'Aftale', beh: a.behandling, sms: aftaleSms(a), on: `aftaleSheet('${a.id}')` }));
  S.job.filter(j => !j.aftale_id).forEach(j => { const k = kunde(j.kunde_id) || {}; add(dagKey(j.udfoert_at), { t: j.udfoert_at, navn: k.navn || 'Kunde', beh: j.behandling, on: `kundeSheet('${j.kunde_id}')` }); });
  let cells = ['M', 'T', 'O', 'T', 'F', 'L', 'S'].map(x => `<div class="h">${x}</div>`).join('');
  for (let i = 0; i < foerste; i++) cells += '<div></div>';
  for (let d = 1; d <= dage; d++) {
    const k = `${md}-${String(d).padStart(2, '0')}`, n = (ting[k] || []).length;
    cells += `<button class="${k === d0 ? 'valgt' : ''} ${k === idag() ? 'idag' : ''}" onclick="S.kDag='${k}';render()"><span class="n">${d}</span><span class="pr">${'<i></i>'.repeat(Math.min(n, 3))}</span></button>`;
  }
  const liste = (ting[d0] || []).sort((a, b) => new Date(a.t) - new Date(b.t));
  const mNavn = new Date(y, m - 1, 15).toLocaleDateString('da-DK', { month: 'long' });
  const dNavn = new Date(d0 + 'T12:00:00Z').toLocaleDateString('da-DK', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const skift = n => { const t = new Date(y, m - 1 + n, 1); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`; };
  const pil = (n, p) => `<button onclick="S.kMd='${skift(n)}';render()" style="width:36px;height:36px;border-radius:50%;border:0;background:#E3E3E8;display:flex;align-items:center;justify-content:center"><svg width="9" height="15" viewBox="0 0 11 18"><path d="${p}" stroke="#131D2E" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
  return `${bar(`<button class="lnk" onclick="S.kDag=null;S.kMd=null;render()">I dag</button>`)}
  <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-right:16px"><div><h1>${esc(mNavn[0].toUpperCase() + mNavn.slice(1))}</h1><div class="sub1">${y}</div></div><div style="display:flex;gap:8px;padding-bottom:4px">${pil(-1, 'M9 2L2 9l7 7')}${pil(1, 'M2 2l7 7-7 7')}</div></div>
  <div class="grp" style="margin-top:14px"><div class="mgrid">${cells}</div></div>
  <div class="sec">${esc(dNavn[0].toUpperCase() + dNavn.slice(1))}${liste.length ? ` · ${liste.length} ${liste.length === 1 ? 'aftale' : 'aftaler'}` : ''}</div>
  <div class="grp">${liste.length ? liste.map(r => R({ on: r.on, pre: `<div class="tm">${kl(r.t)}${r.slut ? `<small>${kl(r.slut)}</small>` : ''}</div>`, t: `<div class="streg">${esc(r.navn)}${r.beh ? `<small>${esc(r.beh)}</small>` : ''}${r.sms ? `<div class="pl ${PILLE[r.sms[1]] || 'p-n'}" style="margin-top:7px">${esc(r.sms[0])}</div>` : ''}</div>` })).join('') : '<div class="empty">Ingen aftaler denne dag.</div>'}</div>
  <div class="foot">${S.ind.kalender_url ? `Hentes automatisk fra din ${esc((KAL[S.ind.kalender_type] || KAL.andet).navn)}. Du skal ikke skrive noget ind.` : 'Viser de job, du har gemt. Kobl din kalender på under Automatik, så kommer aftalerne selv.'} Appen viser aftaler 2 dage tilbage og 2 uger frem.</div>`;
}
function statistik() {
  const uge = S.sPer === 'uge';
  const nu = new Date(), dk = idag();
  const plus = (ds, n) => new Date(Date.parse(ds + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const ugeStart = plus(dk, -((new Date(dk + 'T12:00:00Z').getUTCDay() + 6) % 7));
  const fra = uge ? ugeStart : dk.slice(0, 8) + '01';
  const forFra = uge ? plus(ugeStart, -7) : (() => { const t = new Date(+dk.slice(0, 4), +dk.slice(5, 7) - 2, 1); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`; })();
  const forTil = uge ? plus(dk, -7) : (() => { const t = new Date(+dk.slice(0, 4), +dk.slice(5, 7) - 2, +dk.slice(8)); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; })();
  const iNu = d => d && dagKey(d) >= fra, iFor = d => d && dagKey(d) >= forFra && dagKey(d) <= forTil;
  const tal = (f, start) => {
    const sendt = S.beskeder.filter(b => ['sendt', 'test_sendt'].includes(b.status) && f(b.sendt_at));
    const job = S.job.filter(j => f(j.udfoert_at));
    return {
      tak: sendt.filter(b => b.type === 'tak').length, paa: sendt.filter(b => b.type === 'paamindelse').length, job: job.length,
      nye: S.kunder.filter(k => f(k.oprettet_at)).length,
      igen: new Set(job.map(j => j.kunde_id).filter(id => S.job.some(x => x.kunde_id === id && dagKey(x.udfoert_at) < start))).size
    };
  };
  const a = tal(iNu, fra), b = tal(iFor, forFra), ord = uge ? 'sidste uge' : 'sidste måned';
  const diff = (x, y) => x > y ? `<span style="color:#1E8E3E">↑ ${x - y} flere end ${ord}</span>` : x < y ? `↓ ${y - x} færre end ${ord}` : `Samme som ${ord}`;
  const kort = (k, c, l, n, d) => `<div class="tile"><div class="l">${ic(k, c)}${l}</div><div class="n">${n}</div><div class="d">${d}</div></div>`;
  // job pr. uge, 8 uger
  const uger = []; for (let i = 7; i >= 0; i--) { const s = plus(ugeStart, -7 * i), e = plus(s, 6); uger.push(S.job.filter(j => { const k = dagKey(j.udfoert_at); return k >= s && k <= e; }).length); }
  const mx = Math.max(1, ...uger);
  const ja = S.kunder.filter(k => k.ja_tak && !k.stop).length;
  return `${bar()}<h1>Statistik</h1>
  <div class="seg"><button class="${uge ? 'on' : ''}" onclick="S.sPer='uge';render()">Denne uge</button><button class="${uge ? '' : 'on'}" onclick="S.sPer='maaned';render()">Denne måned</button></div>
  <div class="tile" style="margin:16px 16px 0;padding:16px"><div class="l">${ic('star', 'var(--yellow)')}Anmeldelses-SMS sendt</div>
   <div style="display:flex;align-items:baseline;gap:12px;margin-top:10px"><div class="big">${a.tak}</div><div style="font-size:15px;font-weight:600;color:var(--mut)">${diff(a.tak, b.tak)}</div></div>
   <div class="sub" style="margin-top:8px">Hver af dem beder kunden om en anmeldelse på ${stedNavn()}. Appen har sendt dem for dig.</div></div>
  <div class="tiles">
   ${kort('car', 'var(--navy)', 'Job', a.job, diff(a.job, b.job))}
   ${kort('people', 'var(--blue)', 'Kom igen', a.igen, 'kunder der har været her før')}
   ${kort('person', 'var(--green)', 'Nye kunder', a.nye, diff(a.nye, b.nye))}
   ${kort('bell', 'var(--orange)', 'Påmindelser', a.paa, 'sendt')}
  </div>
  <div class="tile" style="margin:12px 16px 0;padding:16px"><div style="display:flex;justify-content:space-between"><div style="font-size:15px;font-weight:600">Job pr. uge</div><div style="color:var(--mut);font-size:13px">Sidste 8 uger</div></div>
   <div class="bars">${uger.map((n, i) => `<div class="${i === 7 ? 'nu' : ''}" style="height:${n / mx * 100}%" title="${n}"></div>`).join('')}</div>
   <div style="display:flex;justify-content:space-between;color:var(--mut);font-size:11px;margin-top:6px"><span>8 uger siden</span><span>Denne uge</span></div></div>
  <div class="grp" style="margin-top:12px">${R({ pre: ic('mega', 'var(--purple)'), t: 'Ja tak til tilbud', r: `<span class="v">${ja} af ${S.kunder.length}</span>` })}</div>
  <div class="foot">Antal nye Google-anmeldelser kommer her i en senere version.</div>`;
}
function automatik() {
  const ind = S.ind, aktive = S.paa.filter(p => p.aktiv).length, ja = S.kunder.filter(k => k.ja_tak && !k.stop).length;
  return `${bar(S.admin && S.shops.length > 1 ? '<button class="lnk" onclick="S.shop=null;render()">Skift butik</button>' : '')}
  <h1>Automatik</h1>
  <div class="grp" style="margin-top:14px"><div class="r st" style="padding:12px 0 12px 16px"><div class="av" style="width:58px;height:58px;font-size:22px;background:var(--navy)">${ini(S.shop.name)}</div><div class="in" style="margin-left:14px;border:0"><div class="t" style="font-size:20px;font-weight:600">${esc(S.shop.name)}<small style="font-size:14px">${esc(S.shop.city || '')}${S.shop.city ? ' · ' : ''}Stamkunde-appen</small></div></div></div></div>
  <div class="grp" style="margin-top:22px">${R({ pre: ic('check', 'var(--green)'), t: 'Send SMS automatisk', r: sw(ind.aktiv, `gemInd({aktiv:${!ind.aktiv}})`) })}</div>
  <div class="foot">${ind.aktiv ? 'Appen sender selv på de rigtige tidspunkter. Du skal ikke gøre noget.' : 'Intet bliver sendt, før du slår det til.'}</div>
  <div class="grp" style="margin-top:22px">
   ${R({ on: `S.kalVis=true;K.type='${esc(ind.kalender_type || '')}';render()`, pre: ic('cal', 'var(--red)'), t: 'Kalender', r: `<span class="v">${ind.kalender_url ? esc((KAL[ind.kalender_type] || KAL.andet).navn) : 'Ikke koblet på'}</span>` })}
   ${R({ on: 'takSheet()', pre: ic('star', 'var(--yellow)'), t: 'Tak + anmeldelse', r: `<span class="v">${ind.tak_tid === 'samme_aften_1830' ? 'Samme aften' : 'Næste dag 10'}</span>` })}
   ${R({ on: 'paaSheet()', pre: ic('bell', 'var(--orange)'), t: 'Påmindelser', r: `<span class="v">${aktive} ${aktive === 1 ? 'aktiv' : 'aktive'}</span>` })}
   ${R({ on: 'nyAnnonce()', pre: ic('mega', 'var(--purple)'), t: 'Send tilbud til kunder', r: `<span class="v">${ja} siger ja</span>` })}
  </div>
  <div class="grp" style="margin-top:22px">
   ${R({ on: 'afsSheet()', pre: ic('tag', 'var(--blue)'), t: 'Afsendernavn', r: `<span class="v">${esc(ind.afsender || 'Mangler')}</span>` })}
   ${R({ on: 'googleSheet()', pre: ic('link', 'var(--teal)'), t: 'Anmeldelseslink', r: `<span class="v">${aktivtLink().startsWith('http') ? stedNavn() : 'Mangler'}</span>` })}
   ${R({ pre: ic('flask', 'var(--gray)'), t: 'Testtilstand', s: 'Alle SMS går til dit eget nummer', r: sw(ind.testtilstand, `gemInd({testtilstand:${!ind.testtilstand}})`) })}
   ${R({ on: 'testSheet()', pre: ic('msg', 'var(--green)'), t: 'Send test-SMS til mig' })}
  </div>
  <div class="foot">${smsBrugt()} af ${SMS_LOFT} SMS brugt i denne måned.</div>
  <div class="grp" style="margin-top:22px">
   ${R({ on: 'senesteSheet()', pre: ic('clock', 'var(--indigo)'), t: 'Seneste SMS' })}
   ${R({ on: 'laesMere()', pre: ic('help', 'var(--gray)'), t: 'Sådan virker det' })}
  </div>
  <div class="grp" style="margin-top:22px">${R({ on: 'logud()', t: 'Log ud', cls: 'red cen', chev: false })}</div>
  <div class="foot" style="text-align:center">Logget ind som ${esc(S.user.email)}</div>`;
}
function takSheet() {
  const ind = S.ind;
  sheet(`<h3>Tak + anmeldelse</h3><div class="sub">Går til alle kunder efter hvert job.</div>
  <div class="sec">Hvornår</div>
  <div class="grp">${[['naeste_dag_10', 'Næste dag kl. 10.00'], ['samme_aften_1830', 'Samme aften kl. 18.30']].map(x => R({ on: `gemInd({tak_tid:'${x[0]}'}).then(takSheet)`, t: x[1], chev: false, r: ind.tak_tid === x[0] ? ikon('check', 'style="width:20px;height:20px;stroke:#131D2E;fill:none;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round"') : '' })).join('')}</div>
  <div class="foot">Højst én tak-SMS pr. kunde pr. måned. Aldrig om søndagen.</div>
  <div class="sec">Sådan ser den ud</div>
  <div class="box"><div style="text-align:center;color:var(--mut);font-size:12px;margin-bottom:10px">${esc(ind.afsender || 'Dit afsendernavn')}</div><div class="bubble">${esc(takEksempel())}</div></div>`);
}
function afsSheet() {
  sheet(`<h3>Afsendernavn</h3><div class="sub">Det navn, kunden ser som afsender på SMS'en.</div>
  <div class="lbl">Navn (max 11 tegn)</div><input class="f" id="afs" value="${esc(S.ind.afsender || '')}" maxlength="11" placeholder="Fx ACDetailing">
  <div class="hint">Kun bogstaver (a-z), tal og mellemrum.</div>
  <button class="btn" style="margin-top:16px" onclick="gemInd({afsender:$('afs').value.trim()||null}).then(ok=>ok&&luk())">Gem</button>`);
}
// Anmeldelseslink: én fane til Google og én til Trustpilot (hvert sit link),
// og nedenunder vælger bilplejeren, hvilken tak-SMS'en bruger.
function googleSheet(fane) {
  const ind = S.ind;
  const tp = (fane || ind.anmeld_sted || 'google') === 'trustpilot';
  const forslag = tpForslag();
  const har = { google: String(ind.google_link || '').startsWith('http'), trustpilot: String(ind.trustpilot_link || '').startsWith('http') };
  const flueben = ikon('check', 'style="width:20px;height:20px;stroke:#131D2E;fill:none;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round"');
  sheet(`<h3>Anmeldelseslink</h3><div class="sub">Gem dit link til Google og/eller Trustpilot, og vælg hvilket tak-SMS'en bruger.</div>
  <div class="seg" style="margin:14px 0 0"><button class="${tp ? '' : 'on'}" onclick="googleSheet('google')">Google</button><button class="${tp ? 'on' : ''}" onclick="googleSheet('trustpilot')">Trustpilot</button></div>
  ${tp ? `<div class="lbl">Trustpilot-link</div><input class="f" id="glink" value="${esc(ind.trustpilot_link || forslag)}" placeholder="https://dk.trustpilot.com/evaluate/ditdomæne.dk" autocapitalize="off">
  <div class="hint">${forslag && !ind.trustpilot_link ? 'Vi har udfyldt det fra din profil. Tjek det og tryk Gem.' : 'Skriv din hjemmeside ind i linket, fx https://dk.trustpilot.com/evaluate/ditdomæne.dk'}</div>`
  : `<div class="lbl">Google-link</div><input class="f" id="glink" value="${esc(ind.google_link || '')}" placeholder="https://g.page/r/…/review" autocapitalize="off">
  <div class="hint">Find det i Google Maps: din virksomhed → "Få flere anmeldelser" → Del. Eller spørg Daniel.</div>`}
  <button class="btn" style="margin-top:16px" onclick="gemAnmeld('${tp ? 'trustpilot' : 'google'}')">Gem ${tp ? 'Trustpilot' : 'Google'}-link</button>
  <div class="sec">Tak-SMS'en bruger</div>
  <div class="grp">${[['google', 'Google'], ['trustpilot', 'Trustpilot']].map(([k, n]) => R({ on: `vaelgSted('${k}')`, t: n, s: har[k] ? 'Link gemt' : 'Mangler link', chev: false, r: (ind.anmeld_sted || 'google') === k ? flueben : '' })).join('')}</div>
  <div class="hint">SMS'en viser altid et kort link (findbilplejere.dk/g/…), som sender kunden videre til det valgte sted.</div>
  <div class="sec">Sådan ser tak-SMS'en ud</div>
  <div class="box"><div class="bubble">${esc(takEksempel())}</div></div>`);
}
async function gemAnmeld(fane) {
  const v = $('glink').value.trim();
  if (v && !/^https:\/\/\S+$/.test(v)) { toast('Linket skal starte med https://'); return; }
  if (!v && S.ind.aktiv && (S.ind.anmeld_sted || 'google') === fane) { toast('Det link bruges lige nu. Vælg det andet først, eller slå SMS fra'); return; }
  const felter = fane === 'trustpilot' ? { trustpilot_link: v ? tpLink(v) : null } : { google_link: v || null };
  if (await gemInd(felter)) googleSheet(fane);
}
async function vaelgSted(sted) {
  const link = sted === 'trustpilot' ? S.ind.trustpilot_link : S.ind.google_link;
  if (!String(link || '').startsWith('http')) { toast(`Gem dit ${sted === 'trustpilot' ? 'Trustpilot' : 'Google'}-link først`); googleSheet(sted); return; }
  if (await gemInd({ anmeld_sted: sted })) googleSheet(sted);
}
function testSheet() {
  sheet(`<h3>Test-SMS</h3><div class="sub">Se præcis hvad kunderne får, på din egen telefon.</div>
  <div class="lbl">Dit eget mobilnummer</div><input class="f" id="tnr" value="${esc(S.ind.testnummer || '')}" placeholder="8 cifre" inputmode="tel" onchange="gemInd({testnummer:tlf8(this.value)||null})">
  <div class="hint">I testtilstand går alle SMS til dette nummer i stedet for kunden.</div>
  <button class="btn" style="margin-top:16px" onclick="testSms()">Send en test-SMS til mig nu</button>`);
}
function paaSheet() {
  sheet(`<h3>Påmindelser</h3><div class="sub">Kunden får en SMS, når det er tid til næste behandling.</div>
  <div class="grp" style="margin-top:16px">${S.paa.length ? S.paa.map(p => R({ pre: `<button class="del" title="Slet" onclick="sletPaa('${p.id}').then(paaSheet)" style="background:none;border:0;padding:0;display:flex">${ic('trash', 'var(--red)')}</button>`, t: esc(p.behandling), s: `${p.maaneder} måneder efter`, r: sw(p.aktiv, `opdPaa('${p.id}',{aktiv:${!p.aktiv}}).then(paaSheet)`) })).join('') : '<div class="empty">Ingen påmindelser endnu. Lav fx én til coating efter 12 måneder.</div>'}</div>
  <div class="foot">Påmindelsen planlægges, når et job med den behandling bliver gemt. Den går til alle kunder, der ikke har afmeldt sig, og højst én om måneden.</div>
  <button class="btn" style="margin-top:16px" onclick="nyPaa()">+ Lav en påmindelse</button>`);
}
function senesteSheet() {
  const l = S.beskeder.filter(b => b.status !== 'planlagt').sort((a, b) => new Date(b.sendt_at || b.planlagt_til) - new Date(a.sendt_at || a.planlagt_til)).slice(0, 30);
  sheet(`<h3>Seneste SMS</h3><div class="sub">Tryk for at se teksten.</div>
  <div class="grp" style="margin-top:16px">${l.length ? l.map(b => { const k = kunde(b.kunde_id) || {}; return R({ on: `visSms('${b.id}')`, pre: typeIc(b.type), t: esc(k.navn || (b.type === 'test' ? 'Dig selv' : 'Kunde')), s: `${TYPE_NAVN[b.type] || b.type} · ${esc(naar(b.sendt_at || b.planlagt_til))}${b.fejl ? ' · ' + esc(b.fejl) : ''}`, r: statusTag(b), chev: false }); }).join('') : '<div class="empty">Ingen SMS endnu.</div>'}</div>`);
}

// Månedligt SMS-loft (samme tal som edge-funktionen stamkunde-send)
const SMS_LOFT = 100;
const smsBrugt = () => { const md = idag().slice(0, 7); return S.beskeder.filter(b => ['sendt', 'test_sendt'].includes(b.status) && b.sendt_at && dagKey(b.sendt_at).slice(0, 7) === md).length; };

// ---------- ramme ----------
function nav() {
  const t = [['dag', 'I dag'], ['kal', 'Kalender'], ['kunder', 'Kunder'], ['stat', 'Statistik'], ['auto', 'Automatik']];
  return `<nav>${t.map(x => `<button class="${S.tab === x[0] ? 'on' : ''}" onclick="S.tab='${x[0]}';render();scrollTo(0,0)">${I[x[0]]}${x[1]}</button>`).join('')}</nav>`;
}
function loginSide() {
  return `<div class="login">${LOGO}<h2>Flere anmeldelser.<br><span>Kunder der kommer igen.</span></h2><p>Log ind med den mail og adgangskode, du har fået fra FindBilplejere.</p>
  <div class="grp"><input id="le" type="email" placeholder="Mail" autocomplete="username"><input id="lp" type="password" placeholder="Adgangskode" autocomplete="current-password" onkeydown="if(event.key==='Enter')login()"></div>
  <button class="btn" onclick="login()">Log ind</button><div class="err" id="lerr"></div>
  <p style="font-size:15px;margin:10px 0 0;text-align:center"><a href="#" onclick="glemt();return false" style="color:var(--navy);text-decoration:none">Glemt adgangskode?</a></p></div>`;
}
function vaelgSide() {
  return `${bar()}<h1>Vælg butik</h1><div class="sub1">${S.admin ? 'Admin' : 'Din konto'}</div>
  <div class="grp" style="margin-top:16px">${S.shops.length ? S.shops.map(s => R({ on: `vaelgShop('${s.id}')`, pre: `<div class="av">${ini(s.name)}</div>`, t: esc(s.name), s: esc(s.city) })).join('') : '<div class="empty">Din konto er ikke koblet til en butik endnu. Kontakt FindBilplejere.</div>'}</div>
  <div class="grp" style="margin-top:22px">${R({ on: 'logud()', t: 'Log ud', cls: 'red cen', chev: false })}</div>`;
}
function render() {
  const app = $('app');
  if (!S.user) app.innerHTML = loginSide();
  else if (!S.shop) app.innerHTML = vaelgSide();
  else if (visKalenderSide()) app.innerHTML = kalenderSide();
  else app.innerHTML = (({ dag, kal: kalTab, kunder: kunderSide, stat: statistik, auto: automatik })[S.tab] || dag)() + nav();
}
async function autoOpd() {
  if (document.hidden || !S.user || !S.shop || !S.ind || $('ov').classList.contains('show') || visKalenderSide()) return;
  if (Date.now() - (S.sidstHentet || 0) < 30 * 60000) return;
  if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (S.ind.kalender_url) { try { await db.functions.invoke('stamkunde-send', { body: { action: 'kalender_synk', shop_id: S.shop.id } }); } catch (_) {} }
  await hentAlt();
}
setInterval(autoOpd, 60000);
document.addEventListener('visibilitychange', autoOpd);
start();
