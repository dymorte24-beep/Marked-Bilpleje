// Husker hvor den besøgende kom fra (Google-annonce, Google, TikTok osv.) i dette besøg,
// så kontaktklik og profilvisninger kan tælles pr. kilde i Statistik-fanen.
(function(){
  var KEY = 'fb_kilde';
  function find(){
    var p = new URLSearchParams(location.search);
    if (p.get('gclid') || p.get('gbraid') || p.get('wbraid') || (p.get('utm_source') === 'google' && /cpc|ppc|paid/.test(p.get('utm_medium') || ''))) return 'Google-annonce';
    var u = (p.get('utm_source') || '').toLowerCase();
    var ref = '';
    try { ref = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : ''; } catch (e) {}
    var s = u || ref;
    if (!s || ref === location.hostname) return u ? u : 'Direkte';
    if (/deling/.test(u)) return 'Bilplejer delte';
    if (/google\./.test(s) || s === 'google') return 'Google';
    if (/tiktok/.test(s)) return 'TikTok';
    if (/instagram/.test(s)) return 'Instagram';
    if (/facebook|fb\.|^fb$|messenger/.test(s)) return 'Facebook';
    if (/bing|duckduckgo|yahoo|ecosia/.test(s)) return 'Anden søgemaskine';
    if (/mail|newsletter|nyhedsbrev/.test(s)) return 'Mail';
    return 'Anden side';
  }
  try {
    var cur = sessionStorage.getItem(KEY);
    var now = find();
    // Første side i besøget bestemmer kilden. En ny annonce-/kampagnelink overskriver dog.
    if (!cur || (now !== 'Direkte' && now !== cur && /[?&](gclid|gbraid|wbraid|utm_source)=/.test(location.search))) sessionStorage.setItem(KEY, now);
  } catch (e) {}
  window.fbKilde = function(){ try { return sessionStorage.getItem(KEY) || 'Direkte'; } catch (e) { return null; } };
})();
