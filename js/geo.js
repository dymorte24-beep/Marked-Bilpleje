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

function geoDistanceKm(a, b){
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}
