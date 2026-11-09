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
