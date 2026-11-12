// Nyhedsbrev til bilejere: lovlig tilmelding (markedsføringsloven § 10 + GDPR).
// Den tekst, personen sætter flueben ved, gemmes ordret i Supabase som bevis for samtykket.
(function(){
  const URL_ = 'https://xeosltdpvkcaudiijtge.supabase.co';
  const KEY_ = 'sb_publishable_iG0iWu8szH_7-uwErdxN9g_pE9YGFWd';
  const SAMTYKKE_VERSION = 'v1-2026-11-12';
  let client = null;
  function getDb(){
    if (typeof db !== 'undefined') return db;
    if (!client) client = supabase.createClient(URL_, KEY_);
    return client;
  }

  async function submit(e){
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type=submit]');
    const msg = form.querySelector('.nb-msg');
    const email = form.querySelector('[name=email]').value.trim();
    const postnr = (form.querySelector('[name=postnummer]') || {}).value || '';
    const valgte = [...form.querySelectorAll('input[name=interesse]:checked')];
    const honeypot = form.querySelector('[name=bot-field]');
    msg.textContent = '';
    if (honeypot && honeypot.value) return;
    if (!valgte.length){ msg.textContent = 'Sæt flueben ved mindst én af de to slags mails.'; return; }
    // Gem præcis de sætninger, personen satte flueben ved (bevis for samtykke).
    const samtykkeTekst = valgte.map(c => c.closest('label').querySelector('.nb-consent-text').textContent.replace(/\s+/g, ' ').trim()).join(' | ')
      + ' | ' + (form.querySelector('[data-vilkaar]') || {textContent:''}).textContent.replace(/\s+/g, ' ').trim();
    btn.disabled = true; btn.textContent = 'Sender…';
    const { error } = await getDb().rpc('tilmeld_nyhedsbrev', {
      p_email: email, p_postnummer: postnr, p_interesser: valgte.map(c => c.value), p_samtykke_tekst: samtykkeTekst,
      p_samtykke_version: SAMTYKKE_VERSION, p_kilde: form.dataset.kilde || location.pathname
    });
    if (error){
      console.error(error);
      msg.textContent = 'Det gik ikke. Tjek at mailen er skrevet rigtigt, og prøv igen.';
      btn.disabled = false; btn.textContent = form.dataset.btnText || 'Tilmeld mig';
      return;
    }
    if (typeof gtag === 'function') gtag('event', 'newsletter_signup', { kilde: form.dataset.kilde || location.pathname });
    location.href = '/vinterguide.html?tak=1';
  }

  document.querySelectorAll('form.nb-form').forEach(f => {
    f.dataset.btnText = f.querySelector('button[type=submit]').textContent;
    f.addEventListener('submit', submit);
  });
})();
