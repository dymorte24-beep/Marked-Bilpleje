// Butikker — tilføj en ny butik ved at tilføje et objekt til denne liste
const shops = [
  { name: "Glansen Detailing", city: "Aarhus C", cityKey: "aarhus", services: ["Keramisk coating", "Polering"], priceFrom: 799, rating: 4.9, reviews: 112, verified: true, premium: true, discount: 10, sampleReview: { text: "Super hurtig og grundig — bilen strålede bagefter.", author: "Mette, Aarhus" }, profileUrl: "bilpleje/aarhus/glansen-detailing/" },
  { name: "AutoShine Aarhus", city: "Aarhus N", cityKey: "aarhus", services: ["Indvendig rens", "Polering"], priceFrom: 349, rating: 4.6, reviews: 54, verified: false, premium: false, sampleReview: { text: "Fair pris og professionelt arbejde hele vejen igennem.", author: "Jonas, Aarhus" }, profileUrl: "bilpleje/aarhus/autoshine-aarhus/" },
  { name: "Nordisk Bilpleje", city: "København S", cityKey: "københavn", services: ["Folie", "Keramisk coating"], priceFrom: 899, rating: 5.0, reviews: 89, verified: true, premium: true, sampleReview: { text: "Anbefaler dem 100% — kommer helt sikkert igen.", author: "Sofie, København" }, profileUrl: "bilpleje/kobenhavn/nordisk-bilpleje/" },
  { name: "Fyns Bil & Pleje", city: "Odense", cityKey: "odense", services: ["Polering", "Indvendig rens"], priceFrom: 399, rating: 4.4, reviews: 31, verified: false, premium: false, sampleReview: { text: "Rigtig god service — bilen så ud som ny.", author: "Peter, Odense" }, profileUrl: "bilpleje/odense/fyns-bil-pleje/" }
];

function renderShops(){
  const grid = document.getElementById('resultsGrid');
  grid.innerHTML = shops.map(shop => `
    <div class="card${shop.premium ? ' premium' : ''}" data-city="${shop.cityKey}" data-services="${shop.services.join(',').toLowerCase()}">
      ${shop.profileUrl ? `<a class="card-link-overlay" href="${shop.profileUrl}" aria-label="Se profil for ${shop.name}"></a>` : ''}
      <div>
        <div class="card-name">${shop.name}</div>
        <div class="card-meta">${shop.city} · ${shop.services.join(', ')}</div>
        <div class="card-tags">
          ${shop.verified ? '<span class="pill verified">Verificeret</span>' : ''}
          <span class="pill">${shop.rating.toFixed(1)} ★ (${shop.reviews})</span>
          <span class="pill">Fra ${shop.priceFrom} kr.</span>
          ${shop.discount ? `<span class="pill discount">${shop.discount}% rabat</span>` : ''}
        </div>
        ${shop.sampleReview ? `<div class="card-review">"${shop.sampleReview.text}" — ${shop.sampleReview.author}</div>` : ''}
        <button class="card-cta" onclick="openLeadModal('${shop.name.replace(/'/g, "\\'")}')">Få tilbud</button>
      </div>
      ${shop.premium ? '<div class="badge-premium">TOP</div>' : ''}
    </div>
  `).join('');
}
renderShops();

// Before/after slider
const box = document.getElementById('sliderBox');
const shine = document.querySelector('.layer-shine');
const handle = document.getElementById('handle');
let dragging = false;

function setPos(clientX){
  const rect = box.getBoundingClientRect();
  let pct = ((clientX - rect.left) / rect.width) * 100;
  pct = Math.max(4, Math.min(96, pct));
  shine.style.clipPath = `inset(0 ${100-pct}% 0 0)`;
  handle.style.left = pct + '%';
}
box.addEventListener('mousedown', e => { dragging = true; setPos(e.clientX); });
window.addEventListener('mousemove', e => { if(dragging) setPos(e.clientX); });
window.addEventListener('mouseup', () => dragging = false);
box.addEventListener('touchstart', e => setPos(e.touches[0].clientX));
box.addEventListener('touchmove', e => setPos(e.touches[0].clientX));

// City/service filter
function filterCards(){
  const city = document.getElementById('citySearch').value.trim().toLowerCase();
  const service = document.getElementById('serviceSearch').value.trim().toLowerCase();
  document.querySelectorAll('.card').forEach(card => {
    const cityMatch = !city || card.dataset.city.includes(city);
    const serviceMatch = service === 'alle ydelser' || (card.dataset.services || '').includes(service);
    card.style.display = (cityMatch && serviceMatch) ? 'flex' : 'none';
  });
}

// Lead modal (customer -> shop request)
const leadModal = document.getElementById('leadModal');

function openLeadModal(shopName){
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

  const body = new URLSearchParams(new FormData(form)).toString();

  fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })
    .then(res => {
      if (!res.ok) throw new Error('Netlify svarede med status ' + res.status);
      window.location.href = 'tak.html?type=kunde';
    })
    .catch(() => {
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
