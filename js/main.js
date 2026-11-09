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
  shops = data.map(toBasisView).map(row => ({
    name: row.name,
    komplet: isKomplet(row),
    adActive: row.ad_active,
    adCities: row.ad_cities,
    city: row.city,
    cityKey: row.city_key,
    services: row.services,
    priceFrom: row.price_from,
    priceLevel: row.price_level,
    discount: row.discount,
    verificeret: row.verificeret,
    profileUrl: row.profile_url,
    reviewRating: row.review_rating,
    reviewCount: row.review_count,
    reviewSource: row.review_source,
    reviewVisible: row.review_visible,
    heroImageUrl: row.hero_image_url,
    cardImageUrl: row.card_image_url,
    coverageAreas: row.coverage_areas
  }));
  renderShops();
}

function renderShops(list, originName, ads){
  const grid = document.getElementById('resultsGrid');
  if (!grid) return;
  if (!list) list = wizardAnswers ? scoredShopOrder() : [...shops].sort((a, b) => (b.komplet - a.komplet) || a.name.localeCompare(b.name, 'da'));
  ads = ads || [];
  if (ads.length) {
    const adNames = new Set(ads.map(a => a.name));
    list = ads.concat(list.filter(s => !adNames.has(s.name)));
  }
  if (list.length === 0) {
    grid.innerHTML = '<p class="empty-state">Ingen butikker fundet endnu — vi udvider løbende med flere byer og butikker.</p>';
    return;
  }
  const fallbackIcon = '<div class="card-media-fallback"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="6"/><path d="M20 20l-5.5-5.5"/></svg></div>';
  grid.innerHTML = list.map((shop, i) => `
    <div class="card${shop._ad ? ' card-ad' : ''}" style="animation-delay:${Math.min(i, 8) * 40}ms">
      ${shop.profileUrl ? `<a class="card-link-overlay" href="${shop.profileUrl}" aria-label="Se profil for ${shop.name}"></a>` : ''}
      ${(shop.cardImageUrl || shop.heroImageUrl) ? `<img class="card-media" src="${shop.cardImageUrl || shop.heroImageUrl}" alt="">` : fallbackIcon}
      <div class="card-body">
        <div class="card-title-row">
          <div class="card-name">${shop.name}</div>
          ${shop._distanceKm != null ? `<div class="card-distance">${shop._distanceKm} km fra ${originName}</div>` : ''}
        </div>
        <div class="card-meta">${shop.city} · ${formatServicesPreview(shop.services)}</div>
        ${(shop._distanceKm > 10 && shop.coverageAreas && shop.coverageAreas.length <= 40) ? `<div class="card-coverage-note">Dækker ${shop.coverageAreas}</div>` : ''}
        <div class="card-tags">
          ${(shop.reviewRating && shop.reviewCount && shop.reviewVisible !== false) ? `<span class="pill">⭐ ${shop.reviewRating} (${shop.reviewCount}${shop.reviewSource ? ' på ' + shop.reviewSource : ''})</span>` : ''}
          ${shop._ad ? `<span class="pill annonce">Annonce</span>` : ''}
          ${shop.verificeret ? `<span class="pill verified">Verificeret</span>` : ''}
          ${shop.priceLevel ? `<span class="pill">${priceLevelHtml(shop.priceLevel)} ${PRICE_LEVEL_NAMES[shop.priceLevel]}</span>` : ''}
        </div>
        <div class="card-actions">
          ${shop.profileUrl ? `<a class="card-see-more" href="${shop.profileUrl}">Se mere</a>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}
loadShops();

// City/service filter
function normalizeCity(str){
  return str.toLowerCase().replace(/æ/g,'e').replace(/ø/g,'o').replace(/å/g,'a');
}

async function filterCards(){
  const cityRaw = document.getElementById('citySearch').value.trim();
  const service = document.getElementById('serviceSearch').value.trim().toLowerCase();
  const grid = document.getElementById('resultsGrid');

  const placeEl = document.getElementById('placeSearch');
  const onlyMobile = placeEl && placeEl.value === 'mobil';
  let list = shops.filter(shop => service === 'alle ydelser' || shop.services.some(s => s.toLowerCase().includes(service)));
  if (onlyMobile) list = list.filter(shop => shop.services.some(s => s.toLowerCase().includes('mobil')));
  let originName = '';
  let ads = [];

  if (cityRaw) {
    await loadGeoData();
    const origin = geoResolve(cityRaw);
    if (origin) {
      // Ægte km-afstand: viser altid de nærmeste butikker, også uden for søgt by
      // (fx en butik der dækker "hele Nordjylland" ved søgning på en anden Nordjylland-by).
      originName = origin.navn;
      ads = pickAds(list, origin, cityRaw);
      if (ads.length) track('ad_impression', { search_term: cityRaw, shops: ads.map(a => a.name).join(', ') });
      list = list
        .map(shop => {
          const shopPoint = geoResolve(shop.city);
          return { ...shop, _distanceKm: shopPoint ? geoDistanceKm(origin, shopPoint) : null };
        })
        // Komplette profiler rykkes op i forhold til basisprofiler i nogenlunde samme afstand
        // (10 km forspring), men en butik langt væk slår aldrig en, der ligger lige ved siden af.
        .sort((a, b) => ((a._distanceKm ?? Infinity) - (a.komplet ? 10 : 0)) - ((b._distanceKm ?? Infinity) - (b.komplet ? 10 : 0)));
    } else {
      // Ukendt by/postnummer — falder tilbage til simpelt tekst-match på bynavn.
      const cityNorm = normalizeCity(cityRaw);
      list = list.filter(shop => normalizeCity(shop.city).includes(cityNorm));
    }
  }

  if (list.length === 0) {
    if (grid) grid.innerHTML = '';
  } else {
    renderShops(list, originName, ads);
  }
  const noResults = document.getElementById('noResults');
  if (noResults) noResults.style.display = list.length === 0 ? 'block' : 'none';
  track('search', { search_term: cityRaw, service, place: onlyMobile ? 'mobil' : 'alle', results_count: list.length });
  // Gemmes også i egen tabel, så statistik-appen kan vise hvilke byer folk søger i.
  db.from('soegninger').insert({ by: cityRaw.slice(0, 80) || null, ydelse: service.slice(0, 80) || null, antal_resultater: list.length }).then(({ error }) => {
    if (error) console.error('Kunne ikke logge søgning', error);
  });
}

// Søgning fra toppen: filtrér og rul ned til resultaterne.
async function heroSearch(){
  await filterCards();
  const target = document.getElementById('search');
  if (target) target.scrollIntoView({ behavior: 'smooth' });
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
    if (priority === 'Pris' && shop.priceLevel) s += (4 - shop.priceLevel) * 100;
    if (priority === 'Gode anmeldelser' && shop.reviewRating && shop.reviewVisible !== false) s += shop.reviewRating * 100 + Math.min(shop.reviewCount || 0, 100);
    if (priority === 'Placering' && cityMatch) s += 300;
    if (priority === 'Rabat' && shop.discount) s += shop.discount * 20;
    if (priority === 'Kvalitet') s += (shop.verificeret ? 200 : 0) + (shop.reviewRating ? shop.reviewRating * 50 : 0);
    if (shop.komplet) s += 150;
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

// Direkte kontakt (ring / mail / hjemmeside). FindBilplejere er et katalog, ikke mellemled:
// kunden kontakter butikken direkte. Hvert klik logges i `butik_klik`, så butikken kan se
// i statistikken, hvor mange kunder siden har sendt videre til dem.
function trackContact(shopName, method){
  track('contact_click', { shop_name: shopName, method });
  db.from('butik_klik').insert({ butik: shopName, metode: method || null }).then(({ error }) => {
    if (error) console.error('Kunne ikke logge klik', error);
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
