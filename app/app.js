// Stamkunde-appen · findbilplejere.dk/app/
// Bilplejeren logger ind med samme konto som butik-panelet. Data ligger i Supabase (sk_*-tabellerne).
// SMS sendes af edge-funktionen "stamkunde-send" (hvert 5. min). Appen planlægger kun beskederne.
const SUPABASE_URL = 'https://xeosltdpvkcaudiijtge.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iG0iWu8szH_7-uwErdxN9g_pE9YGFWd';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

const I = {
  dag: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  maaned: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5A8.5 8.5 0 0 1 20.5 12"/></svg>',
  kunder: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.8 2.6 2.6 3 5.2"/></svg>',
  sms: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>'
};

const S = {
  user: null, admin: false, shops: [], shop: null, tab: 'dag',
  ind: null, kunder: [], job: [], beskeder: [], paa: [], aft: [], kalSpringLokal: false,
  nyJob: { navn: '', tlf: '', beh: '', ja: false }
};

// ---------- små hjælpere ----------
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ini = n => esc((n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase());
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
function sheet(h) { $('sheet').innerHTML = '<div class="grab"></div>' + h; $('ov').classList.add('show'); }
function luk() { $('ov').classList.remove('show'); }
$('ov').onclick = e => { if (e.target.id === 'ov') luk(); };

const STATUS = {
  planlagt: ['Planlagt', 't-gold'], sender: ['Sendes nu', 't-gold'], sendt: ['Sendt', 't-green'],
  test_sendt: ['Sendt til test', 't-blue'], simuleret: ['Ikke sendt (prøve)', 't-blue'],
  fejl: ['Fejl', 't-red'], annulleret: ['Annulleret', 't-red'], sprunget_over: ['Sprunget over', 't-blue']
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
const TYPE_NAVN = { tak: 'Tak/anmeldelse', paamindelse: 'Påmindelse', annonce: 'Annonce', test: 'Test' };
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
  sheet(`<h3>${TYPE[b.type] || b.type}</h3><div class="sub">Til ${esc(k.navn || 'kunde')} · ${esc(naar(b.sendt_at || b.planlagt_til))}</div>
  <div class="bubble">${esc(smsTekst(b))}</div>
  <div class="hint">${b.tekst ? 'Det er præcis den tekst, kunden fik.' : 'Sådan kommer SMS\'en til at se ud.'}${b.type === 'annonce' && !k.ja_tak ? ' Annoncer bliver kun sendt til kunder, der har sagt ja tak.' : ''}</div>
  <button class="btn dark" style="margin-top:14px" onclick="kundeSheet('${b.kunde_id}')">Se kunden</button>`);
}
const statusTag = b => { const s = STATUS[b.status] || [b.status, 't-blue']; return `<span class="tag ${s[1]}">${s[0]}</span>`; };

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
  let q = db.from('shops').select('id,name,city,contact_person,phone,services,owner_id').order('name');
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
  S.ind = ind.data || { shop_id: id, aktiv: false, google_link: '', afsender: '', tak_tid: 'naeste_dag_10', testtilstand: true, testnummer: '', ny: true };
  S.sidstHentet = Date.now();
  S.kunder = k.data || []; S.job = j.data || []; S.beskeder = b.data || []; S.paa = p.data || []; S.aft = a.data || [];
  render();
}
const kunde = id => S.kunder.find(k => k.id === id);

// ---------- I dag ----------
function dag() {
  const shop = S.shop, ind = S.ind;
  const navn = fornavn(shop.contact_person) || shop.name;
  const dagTxt = new Date().toLocaleDateString('da-DK', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
  const rows = [];
  S.aft.filter(a => dagKey(a.start_at) === idag() && a.status !== 'aflyst').forEach(a => rows.push({ t: a.start_at, navn: a.navn || a.titel || 'Aftale', beh: a.behandling, sms: aftaleSms(a), on: `aftaleSheet('${a.id}')` }));
  const aftTlf = new Set(S.aft.filter(a => dagKey(a.start_at) === idag() && a.telefon).map(a => a.telefon));
  S.job.filter(j => dagKey(j.udfoert_at) === idag() && !j.aftale_id).forEach(j => { const k = kunde(j.kunde_id) || {}; if (aftTlf.has(k.telefon)) return; const b = S.beskeder.find(x => x.job_id === j.id && x.type === 'tak'); const n = !b && senesteTak(j.kunde_id);
    rows.push({ t: j.udfoert_at, navn: k.navn, beh: j.behandling, sms: k.stop ? ['Ingen SMS (stoppet)', 'c-red'] : b ? takLinje(b) : n && n.status === 'planlagt' ? takLinje(n) : ['Ingen ny tak-SMS (fik en for nylig)', 'c-blue'], on: `kundeSheet('${j.kunde_id}')` }); });
  rows.sort((a, b) => new Date(a.t) - new Date(b.t));
  const banner = !ind.aktiv ? `<div class="banner warn">SMS er slået fra. Slå det til under <b>SMS</b>.</div>` : ind.testtilstand ? `<div class="banner">Testtilstand: SMS går til dit eget nummer.</div>` : '';
  const fejl = ind.kalender_fejl ? `<div class="banner warn">Kalenderen kunne ikke hentes.</div>` : '';
  const planlagt = S.beskeder.filter(b => b.status === 'planlagt').length;
  return `<div class="hero"><div class="in"><div class="chip">${esc(dagTxt[0].toUpperCase() + dagTxt.slice(1))}</div><h1>God dag, ${esc(navn)}</h1></div></div><div class="pad">
  ${S.admin && S.shops.length > 1 ? `<button class="btn dark s" style="margin-bottom:12px" onclick="S.shop=null;render()">Skift butik (${esc(shop.name)})</button>` : ''}
  ${banner}${fejl}
  <div class="glass"><div class="row" style="margin-bottom:2px"><div class="lbl">Kommer i dag</div>${ind.kalender_url ? '<button class="chip2" style="margin:0" onclick="synkNu()">Opdatér</button>' : ''}</div>
   ${rows.length ? rows.map(r => `<div class="job" onclick="${r.on}"><div class="t">${kl(r.t)}</div><div class="w"><b>${esc(r.navn)}</b>${r.beh ? `<span>${esc(r.beh)}</span>` : ''}<div class="ln ${r.sms[1]}" style="margin-top:3px">${esc(r.sms[0])}</div></div></div>`).join('')
   : `<div class="empty">Ingen kunder i dag.</div>`}
  </div>
  ${planlagt ? `<button class="btn dark" onclick="naesteSheet()">Se planlagte SMS (${planlagt})</button>` : ''}
  </div><button class="btn fab" onclick="jobSheet()">+ Job færdig</button>`;
}
function naesteSheet() {
  const l = S.beskeder.filter(b => b.status === 'planlagt').sort((a, b) => new Date(a.planlagt_til) - new Date(b.planlagt_til)).slice(0, 30);
  sheet(`<h3>Planlagte SMS</h3><div class="sub">Tryk for at se teksten.</div><div style="margin-top:10px">${l.map(b => { const k = kunde(b.kunde_id) || {};
    return `<div class="msg" onclick="visSms('${b.id}')" style="cursor:pointer"><div class="w"><b>${esc(k.navn || 'Kunde')}</b><span>${TYPE_NAVN[b.type] || b.type} · ${esc(naar(b.planlagt_til))}</span></div></div>`; }).join('')}</div>`);
}
function jobSheet() {
  const J = S.nyJob;
  const forslag = [...new Set([...(S.shop.services || []), ...S.paa.map(p => p.behandling)])].slice(0, 8);
  sheet(`<h3>Job færdig</h3><div class="sub">Kunden får tak-SMS ${S.ind.tak_tid === 'samme_aften_1830' ? 'i aften kl. 18.30' : 'i morgen kl. 10'}.</div>
  <div class="lbl" style="margin-top:18px">Kundens navn</div><input class="f" id="jn" value="${esc(J.navn)}" placeholder="Fx Mette Hansen" autocomplete="off" oninput="S.nyJob.navn=this.value">
  <div class="lbl" style="margin-top:14px">Mobilnummer</div><input class="f" id="jt" value="${esc(J.tlf)}" placeholder="8 cifre" inputmode="tel" autocomplete="off" oninput="S.nyJob.tlf=this.value;findKunde()">
  <div class="hint" id="jkendt"></div>
  <div class="lbl" style="margin-top:14px">Behandling</div><input class="f" id="jb" value="${esc(J.beh)}" placeholder="Fx Coating" oninput="S.nyJob.beh=this.value">
  <div class="seg">${forslag.map(x => `<button class="chip2" onclick="S.nyJob.beh=this.textContent;$('jb').value=this.textContent">${esc(x)}</button>`).join('')}</div>
  <div class="glass" style="margin-top:16px"><div class="row"><div><b>Ja tak til annoncer</b></div><div class="sw ${J.ja ? 'on' : ''}" id="jja" onclick="S.nyJob.ja=!S.nyJob.ja;this.classList.toggle('on')"></div></div></div>
  <div class="err" id="jerr"></div>
  <button class="btn" style="margin-top:8px" id="jgem" onclick="gemJob()">Gem job</button>`);
  findKunde();
}
function findKunde() {
  const t = tlf8(S.nyJob.tlf), e = $('jkendt'); if (!e) return;
  const k = t.length === 8 && S.kunder.find(x => x.telefon === t);
  e.textContent = k ? `Kendt kunde: ${k.navn}${k.ja_tak ? ' · ja tak til annoncer' : ''}${k.stop ? ' · STOPPET (får ingen SMS)' : ''}` : '';
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
  ${laast ? `<div class="banner" style="margin-top:14px">Aftalen er slut, og tak-SMS'en er planlagt. Du kan stoppe den under kunden.</div>` : `
  <div class="lbl" style="margin-top:18px">Kundens navn</div><input class="f" id="an" value="${esc(a.navn || '')}" placeholder="Fx Mette Hansen">
  <div class="lbl" style="margin-top:14px">Mobilnummer</div><input class="f" id="at" value="${esc(a.telefon || '')}" placeholder="8 cifre" inputmode="tel">
  <div class="lbl" style="margin-top:14px">Behandling</div><input class="f" id="ab" value="${esc(a.behandling || '')}" placeholder="Fx Coating">
  <div class="err" id="aerr"></div>
  <button class="btn" style="margin-top:8px" onclick="gemAftale('${id}')">Gem</button>
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
  return `<div class="top"><div class="lbl">Sidste trin · 1 minut</div><h1>Kobl din kalender på</h1><div class="sub">Så sender appen selv tak-SMS'en, når en aftale er slut. Du skal ikke skrive kunderne ind.</div></div><div class="pad">
  <div class="lbl" style="margin-bottom:6px">Hvor ligger dine aftaler?</div>
  <div class="seg" style="margin-top:0">${Object.entries(KAL).map(([k, v]) => `<button class="chip2 ${K.type === k ? 'on' : ''}" onclick="K.type='${k}';K.test=null;render()">${v.navn}</button>`).join('')}</div>
  ${valgt ? `<div class="glass" style="margin-top:14px">${valgt.trin.map((t, i) => `<div class="row" style="justify-content:flex-start;align-items:flex-start;gap:12px;margin:6px 0"><div class="av" style="width:28px;height:28px;font-size:13px;flex:none">${i + 1}</div><div class="sub" style="margin:3px 0 0;color:#dfe4ee">${t}</div></div>`).join('')}
   <div class="lbl" style="margin-top:14px">Indsæt linket her</div>
   <input class="f" id="kurl" value="${esc(K.url)}" placeholder="https://… eller webcal://…" autocomplete="off" autocapitalize="off" oninput="K.url=this.value.trim();K.test=null">
   <button class="btn dark" style="margin-top:12px" onclick="tjekKalender()" ${K.tjekker ? 'disabled' : ''}>${K.tjekker ? 'Tjekker…' : 'Tjek kalenderen'}</button>
   ${kalTestHtml()}</div>` : ''}
  <div class="glass" style="margin-top:14px"><b>Vigtigt: skriv kundens mobilnummer i aftalen</b><div class="sub">I titlen eller beskrivelsen, fx <i>"Mette Hansen – Coating – 22 33 44 55"</i>. Aftaler uden nummer får ingen SMS, men du kan tilføje nummeret i appen bagefter.</div></div>
  <button class="btn dark" style="margin-top:6px" onclick="springKalender()">Spring over, jeg skriver kunderne ind selv</button>
  ${S.ind.kalender_url ? `<button class="btn dark" style="margin-top:10px" onclick="S.kalVis=false;render()">Tilbage</button>` : ''}</div>`;
}
function kalTestHtml() {
  const t = K.test; if (!t) return '';
  if (t.fejl) return `<div class="err" style="margin-top:10px">${esc(t.fejl)}</div>`;
  return `<div class="banner ${t.antal ? '' : 'warn'}" style="margin-top:14px"><b>${t.antal ? `Det virker! Vi fandt ${t.antal} aftaler` : 'Linket virker, men vi fandt ingen aftaler'}</b>${t.antal ? `, og ${t.med_nummer} af dem har et mobilnummer.` : ' de sidste 7 dage eller næste 14 dage.'}</div>
   ${t.eksempler.length ? `<div style="margin-top:8px">${t.eksempler.map(e => `<div class="msg"><div class="w"><b>${esc(e.navn || e.titel || 'Aftale')}</b><span>${esc(naar(e.start))} · ${esc(e.behandling || '')}</span></div>${e.telefon ? `<span class="tag t-green">${visTlf(e.telefon)}</span>` : '<span class="tag t-red">Intet nr.</span>'}</div>`).join('')}</div>` : ''}
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

// ---------- Måned ----------
function ringSvg(p, col) { const r = 15.5, c = 2 * Math.PI * r; return `<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="${r}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="3"/>${p ? `<circle cx="18" cy="18" r="${r}" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${c * p} ${c}"/>` : ''}</svg>`; }
function maaned() {
  const nu = new Date(), mk = idag().slice(0, 7);
  const iMd = d => dagKey(d).slice(0, 7) === mk;
  const sendt = S.beskeder.filter(b => ['sendt', 'test_sendt'].includes(b.status) && b.sendt_at && iMd(b.sendt_at));
  const tak = sendt.filter(b => b.type === 'tak').length, paa = sendt.filter(b => b.type === 'paamindelse').length;
  const jobs = S.job.filter(j => iMd(j.udfoert_at)).length;
  const nye = S.kunder.filter(k => iMd(k.oprettet_at)).length;
  const ja = S.kunder.filter(k => k.ja_tak && !k.stop).length;
  const igen = new Set(S.job.filter(j => iMd(j.udfoert_at)).map(j => j.kunde_id).filter(id => S.job.some(x => x.kunde_id === id && !iMd(x.udfoert_at)))).size;
  const pr = {}; sendt.forEach(b => { const d = +dagKey(b.sendt_at).slice(8); pr[d] = (pr[d] || 0) + 1; });
  const max = Math.max(1, ...Object.values(pr));
  const y = +mk.slice(0, 4), m = +mk.slice(5, 7), dage = new Date(y, m, 0).getDate(), foerste = (new Date(y, m - 1, 1).getDay() + 6) % 7, iDag = +idag().slice(8);
  let cells = ''; ['M', 'T', 'O', 'T', 'F', 'L', 'S'].forEach(d => cells += `<div class="h">${d}</div>`);
  for (let i = 0; i < foerste; i++) cells += '<div></div>';
  for (let d = 1; d <= dage; d++) cells += d === iDag ? `<div class="ring today"><span>${d}</span></div>` : d > iDag ? `<div class="ring fut"><span>${d}</span></div>` : `<div class="ring">${ringSvg((pr[d] || 0) / max, 'var(--blue)')}<span>${d}</span></div>`;
  const mdNavn = nu.toLocaleDateString('da-DK', { timeZone: TZ, month: 'long', year: 'numeric' });
  return `<div class="top"><div class="lbl">${esc(mdNavn)}</div><h1>Din måned</h1></div><div class="pad">
  <div class="grid"><div class="glass gold"><div class="lbl">Anmeldelses-SMS</div><div class="big">${tak}</div><div class="sub">sendt i denne måned</div></div>
  <div class="glass violet"><div class="lbl">Kom igen</div><div class="big">${igen}</div><div class="sub">kunder der har været her før</div></div></div>
  <div class="glass"><div class="row"><div class="lbl">SMS sendt pr. dag</div><div class="tag t-blue">${sendt.length} i alt</div></div><div class="cal">${cells}</div>
  <div class="trio"><div><span>🚗</span><b>${jobs}</b><div class="sub">Job</div></div><div><span>🙋</span><b>${nye}</b><div class="sub">Nye kunder</div></div><div><span>🔔</span><b>${paa}</b><div class="sub">Påmindelser</div></div></div></div>
  <div class="glass green"><div class="row"><div><b>${ja} af ${S.kunder.length} kunder</b><div class="sub">har sagt ja tak til påmindelser</div></div><div style="font-size:26px">✅</div></div></div>
  <div class="glass"><div class="sub" style="margin:0">Antal nye Google-anmeldelser bliver vist her i en senere version.</div></div>
  </div>`;
}

// ---------- Kunder ----------
function kunderSide() {
  const jaAntal = S.kunder.filter(k => k.ja_tak && !k.stop).length;
  return `<div class="top"><h1>Kunder</h1><div class="sub">${S.kunder.length} kunder · ${jaAntal} ja til annoncer</div>
   <div class="row" style="gap:8px;margin-top:12px;justify-content:flex-start"><button class="btn dark s" onclick="laesMere()">Læs mere</button><button class="btn s" onclick="nyAnnonce()">Skriv annonce</button></div></div><div class="pad">
  <input class="f" placeholder="Søg navn eller nummer" oninput="filtrer(this.value)" style="margin:0 0 12px">
  <div class="glass" id="klist">${S.kunder.length ? S.kunder.map(k => `<div class="cust" data-s="${esc((k.navn + ' ' + k.telefon).toLowerCase())}" onclick="kundeSheet('${k.id}')"><div style="flex:1;min-width:0"><b>${esc(k.navn)}</b><div class="sub" style="margin:0">${visTlf(k.telefon)}</div></div>
    ${k.stop ? '<span class="tag t-red">Stoppet</span>' : `<div style="text-align:center"><div class="sub" style="margin:0 0 4px;font-size:11px">Annonce</div><div class="sw ${k.ja_tak ? 'on' : ''}" onclick="event.stopPropagation();skiftAnnonce('${k.id}')"></div></div>`}</div>`).join('')
    : '<div class="empty">Ingen kunder endnu.</div>'}</div></div>`;
}
async function skiftAnnonce(id) {
  const k = kunde(id); if (!k) return;
  const { error } = await db.from('sk_kunder').update({ ja_tak: !k.ja_tak }).eq('id', id);
  if (error) return toast('Kunne ikke gemme');
  await hentAlt(); toast(k.ja_tak ? 'Nej til annoncer' : 'Ja til annoncer ✓');
}
function laesMere() {
  const ind = S.ind;
  const paa = S.paa.filter(p => p.aktiv)[0];
  sheet(`<h3>Sådan virker det</h3>
  <div class="lbl" style="margin-top:16px">Alle kunder får</div>
  <div class="ln"><b>⭐ Tak-SMS</b> ${ind.tak_tid === 'samme_aften_1830' ? 'samme aften kl. 18.30' : 'dagen efter kl. 10'}</div>
  <div class="bubble">${esc(takEksempel())}</div>
  <div class="ln" style="margin-top:14px"><b>🔁 Påmindelse</b> ${paa ? `${paa.maaneder} mdr. efter ${esc(paa.behandling.toLowerCase())}` : '(lav en under SMS)'}</div>
  <div class="bubble">${esc(paaEksempel('Mette', paa ? paa.behandling : 'coating', paa ? paa.maaneder : 12))}</div>
  <div class="lbl" style="margin-top:20px">Kun "Annonce: ja"</div>
  <div class="ln"><b>📣 Annonce</b> med din egen tekst</div>
  <div class="bubble">${esc(annonceEksempel('Hej! Kun denne uge: 20% på indvendig rens. Ring på ' + (S.shop.phone || 'vores nummer') + '. Mvh ' + S.shop.name))}</div>`);
}
function filtrer(q) { q = q.toLowerCase().trim(); document.querySelectorAll('#klist .cust').forEach(e => e.style.display = !q || e.dataset.s.includes(q) || e.dataset.s.includes(q.replace(/\s/g, '')) ? '' : 'none'); }
function kundeSheet(id) {
  const k = kunde(id); if (!k) return;
  const hist = [
    ...S.job.filter(j => j.kunde_id === id).map(j => ({ d: j.udfoert_at, h: `<div class="msg"><div class="w"><b>🚗 ${esc(j.behandling)}</b><span>${esc(naar(j.udfoert_at))}</span></div></div>` })),
    ...S.beskeder.filter(b => b.kunde_id === id).map(b => ({ d: b.sendt_at || b.planlagt_til, h: `<div class="msg" onclick="visSms('${b.id}')" style="cursor:pointer"><div class="w"><b>${TYPE[b.type] || b.type}</b><span>${esc(naar(b.sendt_at || b.planlagt_til))}${b.fejl ? ' · ' + esc(b.fejl) : ''}</span><div class="bubble" style="margin-top:6px">${esc(smsTekst(b))}</div></div>${statusTag(b)}</div>` }))
  ].sort((a, b) => new Date(b.d) - new Date(a.d));
  sheet(`<div class="row"><div class="av" style="width:54px;height:54px;font-size:18px">${ini(k.navn)}</div><div style="flex:1"><h3>${esc(k.navn)}</h3><div class="sub"><a href="tel:+45${k.telefon}" style="color:var(--gold)">${visTlf(k.telefon)}</a></div></div></div>
  <div class="glass" style="margin-top:18px"><div class="row"><div><b>Ja tak til annoncer</b><div class="sub">Kunden har sagt ja til at få dine tilbud på SMS</div></div><div class="sw ${k.ja_tak ? 'on' : ''}" onclick="opdKunde('${id}',{ja_tak:${!k.ja_tak}})"></div></div>
  <div class="sub" style="margin-top:10px">${k.ja_tak && k.ja_tak_at ? `Gemt ${esc(new Date(k.ja_tak_at).toLocaleString('da-DK', { timeZone: TZ }))} som dokumentation.` : 'Får tak-SMS og påmindelser, men ingen annoncer.'}</div></div>
  <div class="glass"><div class="row"><div><b>Stop alle SMS</b><div class="sub">Fx hvis kunden ikke var tilfreds</div></div><div class="sw ${k.stop ? 'on' : ''}" onclick="opdKunde('${id}',{stop:${!k.stop}})"></div></div></div>
  <div class="lbl" style="margin:18px 0 4px">Historik</div><div class="glass">${hist.length ? hist.map(x => x.h).join('') : '<div class="empty">Intet endnu.</div>'}</div>`);
}
async function opdKunde(id, felter) {
  const { error } = await db.from('sk_kunder').update(felter).eq('id', id);
  if (error) return toast('Kunne ikke gemme');
  await hentAlt(); kundeSheet(id);
  toast(felter.stop === true ? 'Stoppet ✓ Ingen flere SMS' : felter.stop === false ? 'Kunden kan få SMS igen' : felter.ja_tak ? 'Ja tak gemt ✓' : 'Ja tak fjernet');
}

// ---------- SMS-indstillinger ----------
const takEksempel = (navn = 'Mette') => `Hej ${fornavn(navn) || 'Mette'}, tak fordi du valgte ${S.shop.name}. Hvis du er glad for resultatet, vil vi blive rigtig glade for en anmeldelse på Google. Det tager 30 sekunder: ${S.ind.google_link ? 'https://findbilplejere.dk/g/' + S.shop.id.slice(0, 8) : '[dit Google-link]'} Mvh ${S.shop.name}`;
function sms() {
  const ind = S.ind;
  const seneste = S.beskeder.filter(b => b.status !== 'planlagt').sort((a, b) => new Date(b.sendt_at || b.planlagt_til) - new Date(a.sendt_at || a.planlagt_til)).slice(0, 15);
  return `<div class="top"><div class="lbl">Kører automatisk</div><h1>Dine SMS'er</h1></div><div class="pad">
  <div class="glass ${ind.aktiv ? 'green' : ''}"><div class="row"><div><b>SMS er ${ind.aktiv ? 'slået til' : 'slået fra'}</b><div class="sub">${ind.aktiv ? 'Appen sender selv på de rigtige tidspunkter' : 'Intet bliver sendt, før du slår det til'}</div></div><div class="sw ${ind.aktiv ? 'on' : ''}" onclick="gemInd({aktiv:${!ind.aktiv}})"></div></div></div>

  <div class="glass"><div class="row"><div><b>📅 Kalender</b><div class="sub">${ind.kalender_url ? `${esc((KAL[ind.kalender_type] || KAL.andet).navn)} er koblet på${ind.kalender_sidst ? ' · hentet ' + esc(naar(ind.kalender_sidst)) : ''}` : 'Ikke koblet på. Du skriver kunderne ind selv.'}</div>${ind.kalender_fejl ? `<div class="err">${esc(ind.kalender_fejl)}</div>` : ''}</div></div>
   <div class="row" style="gap:8px;margin-top:10px"><button class="btn dark s" onclick="S.kalVis=true;K.type='${esc(ind.kalender_type || '')}';render()">${ind.kalender_url ? 'Skift kalender' : 'Kobl kalender på'}</button>${ind.kalender_url ? '<button class="btn dark s" onclick="fjernKalender()">Fjern</button>' : ''}</div></div>

  <div class="glass gold"><b>⭐ Tak + Google-anmeldelse</b><div class="sub">Til alle kunder efter hvert job. Højst én pr. kunde pr. måned.</div>
   <div class="seg">${[['naeste_dag_10', 'Næste dag kl. 10'], ['samme_aften_1830', 'Samme aften kl. 18:30']].map(x => `<button class="chip2 ${ind.tak_tid === x[0] ? 'on' : ''}" onclick="gemInd({tak_tid:'${x[0]}'})">${x[1]}</button>`).join('')}</div>
   <div class="bubble">${esc(takEksempel())}</div>
   <div class="lbl" style="margin-top:16px">Link til din Google-anmeldelse</div>
   <input class="f" id="glink" value="${esc(ind.google_link || '')}" placeholder="https://g.page/r/…/review" onchange="gemInd({google_link:this.value.trim()||null})">
   <div class="hint">Find det i Google Maps: din virksomhed → "Få flere anmeldelser" → Del. Eller spørg Daniel.</div>
   <div class="lbl" style="margin-top:14px">Afsendernavn (max 11 tegn)</div>
   <input class="f" id="afs" value="${esc(ind.afsender || '')}" maxlength="11" placeholder="Fx ACDetailing" onchange="gemInd({afsender:this.value.trim()||null})">
   <div class="hint">Det er det navn, kunden ser som afsender. Kun bogstaver (a-z), tal og mellemrum.</div>
  </div>

  <div class="row h2"><div class="lbl">Påmindelser · alle kunder</div></div>
  ${S.paa.length ? S.paa.map(p => `<div class="glass"><div class="row"><div class="row" style="justify-content:flex-start"><div style="font-size:22px">🔁</div><div><b>${esc(p.behandling)}</b><div class="sub" style="margin:0">${p.maaneder} måneder efter</div></div></div><div class="row" style="gap:6px"><div class="sw ${p.aktiv ? 'on' : ''}" onclick="opdPaa('${p.id}',{aktiv:${!p.aktiv}})"></div><button class="del" title="Slet" onclick="sletPaa('${p.id}')">×</button></div></div></div>`).join('') : '<div class="empty" style="margin-bottom:8px">Ingen påmindelser endnu. Lav fx én til coating efter 12 måneder.</div>'}
  <button class="btn dark" onclick="nyPaa()">+ Lav en påmindelse</button>
  <div class="hint">Påmindelsen planlægges, når et job med den behandling bliver gemt. Den går til alle kunder, der ikke har afmeldt sig, og højst én om måneden.</div>

  <div class="row h2"><div class="lbl">Test</div></div>
  <div class="glass"><div class="row"><div><b>Testtilstand</b><div class="sub">Alle SMS går til dit eget nummer i stedet for kunden</div></div><div class="sw ${ind.testtilstand ? 'on' : ''}" onclick="gemInd({testtilstand:${!ind.testtilstand}})"></div></div>
   <div class="lbl" style="margin-top:14px">Dit eget mobilnummer</div>
   <input class="f" id="tnr" value="${esc(ind.testnummer || '')}" placeholder="8 cifre" inputmode="tel" onchange="gemInd({testnummer:tlf8(this.value)||null})">
   <button class="btn dark" style="margin-top:12px" onclick="testSms()">Send en test-SMS til mig nu</button></div>

  <div class="row h2"><div class="lbl">Seneste SMS</div></div>
  <div class="glass">${seneste.length ? seneste.map(b => { const k = kunde(b.kunde_id) || {}; return `<div class="msg"><div class="w"><b>${esc(k.navn || (b.type === 'test' ? 'Dig selv' : 'Kunde'))}</b><span>${TYPE[b.type] || b.type} · ${esc(naar(b.sendt_at || b.planlagt_til))}${b.fejl ? ' · ' + esc(b.fejl) : ''}</span></div>${statusTag(b)}</div>`; }).join('') : '<div class="empty">Ingen SMS endnu.</div>'}</div>

  <div class="glass violet"><b>📣 Annoncer</b><div class="sub">Send din egen besked til kunder, der har sagt ja tak.</div><button class="btn s" style="margin-top:12px" onclick="nyAnnonce()">Skriv en annonce</button></div>
  <button class="btn dark" style="margin-top:14px" onclick="logud()">Log ud</button>
  <p class="hint" style="text-align:center;margin-top:10px">Logget ind som ${esc(S.user.email)}</p></div>`;
}
async function gemInd(felter) {
  if (felter.afsender && !/^[A-Za-z0-9 ]{1,11}$/.test(felter.afsender)) return toast('Afsender: kun a-z, tal og mellemrum (max 11)');
  if (felter.testnummer && !/^[2-9]\d{7}$/.test(felter.testnummer)) return toast('Testnummer skal have 8 cifre');
  if (felter.aktiv === true && !(S.ind.google_link || '').startsWith('http')) return toast('Indsæt dit Google-link først');
  if (felter.aktiv === true && !S.ind.afsender) return toast('Skriv et afsendernavn først');
  if (felter.testtilstand === false && !confirm('Slå testtilstand fra? Så får rigtige kunder SMS\'erne.')) return render();
  const ny = { ...S.ind, ...felter, opdateret_at: new Date().toISOString() }; delete ny.ny;
  const { data, error } = await db.from('sk_indstillinger').upsert(ny).select().single();
  if (error) { console.error(error); toast('Kunne ikke gemme'); return; }
  S.ind = data; render(); toast('Gemt ✓');
}
// ---------- Annoncer (kun ja tak-kunder) ----------
const annonceEksempel = t => `${(t || '').trim() || 'Din tekst'} Afmeld: findbilplejere.dk/stop?k=…`;
let A = { t: '', naar: 'nu' };
function nyAnnonce() { A = { t: A.t || '', naar: A.naar || 'nu' }; tegnAnnonce(); }
function tegnAnnonce() {
  const modt = S.kunder.filter(k => k.ja_tak && !k.stop);
  const sidst = S.beskeder.filter(b => b.type === 'annonce').sort((a, b) => new Date(b.planlagt_til) - new Date(a.planlagt_til))[0];
  sheet(`<h3>Skriv en annonce</h3><div class="sub">Går til ${modt.length} ${modt.length === 1 ? 'kunde' : 'kunder'} med "Annonce: ja".</div>
  ${S.ind.testtilstand ? '<div class="banner" style="margin-top:12px">Testtilstand: kun én SMS til dit eget nummer.</div>' : ''}
  <div class="lbl" style="margin-top:16px">Din tekst</div>
  <textarea class="f" id="atxt" rows="4" maxlength="300" placeholder="Fx Hej! Kun denne uge: 20% på indvendig rens. Ring på ${esc(S.shop.phone || '…')}. Mvh ${esc(S.shop.name)}" oninput="A.t=this.value;opdAnnonce()">${esc(A.t)}</textarea>
  <div class="hint" id="atael"></div>
  <div class="lbl" style="margin-top:14px">Sådan ser den ud</div><div class="bubble" id="aprev"></div>
  <div class="lbl" style="margin-top:16px">Hvornår</div>
  <div class="seg">${[['nu', 'Nu'], ['imorgen', 'I morgen kl. 10']].map(x => `<button class="chip2 ${A.naar === x[0] ? 'on' : ''}" onclick="A.naar='${x[0]}';tegnAnnonce()">${x[1]}</button>`).join('')}</div>
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
  <div class="lbl" style="margin-top:18px">Efter behandling</div><input class="f" id="pb" value="${esc(P.b)}" placeholder="Fx Coating" oninput="P.b=this.value;opdPaaTekst()">
  <div class="seg">${forslag.map(x => `<button class="chip2 ${P.b === x ? 'on' : ''}" onclick="P.b=this.textContent;tegnPaa()">${esc(x)}</button>`).join('')}</div>
  <div class="lbl" style="margin-top:18px">Hvornår</div><div class="seg">${[3, 6, 12, 24].map(x => `<button class="chip2 ${P.n === x ? 'on' : ''}" onclick="P.n=${x};tegnPaa()">${x} mdr.</button>`).join('')}</div>
  <div class="bubble" id="ptxt"></div>
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

// ---------- ramme ----------
function nav() {
  const t = [['dag', 'I dag'], ['maaned', 'Måned'], ['kunder', 'Kunder'], ['sms', 'SMS']];
  return `<nav>${t.map(x => `<button class="${S.tab === x[0] ? 'on' : ''}" onclick="S.tab='${x[0]}';render()">${I[x[0]]}${x[1]}</button>`).join('')}</nav>`;
}
function loginSide() {
  return `<div class="login"><div style="font-weight:700">findbilplejere<span style="color:var(--gold)">.dk</span></div><h2>Flere anmeldelser.<br><span>Kunder der kommer igen.</span></h2><p>Log ind med den mail og adgangskode, du har fået fra FindBilplejere.</p>
  <input id="le" type="email" placeholder="Mail" autocomplete="username"><input id="lp" type="password" placeholder="Adgangskode" autocomplete="current-password" onkeydown="if(event.key==='Enter')login()">
  <button class="btn" onclick="login()">Log ind</button><div class="err" id="lerr"></div>
  <p style="font-size:13px;margin:10px 0 0;text-align:center"><a href="#" onclick="glemt();return false" style="color:#b5bccb">Glemt adgangskode?</a></p></div>`;
}
function vaelgSide() {
  return `<div class="top"><div class="lbl">${S.admin ? 'Admin' : 'Din konto'}</div><h1>Vælg butik</h1></div><div class="pad"><div class="glass">${S.shops.length ? S.shops.map(s => `<div class="cust" onclick="vaelgShop('${s.id}')"><div class="av">${ini(s.name)}</div><div style="flex:1"><b>${esc(s.name)}</b><div class="sub" style="margin:0">${esc(s.city)}</div></div><span style="color:var(--mut)">›</span></div>`).join('') : '<div class="empty">Din konto er ikke koblet til en butik endnu. Kontakt FindBilplejere.</div>'}</div>
  <button class="btn dark" onclick="logud()">Log ud</button></div>`;
}
function render() {
  const app = $('app');
  if (!S.user) app.innerHTML = loginSide();
  else if (!S.shop) app.innerHTML = vaelgSide();
  else if (visKalenderSide()) app.innerHTML = kalenderSide();
  else app.innerHTML = ({ dag, maaned, kunder: kunderSide, sms }[S.tab])() + nav();
}
// Henter selv nye aftaler og SMS-status ca. hver 30. min, mens appen er åben (og når man åbner den igen)
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
