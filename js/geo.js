// Afstands-hjælper til "søg by" -> "sorter butikker efter nærhed".
// Data: postnumre.json, bygget fra Dataforsyningens offentlige postnummer-API
// (api.dataforsyningen.dk/postnumre) — officielle danske adressedata, ingen nøgle krævet.
let _geoByKey = null;
let _geoRaw = null;
let _geoLoadPromise = null;

function geoSlugify(text){
  return (text || '').toLowerCase()
    .replace(/æ/g,'e').replace(/ø/g,'o').replace(/å/g,'a')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');
}

// Byer/postnumre nøgles kun på FØRSTE ord (samme regel som admin-panelets
// by-nøgle-generator), så "Aarhus C", "Aarhus N" osv. alle rammer "aarhus".
function geoKeyFor(cityText){
  const firstWord = (cityText || '').trim().split(/\s+/)[0] || '';
  return geoSlugify(firstWord);
}

async function loadGeoData(){
  if (_geoLoadPromise) return _geoLoadPromise;
  _geoLoadPromise = (async () => {
    try {
      const res = await fetch('/data/postnumre.json');
      _geoRaw = await res.json();
    } catch (e) {
      console.error('Kunne ikke hente geo-data', e);
      _geoRaw = [];
    }
    _geoByKey = new Map();
    for (const p of _geoRaw) {
      const key = geoKeyFor(p.navn);
      if (!key) continue;
      const existing = _geoByKey.get(key);
      // Ved flere postnumre for samme by (fx "Aarhus C"/"Aarhus N") bruges
      // det laveste postnummer som byens repræsentative punkt.
      if (!existing || parseInt(p.nr, 10) < parseInt(existing.nr, 10)) {
        _geoByKey.set(key, { nr: p.nr, lat: p.lat, lng: p.lng, navn: p.navn.split(' ')[0] });
      }
    }
    return _geoByKey;
  })();
  return _geoLoadPromise;
}

// Slår en by/postnummer op. Skal kaldes efter loadGeoData() er færdig.
function geoResolve(text){
  if (!_geoByKey) return null;
  const trimmed = (text || '').trim();
  if (/^\d{4}$/.test(trimmed) && _geoRaw) {
    const hit = _geoRaw.find(p => p.nr === trimmed);
    if (hit) return { nr: hit.nr, lat: hit.lat, lng: hit.lng, navn: hit.navn.split(' ')[0] };
  }
  const key = geoKeyFor(trimmed);
  return key && _geoByKey.has(key) ? _geoByKey.get(key) : null;
}

function haversineKm(a, b){
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Danmark er delt af vand — en lige linje "hen over havet" undervurderer kraftigt
// hvor langt der reelt er mellem fx Sjælland og Jylland (ingen bro går den vej).
// Klassificeres via postnummer-intervaller (officiel, fast inddeling):
// 1000-4999 Sjælland/Lolland-Falster/Møn, 3700-3799 Bornholm (undtagelse i intervallet),
// 5000-5999 Fyn, 6000-9999 Jylland.
function landmassFromNr(nr){
  const n = parseInt(nr, 10);
  if (!n) return 'ukendt';
  if (n >= 3700 && n <= 3799) return 'bornholm';
  if (n >= 1000 && n <= 4999) return 'sjaelland';
  if (n >= 5000 && n <= 5999) return 'fyn';
  if (n >= 6000 && n <= 9999) return 'jylland';
  return 'ukendt';
}

// Broernes ca. landingspunkter på hver side, brugt som "gennemgangspunkt"
// når to punkter ligger på hver sin landsdel.
const DK_STOREBAELT = { sjaelland: { lat: 55.326, lng: 11.089 }, fyn: { lat: 55.317, lng: 10.807 } };
const DK_LILLEBAELT = { fyn: { lat: 55.505, lng: 9.738 }, jylland: { lat: 55.566, lng: 9.751 } };

// Reel afstand via de rigtige broer i stedet for lige hen over havet, når to
// punkter ligger på hver sin landsdel (Sjælland/Fyn/Jylland). Bornholm og
// ukendte postnumre har ingen bro at regne via og falder tilbage til luftlinje.
function geoDistanceKm(a, b){
  const landA = landmassFromNr(a.nr);
  const landB = landmassFromNr(b.nr);

  if (landA === landB || landA === 'ukendt' || landB === 'ukendt' || landA === 'bornholm' || landB === 'bornholm') {
    return Math.round(haversineKm(a, b));
  }

  const sjael = landA === 'sjaelland' ? a : (landB === 'sjaelland' ? b : null);
  const jyl = landA === 'jylland' ? a : (landB === 'jylland' ? b : null);
  const fynPt = landA === 'fyn' ? a : (landB === 'fyn' ? b : null);

  if (sjael && fynPt) {
    return Math.round(haversineKm(sjael, DK_STOREBAELT.sjaelland) + haversineKm(DK_STOREBAELT.fyn, fynPt));
  }
  if (fynPt && jyl) {
    return Math.round(haversineKm(fynPt, DK_LILLEBAELT.fyn) + haversineKm(DK_LILLEBAELT.jylland, jyl));
  }
  if (sjael && jyl) {
    return Math.round(
      haversineKm(sjael, DK_STOREBAELT.sjaelland) +
      haversineKm(DK_STOREBAELT.fyn, DK_LILLEBAELT.fyn) +
      haversineKm(DK_LILLEBAELT.jylland, jyl)
    );
  }
  return Math.round(haversineKm(a, b));
}
