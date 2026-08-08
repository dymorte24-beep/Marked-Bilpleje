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
  document.querySelectorAll('.card').forEach(card => {
    const match = !city || card.dataset.city.includes(city);
    card.style.display = match ? 'flex' : 'none';
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
      form.innerHTML = '<p style="color:#fff; font-weight:500; text-align:center; padding:20px 0;">Tak! Vi skriver til dig snarest.</p>';
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
