// Butikkerne hentes fra Supabase (se admin-panelet) i stedet for at være hardcodet her.
// OBS: rating/anmeldelser/verificeret-mærke vises bevidst IKKE offentligt endnu —
// kun når der findes ægte, kildehenviste tal (fx en rigtig Trustpilot-profil), ikke opfundne.
const SUPABASE_URL = 'https://xeosltdpvkcaudiijtge.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iG0iWu8szH_7-uwErdxN9g_pE9YGFWd';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Sender hændelser til Google-tagget, hvis det er indlæst på siden (ikke alle sider har det endnu).
// Fejler aldrig højlydt — sporing må ikke kunne vælte den funktion, den sidder på.
function track(name, params){
  if (typeof gtag === 'function') gtag('event', name, params || {});
}

let shops = [];
let wizardAnswers = null;

function formatServicesPreview(services, max = 3){
  const shown = services.slice(0, max);
  const remaining = services.length - shown.length;
  return shown.join(', ') + (remaining > 0 ? ` +${remaining} flere` : '');
}

async function loadShops(){
  if (!document.getElementById('resultsGrid')) return;
  loadGeoData();
  const { data, error } = await db.from('shops').select('*').eq('godkendt', true).order('name');
  if (error) {
    console.error('Kunne ikke hente butikker fra databasen', error);
    return;
  }
  shops = data.map(row => ({
    name: row.name,
    city: row.city,
    cityKey: row.city_key,
    services: row.services,
    priceFrom: row.price_from,
    discount: row.discount,
    verificeret: row.verificeret,
    profileUrl: row.profile_url,
    reviewRating: row.review_rating,
    reviewCount: row.review_count,
    reviewSource: row.review_source,
    reviewVisible: row.review_visible,
    heroImageUrl: row.hero_image_url,
    coverageAreas: row.coverage_areas
  }));
  renderShops();
}

function renderShops(list, originName){
  const grid = document.getElementById('resultsGrid');
  if (!grid) return;
  if (!list) list = wizardAnswers ? scoredShopOrder() : shops;
  if (list.length === 0) {
    grid.innerHTML = '<p class="empty-state">Ingen butikker fundet endnu — vi udvider løbende med flere byer og butikker.</p>';
    return;
  }
  const fallbackIcon = '<div class="card-media-fallback"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="6"/><path d="M20 20l-5.5-5.5"/></svg></div>';
  grid.innerHTML = list.map((shop, i) => `
    <div class="card" style="animation-delay:${Math.min(i, 8) * 40}ms">
      ${shop.profileUrl ? `<a class="card-link-overlay" href="${shop.profileUrl}" aria-label="Se profil for ${shop.name}"></a>` : ''}
      ${shop.heroImageUrl ? `<img class="card-media" src="${shop.heroImageUrl}" alt="">` : fallbackIcon}
      <div class="card-body">
        <div class="card-title-row">
          <div class="card-name">${shop.name}</div>
          ${shop._distanceKm != null ? `<div class="card-distance">${shop._distanceKm} km fra ${originName}</div>` : ''}
        </div>
        <div class="card-meta">${shop.city} · ${formatServicesPreview(shop.services)}</div>
        ${(shop._distanceKm > 10 && shop.coverageAreas && shop.coverageAreas.length <= 40) ? `<div class="card-coverage-note">Dækker ${shop.coverageAreas}</div>` : ''}
        <div class="card-tags">
          ${(shop.reviewRating && shop.reviewCount && shop.reviewVisible !== false) ? `<span class="pill">⭐ ${shop.reviewRating} (${shop.reviewCount}${shop.reviewSource ? ' på ' + shop.reviewSource : ''})</span>` : ''}
          ${shop.verificeret ? `<span class="pill verified">Verificeret</span>` : ''}
          ${shop.priceFrom ? `<span class="pill">Fra ${shop.priceFrom} kr.</span>` : ''}
          ${shop.discount ? `<span class="pill discount">${shop.discount}% rabat</span>` : ''}
        </div>
        <div class="card-actions">
          ${shop.profileUrl ? `<a class="card-see-more" href="${shop.profileUrl}">Se mere</a>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}
loadShops();

// Hero "sådan virker det" stepper (kun til stede på forsiden)
function initHeroHiw(){
  const box = document.getElementById('heroHiw');
  if (!box) return;
  const steps = box.querySelectorAll('.hiw-step');
  const dots = box.querySelectorAll('.hiw-dot');
  let current = 0;
  let timer = null;

  function show(i){
    steps[current].classList.remove('is-active');
    dots[current].classList.remove('is-active');
    current = i;
    steps[current].classList.add('is-active');
    dots[current].classList.add('is-active');
  }
  function next(){ show((current + 1) % steps.length); }
  function stop(){ if (timer) clearInterval(timer); timer = null; }
  function start(){
    stop();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer = setInterval(next, 3200);
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { show(i); start(); });
  });
  box.addEventListener('mouseenter', stop);
  box.addEventListener('mouseleave', start);

  start();
}
initHeroHiw();

// City/service filter
function normalizeCity(str){
  return str.toLowerCase().replace(/æ/g,'e').replace(/ø/g,'o').replace(/å/g,'a');
}

async function filterCards(){
  const cityRaw = document.getElementById('citySearch').value.trim();
  const service = document.getElementById('serviceSearch').value.trim().toLowerCase();
  const grid = document.getElementById('resultsGrid');

  let list = shops.filter(shop => service === 'alle ydelser' || shop.services.some(s => s.toLowerCase().includes(service)));
  let originName = '';

  if (cityRaw) {
    await loadGeoData();
    const origin = geoResolve(cityRaw);
    if (origin) {
      // Ægte km-afstand: viser altid de nærmeste butikker, også uden for søgt by
      // (fx en butik der dækker "hele Nordjylland" ved søgning på en anden Nordjylland-by).
      originName = origin.navn;
      list = list
        .map(shop => {
          const shopPoint = geoResolve(shop.city);
          return { ...shop, _distanceKm: shopPoint ? geoDistanceKm(origin, shopPoint) : null };
        })
        .sort((a, b) => (a._distanceKm ?? Infinity) - (b._distanceKm ?? Infinity));
    } else {
      // Ukendt by/postnummer — falder tilbage til simpelt tekst-match på bynavn.
      const cityNorm = normalizeCity(cityRaw);
      list = list.filter(shop => normalizeCity(shop.city).includes(cityNorm));
    }
  }

  if (list.length === 0) {
    if (grid) grid.innerHTML = '';
  } else {
    renderShops(list, originName);
  }
  const noResults = document.getElementById('noResults');
  if (noResults) noResults.style.display = list.length === 0 ? 'block' : 'none';
  track('search', { search_term: cityRaw, service, results_count: list.length });
}

// Onboarding-wizard (popup ved landing) — sorterer eksisterende butiksdata,
// filtrerer/skjuler intet, og bruger kun felter der allerede findes.
const WIZARD_SERVICES = ['Polering','Keramisk coating','Indvendig rens','Udvendig klargøring','Lakforsegling/voks','Sæderens','Damprens','Ozonbehandling','Mobil bilpleje'];
const WIZARD_SERVICE_ALIAS = { 'Udvendig klargøring': 'Udvendig rens' };
const WIZARD_PRIORITIES = ['Pris','Gode anmeldelser','Placering','Rabat','Kvalitet'];

function scoredShopOrder(){
  const { city, service, priority } = wizardAnswers;
  const cityNorm = city ? normalizeCity(city) : '';
  const mappedService = WIZARD_SERVICE_ALIAS[service] || service;

  const score = (shop) => {
    let s = 0;
    const cityMatch = cityNorm && normalizeCity(shop.city).includes(cityNorm);
    if (cityMatch) s += 1000;
    if (mappedService && shop.services.includes(mappedService)) s += 500;
    if (priority === 'Pris' && shop.priceFrom) s += Math.max(0, 500 - shop.priceFrom);
    if (priority === 'Gode anmeldelser' && shop.reviewRating && shop.reviewVisible !== false) s += shop.reviewRating * 100 + Math.min(shop.reviewCount || 0, 100);
    if (priority === 'Placering' && cityMatch) s += 300;
    if (priority === 'Rabat' && shop.discount) s += shop.discount * 20;
    if (priority === 'Kvalitet') s += (shop.verificeret ? 200 : 0) + (shop.reviewRating ? shop.reviewRating * 50 : 0);
    return s;
  };
  return [...shops].sort((a, b) => score(b) - score(a));
}

function initWizard(){
  const modal = document.getElementById('wizardModal');
  if (!modal || sessionStorage.getItem('wizardShown')) return;

  document.getElementById('wizardServiceOptions').innerHTML = WIZARD_SERVICES.map(s =>
    `<button class="wizard-option" onclick="wizardChooseService('${s.replace(/'/g, "\\'")}')">${s}</button>`
  ).join('');
  document.getElementById('wizardPriorityOptions').innerHTML = WIZARD_PRIORITIES.map(p =>
    `<button class="wizard-option" onclick="wizardChoosePriority('${p.replace(/'/g, "\\'")}')">${p}</button>`
  ).join('');

  sessionStorage.setItem('wizardShown', '1');
  setTimeout(() => modal.classList.add('open'), 600);
}

function wizardGoToStep(step){
  [1, 2, 3].forEach(n => {
    document.getElementById('wizardStep' + n).style.display = (n === step) ? 'block' : 'none';
  });
}

function wizardStep1Next(){
  wizardAnswers = { city: document.getElementById('wizardCity').value.trim(), service: '', priority: '' };
  wizardGoToStep(2);
}

function wizardChooseService(service){
  wizardAnswers.service = service;
  wizardGoToStep(3);
}

function wizardChoosePriority(priority){
  wizardAnswers.priority = priority;
  finishWizard();
}

function skipWizard(){
  document.getElementById('wizardModal').classList.remove('open');
}

function finishWizard(){
  skipWizard();
  const cityInput = document.getElementById('citySearch');
  const serviceSelect = document.getElementById('serviceSearch');
  if (wizardAnswers.city) cityInput.value = wizardAnswers.city;
  if (wizardAnswers.service) serviceSelect.value = WIZARD_SERVICE_ALIAS[wizardAnswers.service] || wizardAnswers.service;
  track('wizard_completed', wizardAnswers);
  renderShops();
  document.getElementById('search').scrollIntoView({ behavior: 'smooth' });
}

initWizard();

// Lead modal (customer -> shop request)
const leadModal = document.getElementById('leadModal');

function openLeadModal(shopName){
  track('lead_cta_click', { shop_name: shopName });
  db.from('butik_klik').insert({ butik: shopName }).then(({ error }) => {
    if (error) console.error('Kunne ikke logge klik', error);
  });
  document.getElementById('modalShopName').textContent = 'Få tilbud fra ' + shopName;
  document.getElementById('modalButikField').value = shopName;
  document.querySelector('#leadModal form').reset();
  document.getElementById('modalButikField').value = shopName;
  const submitBtn = document.querySelector('#leadModal button[type="submit"]');
  submitBtn.disabled = false;
  submitBtn.textContent = 'Send forespørgsel';
  const err = document.querySelector('#leadModal .lead-error');
  if (err) err.remove();
  leadModal.classList.add('open');
}

function closeLeadModal(){
  leadModal.classList.remove('open');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLeadModal();
});

function handleCustomerLeadSubmit(e){
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sender...';

  const formData = new FormData(form);
  const body = new URLSearchParams(formData).toString();

  // Gemmes også i databasen til admin-panelet. Ventes ind sammen med mail-afsendelsen
  // nedenfor, så siden ikke skifter væk og afbryder database-kaldet, før det er færdigt.
  const dbInsert = db.from('tilbud_anmodninger').insert({
    butik: formData.get('butik'),
    navn: formData.get('navn'),
    kontakt: formData.get('kontakt'),
    besked: formData.get('besked')
  }).then(({ error }) => {
    if (error) console.error('Kunne ikke gemme forespørgslen i databasen', error);
  });

  const netlifySubmit = fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  Promise.allSettled([dbInsert, netlifySubmit]).then(([, netlifyResult]) => {
    if (netlifyResult.status === 'fulfilled' && netlifyResult.value.ok) {
      track('generate_lead', { shop_name: formData.get('butik') });
      window.location.href = '/tak.html?type=kunde';
      return;
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send forespørgsel';
    let err = form.querySelector('.lead-error');
    if (!err) {
      err = document.createElement('p');
      err.className = 'lead-error';
      form.appendChild(err);
    }
    err.textContent = 'Der gik noget galt. Prøv igen om lidt.';
  });
}

// Lead form -> Netlify Forms (AJAX submit, no page reload)
function handleLeadSubmit(e){
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sender...';

  const body = new URLSearchParams(new FormData(form)).toString();

  fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })
    .then(res => {
      if (!res.ok) throw new Error('Netlify svarede med status ' + res.status);
      window.location.href = 'tak.html?type=butik';
    })
    .catch(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send og hør mere';
      let err = form.querySelector('.lead-error');
      if (!err) {
        err = document.createElement('p');
        err.className = 'lead-error';
        form.appendChild(err);
      }
      err.textContent = 'Der gik noget galt. Prøv igen om lidt.';
    });
}
