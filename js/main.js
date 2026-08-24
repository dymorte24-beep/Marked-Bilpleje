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

async function loadShops(){
  if (!document.getElementById('resultsGrid')) return;
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
    reviewVisible: row.review_visible
  }));
  renderShops();
}

function renderShops(){
  const grid = document.getElementById('resultsGrid');
  grid.innerHTML = shops.map(shop => `
    <div class="card" data-city="${shop.city}" data-services="${shop.services.join(',').toLowerCase()}">
      ${shop.profileUrl ? `<a class="card-link-overlay" href="${shop.profileUrl}" aria-label="Se profil for ${shop.name}"></a>` : ''}
      <div>
        <div class="card-name">${shop.name}</div>
        <div class="card-meta">${shop.city} · ${shop.services.join(', ')}</div>
        <div class="card-tags">
          ${(shop.reviewRating && shop.reviewCount && shop.reviewVisible !== false) ? `<span class="pill">⭐ ${shop.reviewRating} (${shop.reviewCount}${shop.reviewSource ? ' på ' + shop.reviewSource : ''})</span>` : ''}
          ${shop.verificeret ? `<span class="pill verified">Verificeret</span>` : ''}
          ${shop.priceFrom ? `<span class="pill">Fra ${shop.priceFrom} kr.</span>` : ''}
          ${shop.discount ? `<span class="pill discount">${shop.discount}% rabat</span>` : ''}
        </div>
        <button class="card-cta" onclick="openLeadModal('${shop.name.replace(/'/g, "\\'")}')">Få tilbud</button>
      </div>
    </div>
  `).join('');
}
loadShops();

// Before/after slider (kun til stede på forsiden)
const box = document.getElementById('sliderBox');
if (box) {
  const shine = document.querySelector('.layer-shine');
  const handle = document.getElementById('handle');
  let dragging = false;

  const setPos = (clientX) => {
    const rect = box.getBoundingClientRect();
    let pct = ((clientX - rect.left) / rect.width) * 100;
    pct = Math.max(4, Math.min(96, pct));
    shine.style.clipPath = `inset(0 ${100-pct}% 0 0)`;
    handle.style.left = pct + '%';
  };
  box.addEventListener('mousedown', e => { dragging = true; setPos(e.clientX); });
  window.addEventListener('mousemove', e => { if(dragging) setPos(e.clientX); });
  window.addEventListener('mouseup', () => dragging = false);
  box.addEventListener('touchstart', e => setPos(e.touches[0].clientX));
  box.addEventListener('touchmove', e => setPos(e.touches[0].clientX));
}

// City/service filter
function normalizeCity(str){
  return str.toLowerCase().replace(/æ/g,'e').replace(/ø/g,'o').replace(/å/g,'a');
}

function filterCards(){
  const city = normalizeCity(document.getElementById('citySearch').value.trim());
  const service = document.getElementById('serviceSearch').value.trim().toLowerCase();
  let visibleCount = 0;
  document.querySelectorAll('.card').forEach(card => {
    const cityMatch = !city || normalizeCity(card.dataset.city).includes(city);
    const serviceMatch = service === 'alle ydelser' || (card.dataset.services || '').includes(service);
    const visible = cityMatch && serviceMatch;
    card.style.display = visible ? 'flex' : 'none';
    if (visible) visibleCount++;
  });
  track('search', { search_term: city, service, results_count: visibleCount });
}

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
