// Delt mellem forside (main.js), byside (by.html) og profilside (profil.html).
// Profilniveauer: `tier` = 'gratis' er en BASISPROFIL (navn, by, ydelser, kontakt),
// `tier` = 'betalt' er en KOMPLET PROFIL (alt låst op + højere placering).
function isKomplet(row){ return row && row.tier === 'betalt'; }

// Basisprofil: kun navn, by, ydelser, verificeret-mærke og kontakt (telefon/mail) vises.
// Resten af data ligger stadig i databasen og dukker op igen, så snart butikken opgraderes.
function toBasisView(row){
  if (isKomplet(row)) return row;
  return {
    ...row,
    hero_image_url: null, card_image_url: null, tagline: null, description: null,
    price_from: null, discount: null, price_list: null, price_list_verified: false,
    why_choose_us: [], opening_hours: {}, address: null, coverage_areas: null,
    instagram: null, facebook: null, website: null,
    review_rating: null, review_count: null, review_source: null, review_url: null, review_visible: false
  };
}

// ---- Annoncer (tilkøb) ----
// En butik med `ad_active` vises øverst, mærket "Annonce", når kunden søger på en af
// butikkens `ad_cities` — men kun hvis butikken ligger højst AD_MAX_KM fra den søgte by.
// Højst AD_MAX_PER_CITY annoncer pr. søgning. Kræver geo.js (geoKeyFor/geoResolve/geoDistanceKm).
const AD_MAX_KM = 50;
const AD_MAX_PER_CITY = 3;

function pickAds(shopList, origin, searchText){
  if (!origin) return [];
  const searchKeys = new Set([geoKeyFor(origin.navn), geoKeyFor(searchText || '')]);
  return shopList
    .filter(s => (s.adActive ?? s.ad_active) && ((s.adCities ?? s.ad_cities) || []).some(c => searchKeys.has(geoKeyFor(c))))
    .map(s => {
      const p = geoResolve(s.city);
      return { ...s, _distanceKm: p ? geoDistanceKm(origin, p) : null, _ad: true };
    })
    .filter(s => s._distanceKm != null && s._distanceKm <= AD_MAX_KM)
    .sort(() => Math.random() - 0.5)
    .slice(0, AD_MAX_PER_CITY);
}
