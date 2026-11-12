// Bysiden /bilpleje/{by}/ — henter og viser bilplejere nær byen.
// Bruges af bilpleje/by.html (alle byer) og faste SEO-sider som bilpleje/odense/index.html.
const SUPABASE_URL = 'https://xeosltdpvkcaudiijtge.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iG0iWu8szH_7-uwErdxN9g_pE9YGFWd';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Bilplejer der kører ud til kunden
function isMobileShop(services){
  return (services || []).some(x => String(x).toLowerCase().includes('mobil'));
}

function formatServicesPreview(services, max = 3){
  const shown = services.slice(0, max);
  const remaining = services.length - shown.length;
  return shown.join(', ') + (remaining > 0 ? ` +${remaining} flere` : '');
}

async function loadCity(){
  const content = document.getElementById('cityContent');
  // Faste SEO-sider (fx /bilpleje/odense/) har allerede titel, overskrift og
  // brødkrummer i HTML'en og angiver byen selv — der fylder vi kun listen ud.
  const staticPage = content.hasAttribute('data-static');
  const parts = window.location.pathname.replace(/^\/|\/$/g, '').split('/');
  const cityKey = content.dataset.city || parts[parts.length - 1];

  const [, { data: allShops, error }] = await Promise.all([
    loadGeoData(),
    db.from('shops').select('*').eq('godkendt', true).order('name')
  ]);

  const breadcrumb = document.getElementById('breadcrumb');

  if (error || !allShops) {
    if (staticPage) { content.innerHTML = '<p class="intro">Kunne ikke hente bilplejere lige nu. Prøv igen om lidt.</p>'; return; }
    content.innerHTML = '<h1>Bilpleje</h1><p class="intro">Kunne ikke hente butikker lige nu.</p>';
    return;
  }

  // Byens navn: brug en lokal butiks eget bynavn hvis vi har en, ellers det
  // officielle postnummer-navn (så fx "skagen" i URL'en bliver til "Skagen").
  const origin = geoResolve(cityKey);
  const localMatch = allShops.find(s => s.city_key === cityKey);
  const cityName = localMatch ? localMatch.city : (origin ? origin.navn : cityKey.charAt(0).toUpperCase() + cityKey.slice(1));

  if (!staticPage) {
    document.title = 'Bilpleje i ' + cityName + ' | FindBilplejere.dk';
    document.getElementById('metaDescription').setAttribute('content', `Find og sammenlign bilpleje-butikker i ${cityName}. Se ydelser og kontakt dem direkte — gratis for kunder.`);
    breadcrumb.innerHTML = `<a href="/index.html">Forside</a><span class="sep">/</span>Bilpleje<span class="sep">/</span>${cityName}`;
  }

  // Ægte km-afstand fra søgt by til hver butiks by — viser altid de nærmeste
  // butikker (fx en butik der dækker "hele Nordjylland"), også når ingen
  // butik har adresse i selve byen.
  const shopsView = allShops.map(s => ({ ...toBasisView(s), komplet: isKomplet(s) }));
  let list = [...shopsView].sort((a, b) => (b.komplet - a.komplet) || a.name.localeCompare(b.name, 'da'));
  let originName = '';
  if (origin) {
    originName = origin.navn;
    list = shopsView
      .map(s => {
        const shopPoint = geoResolve(s.city);
        return { ...s, _distanceKm: shopPoint ? geoDistanceKm(origin, shopPoint) : null };
      })
      .sort((a, b) => ((a._distanceKm ?? Infinity) - (a.komplet ? 10 : 0)) - ((b._distanceKm ?? Infinity) - (b.komplet ? 10 : 0)))
      .slice(0, 12);
    const ads = pickAds(shopsView, origin, cityKey);
    if (ads.length) {
      const adNames = new Set(ads.map(a => a.name));
      list = ads.concat(list.filter(s => !adNames.has(s.name)));
    }
  }

  if (list.length === 0) {
    if (staticPage) { content.innerHTML = '<p class="intro">Ingen bilplejere fundet endnu.</p>'; return; }
    content.innerHTML = `<h1>Bilpleje i ${cityName}</h1><p class="intro">Ingen butikker fundet endnu.</p>`;
    return;
  }

  const fallbackIcon = '<div class="card-media-fallback"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="6"/><path d="M20 20l-5.5-5.5"/></svg></div>';
  const cards = list.map((s, i) => `
    <div class="card${s._ad ? ' card-ad' : ''}" style="animation-delay:${Math.min(i, 8) * 40}ms">
      ${s.profile_url ? `<a class="card-link-overlay" href="/${s.profile_url}" aria-label="Se profil for ${s.name}"></a>` : ''}
      ${(s.card_image_url || s.hero_image_url) ? `<img class="card-media" src="${s.card_image_url || s.hero_image_url}" alt="">` : fallbackIcon}
      <div class="card-body">
        <div class="card-title-row">
          <div class="card-name">${s.name}</div>
          ${s._distanceKm != null ? `<div class="card-distance">${s._distanceKm} km fra ${originName}</div>` : ''}
        </div>
        ${(s.review_rating && s.review_count && s.review_visible !== false) ? `<div class="card-rating"><span class="card-rating-stars" aria-hidden="true">★</span> ${s.review_rating} <span class="card-rating-count">(${s.review_count} anmeldelser${s.review_source ? ' på ' + s.review_source : ''})</span></div>` : ''}
        <div class="card-meta">${s.city} · ${formatServicesPreview(s.services)}</div>
        ${(s._distanceKm > 10 && s.coverage_areas && s.coverage_areas.length <= 40) ? `<div class="card-coverage-note">Dækker ${s.coverage_areas}</div>` : ''}
        <div class="card-tags">
          ${isMobileShop(s.services) ? '<span class="pill mobil">Kommer ud til dig</span>' : ''}
          ${s._ad ? '<span class="pill annonce">Annonce</span>' : ''}
          ${s.verificeret ? '<span class="pill verified">Verificeret</span>' : ''}
          ${s.price_level ? `<span class="pill">${priceLevelHtml(s.price_level)} ${PRICE_LEVEL_NAMES[s.price_level]}</span>` : ''}
        </div>
        <div class="card-actions">
          ${s.profile_url ? `<a class="card-see-more" href="/${s.profile_url}">Se mere</a>` : ''}
        </div>
      </div>
    </div>
  `).join('');

  if (staticPage) { content.innerHTML = `<div class="results">${cards}</div>`; return; }
  content.innerHTML = `
    <h1>Bilpleje i ${cityName}</h1>
    <p class="intro">Find og sammenlign bilpleje-butikker i ${cityName}. Gratis at søge, og du kontakter butikken direkte.</p>
    <div class="results">${cards}</div>
  `;
}
loadCity();
