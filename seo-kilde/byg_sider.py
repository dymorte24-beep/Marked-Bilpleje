# -*- coding: utf-8 -*-
"""Bygger de faste SEO-sider: bysider på Fyn (/bilpleje/{by}/) og guides (/guide/...).

Kør fra repoets rod:  python3 seo-kilde/byg_sider.py
Teksterne ligger i byer.py og guides.py. Siderne er almindelig HTML, så Google
kan læse al teksten med det samme. Listen over bilplejere hentes stadig live fra
databasen af js/by-side.js, så den altid er opdateret.
"""
import json, os, html, math, re, shutil, urllib.request
from byer import BYER, FYN_BYER_ORDEN, ANDRE_BYER_ORDEN, OMDIRIGERINGER
from guides import GUIDES

ROD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOMÆNE = "https://findbilplejere.dk"
OPDATERET = "2026-11-20"

HEAD_START = """<!DOCTYPE html>
<html lang="da">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-18378049298"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'AW-18378049298');
  gtag('config', 'G-KTK6266STG');
</script>
<script src="/js/kilde.js"></script>
"""

HEAD_FÆLLES = """<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="512x512" href="/favicon-512.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css">
"""

NAV = """<nav>
  <div class="wrap">
    <a href="/" class="logo"><span class="logo-prefix">find</span>bilplejere<span class="logo-suffix">.dk</span></a>
    <div class="nav-links">
      <a href="/#search">Find en bilplejer</a>
      <a href="/guide/">Guides</a>
      <a href="/#shops">For bilplejere</a>
    </div>
    <a href="/#search" class="nav-cta">Find bilplejer</a>
  </div>
</nav>
"""

FOOTER = """<footer>
  <a href="/privatlivspolitik.html">Privatlivspolitik</a> · <a href="/guide/">Guides</a> · <a href="/bilpleje/odense/">Bilpleje i Odense</a> · findbilplejere.dk
</footer>
"""

BY_SCRIPTS = """<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="/js/geo.js"></script>
<script src="/js/profil-niveau.js"></script>
<script src="/js/by-side.js"></script>
"""


def esc(t):
    return html.escape(t, quote=True)


def jsonld(obj):
    return '<script type="application/ld+json">\n' + json.dumps(obj, ensure_ascii=False, indent=1) + "\n</script>\n"


def brødkrummer(items):
    """items: [(navn, url eller None)]"""
    schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": DOMÆNE + (u or "")}
            for i, (n, u) in enumerate(items) if u
        ],
    }
    dele = []
    for n, u in items:
        dele.append(f'<a href="{u}">{esc(n)}</a>' if u and u != items[-1][1] else esc(n))
    synlig = '<span class="sep">/</span>'.join(dele)
    return schema, f'<div class="breadcrumb" id="breadcrumb">{synlig}</div>'


def faq_html(faq):
    schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq
        ],
    }
    items = "\n".join(
        f'    <details class="faq-item">\n      <summary>{esc(q)}</summary>\n      <p>{esc(a)}</p>\n    </details>'
        for q, a in faq
    )
    return schema, f'<div class="faq-list">\n{items}\n    </div>'


def head(titel, beskrivelse, url, og_type="website", ekstra=""):
    return (
        HEAD_START
        + f"<title>{esc(titel)}</title>\n"
        + f'<meta name="description" content="{esc(beskrivelse)}" id="metaDescription">\n'
        + f'<link rel="canonical" href="{DOMÆNE}{url}">\n'
        + f'<meta property="og:title" content="{esc(titel.split(" | ")[0])}">\n'
        + f'<meta property="og:description" content="{esc(beskrivelse)}">\n'
        + f'<meta property="og:url" content="{DOMÆNE}{url}">\n'
        + f'<meta property="og:image" content="{DOMÆNE}/og-image.png">\n'
        + f'<meta property="og:type" content="{og_type}">\n'
        + HEAD_FÆLLES
        + ekstra
    )


def skriv(relsti, indhold):
    sti = os.path.join(ROD, relsti)
    os.makedirs(os.path.dirname(sti), exist_ok=True)
    with open(sti, "w", encoding="utf-8") as f:
        f.write(indhold)
    print("skrev", relsti)


def guide_links(slugs):
    out = []
    for s in slugs:
        g = next(g for g in GUIDES if g["slug"] == s)
        out.append(f'<a href="/guide/{s}/">{esc(g["kort"])}</a>')
    return '<div class="related-links">\n      ' + "\n      ".join(out) + "\n    </div>"


def i_navn(b):
    """'i Odense' eller 'på Vestfyn'."""
    return f'{b.get("praep", "i")} {b["navn"]}'


# ---------- Afstand til nærmeste bilplejer (ægte, lokalt indhold pr. by) ----------
SUPABASE_URL = "https://xeosltdpvkcaudiijtge.supabase.co"
SUPABASE_KEY = "sb_publishable_iG0iWu8szH_7-uwErdxN9g_pE9YGFWd"  # offentlig nøgle, samme som js/by-side.js
_POST = None
_BUTIKKER = None


def _slug(t):
    t = (t or "").strip().split(" ")[0].lower().replace("æ", "e").replace("ø", "o").replace("å", "a")
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def geo(by):
    """Samme regel som js/geo.js: første ord, laveste postnummer."""
    global _POST
    if _POST is None:
        _POST = {}
        for p in json.load(open(os.path.join(ROD, "data", "postnumre.json"), encoding="utf-8")):
            k = _slug(p["navn"])
            if k and (k not in _POST or int(p["nr"]) < int(_POST[k]["nr"])):
                _POST[k] = p
    return _POST.get(_slug(by))


def km(a, b):
    la1, la2 = math.radians(a["lat"]), math.radians(b["lat"])
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin(math.radians(b["lng"] - a["lng"]) / 2) ** 2
    return round(6371 * 2 * math.atan2(math.sqrt(h), math.sqrt(1 - h)))


def butikker_paa_fyn():
    """Godkendte bilplejere med postnummer på Fyn (5000-5999), hentet ved byg."""
    global _BUTIKKER
    if _BUTIKKER is None:
        req = urllib.request.Request(
            SUPABASE_URL + "/rest/v1/shops?select=name,city,services,profile_url&godkendt=eq.true",
            headers={"apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY})
        try:
            alle = json.load(urllib.request.urlopen(req, timeout=20))
        except Exception as e:
            print("ADVARSEL: kunne ikke hente bilplejere, springer afstandstabeller over:", e)
            alle = []
        _BUTIKKER = []
        for s in alle:
            g = geo(s["city"])
            if g and 5000 <= int(g["nr"]) <= 5999:
                _BUTIKKER.append({**s, "_geo": g})
    return _BUTIKKER


def afstand_tabel(b):
    byer = b.get("afstand_fra")
    butikker = butikker_paa_fyn()
    if not byer or not butikker:
        return ""
    rækker = []
    for by in byer:
        g = geo(by)
        if not g:
            print("ADVARSEL: ukendt by i afstand_fra:", by)
            continue
        nærmeste = sorted(butikker, key=lambda s: km(g, s["_geo"]))[:2]
        celler = []
        for s in nærmeste:
            navn = esc(s["name"])
            if s.get("profile_url"):
                navn = f'<a href="/{esc(s["profile_url"])}">{navn}</a>'
            mobil = " · kommer ud" if any("mobil" in str(x).lower() for x in (s.get("services") or [])) else ""
            afst = km(g, s["_geo"])
            afst_txt = "i byen" if afst < 3 else f"{afst} km"
            celler.append(f'{navn} ({esc(s["city"])}, {afst_txt}{mobil})')
        rækker.append(f"        <tr><th>{esc(by)}</th><td>{'<br>'.join(celler)}</td></tr>")
    return (
        f"    <h2>Så langt er der til nærmeste bilplejer {esc(i_navn(b))}</h2>\n"
        '    <div class="seo-text">\n'
        '      <table class="afstand-tabel">\n        <thead><tr><th>Fra</th><th>Nærmeste bilplejere (luftlinje)</th></tr></thead>\n'
        + "\n".join(rækker)
        + f"\n      </table>\n      <p class=\"seo-note\">Opdateret {OPDATERET[8:10]}.{OPDATERET[5:7]}.{OPDATERET[:4]} ud fra bilplejerne på FindBilplejere.dk. Køreafstanden er typisk lidt længere end luftlinjen.</p>\n"
        "    </div>\n\n"
    )


def by_links(udelad):
    out = [
        f'<a href="/bilpleje/{k}/">Bilpleje {esc(i_navn(BYER[k]))}</a>'
        for k in FYN_BYER_ORDEN if k != udelad
    ]
    return '<div class="related-links">\n      ' + "\n      ".join(out) + "\n    </div>"


def nabo_links(naboer):
    out = [f'<a href="/bilpleje/{k}/">Bilpleje i {esc(n)}</a>' for k, n in naboer]
    out.append('<a href="/bilpleje/odense/">Bilpleje i Odense</a>')
    return '<div class="related-links">\n      ' + "\n      ".join(out) + "\n    </div>"


def byg_by(key):
    b = BYER[key]
    url = f"/bilpleje/{key}/"
    krumme_schema, krumme = brødkrummer([("Forside", "/"), (f"Bilpleje {i_navn(b)}", url)])
    faq_schema, faq = faq_html(b["faq"])
    sektioner = ""
    for overskrift, afsnit in b["sektioner"]:
        sektioner += f"    <h2>{esc(overskrift)}</h2>\n    <div class=\"seo-text\">\n{afsnit}\n    </div>\n\n"

    side = (
        head(b["titel"], b["beskrivelse"], url, ekstra=jsonld(faq_schema) + jsonld(krumme_schema))
        + "</head>\n<body>\n\n" + NAV + "\n"
        + '<section class="seo-page">\n  <div class="wrap">\n    ' + krumme + "\n\n"
        + f"    <h1>{esc(b['h1'])}</h1>\n"
        + f"    <p class=\"intro\">{b['intro']}</p>\n\n"
        + f'    <div id="cityContent" data-static data-city="{b.get('origin', key)}">\n      <p class="intro">Henter bilplejere…</p>\n    </div>\n'
        + f'    <p class="seo-note">Listen viser bilplejere nærmest {esc(b["navn"])}, sorteret efter afstand. Klik på en bilplejer for at se ydelser og kontakte dem direkte.</p>\n\n'
        + afstand_tabel(b)
        + sektioner
        + f"    <h2>Ofte stillede spørgsmål om bilpleje {esc(i_navn(b))}</h2>\n    {faq}\n\n"
        + "    <h2>Gode råd før du bestiller</h2>\n    " + guide_links(b.get("guides", [g["slug"] for g in GUIDES][:3])) + "\n\n"
        + (("    <h2>Bilpleje i andre byer på Fyn</h2>\n    " + by_links(key)) if key in FYN_BYER_ORDEN
           else ("    <h2>Bilpleje i nærheden</h2>\n    " + nabo_links(b.get("naboer", []))))
        + "\n\n"
        + f'    <p class="seo-cta">Er du bilplejer {esc(i_navn(b))}? <a href="/#shops">Bliv listet gratis på FindBilplejere.dk</a>.</p>\n'
        + "  </div>\n</section>\n\n" + FOOTER + "\n" + BY_SCRIPTS + "\n</body>\n</html>\n"
    )
    skriv(f"bilpleje/{key}/index.html", side)


def byg_guide(g):
    url = f"/guide/{g['slug']}/"
    krumme_schema, krumme = brødkrummer([("Forside", "/"), ("Guides", "/guide/"), (g["kort"], url)])
    artikel = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": g["h1"],
        "description": g["beskrivelse"],
        "inLanguage": "da",
        "datePublished": OPDATERET,
        "dateModified": OPDATERET,
        "mainEntityOfPage": DOMÆNE + url,
        "image": DOMÆNE + "/og-image.png",
        "author": {"@type": "Organization", "name": "FindBilplejere.dk", "url": DOMÆNE + "/"},
        "publisher": {"@type": "Organization", "name": "FindBilplejere.dk", "logo": {"@type": "ImageObject", "url": DOMÆNE + "/favicon-512.png"}},
    }
    ekstra = jsonld(artikel) + jsonld(krumme_schema)
    faq_blok = ""
    if g.get("faq"):
        faq_schema, faq = faq_html(g["faq"])
        ekstra = jsonld(artikel) + jsonld(faq_schema) + jsonld(krumme_schema)
        faq_blok = f"    <h2>Ofte stillede spørgsmål</h2>\n    {faq}\n\n"
    andre = [x["slug"] for x in GUIDES if x["slug"] != g["slug"]]
    side = (
        head(g["titel"], g["beskrivelse"], url, og_type="article", ekstra=ekstra)
        + "</head>\n<body>\n\n" + NAV + "\n"
        + '<section class="seo-page guide-artikel">\n  <div class="wrap">\n    ' + krumme + "\n\n"
        + '    <p class="nb-eyebrow">Guide · opdateret november 2026</p>\n'
        + f"    <h1>{esc(g['h1'])}</h1>\n"
        + f"    <p class=\"intro\">{g['intro']}</p>\n\n"
        + '    <div class="seo-text">\n' + g["brødtekst"] + "\n    </div>\n\n"
        + faq_blok
        + '    <div class="guide-cta">\n      <h2>Få en professionel til at gøre det ordentligt</h2>\n'
        + f"      <p>{esc(g['cta'])}</p>\n"
        + '      <a href="/#search" class="btn-primary" style="display:inline-block; padding:12px 22px;">Find din bilplejer</a>\n    </div>\n\n'
        + "    <h2>Find en bilplejer på Fyn</h2>\n    " + by_links(None) + "\n\n"
        + "    <h2>Flere guides</h2>\n    " + guide_links(andre) + "\n"
        + "  </div>\n</section>\n\n" + FOOTER + "\n</body>\n</html>\n"
    )
    skriv(f"guide/{g['slug']}/index.html", side)


def byg_guide_oversigt():
    url = "/guide/"
    krumme_schema, krumme = brødkrummer([("Forside", "/"), ("Guides", url)])
    kort = "\n".join(
        f'      <a class="guide-kort" href="/guide/{g["slug"]}/"><strong>{esc(g["h1"])}</strong><span>{esc(g["beskrivelse"])}</span></a>'
        for g in GUIDES
    )
    side = (
        head("Guides til bilpleje: vask, polering, coating og salg | FindBilplejere.dk",
             "Gratis guides til bilejere: vask om vinteren, polering eller coating, klargøring før salg og aflevering af leasingbil.", url,
             ekstra=jsonld(krumme_schema))
        + "</head>\n<body>\n\n" + NAV + "\n"
        + '<section class="seo-page">\n  <div class="wrap">\n    ' + krumme + "\n\n"
        + "    <h1>Guides til bilpleje</h1>\n"
        + '    <p class="intro">Korte, ærlige guides til dig, der vil passe godt på bilen. Skrevet af FindBilplejere.dk ud fra hvad professionelle bilplejere anbefaler.</p>\n\n'
        + '    <div class="guide-kort-liste">\n' + kort + "\n    </div>\n\n"
        + "    <h2>Find en bilplejer på Fyn</h2>\n    " + by_links(None) + "\n\n"
        + '    <p class="seo-cta">Vil du have sæsontips på mail? <a href="/tips">Tilmeld dig gratis her</a>.</p>\n'
        + "  </div>\n</section>\n\n" + FOOTER + "\n</body>\n</html>\n"
    )
    skriv("guide/index.html", side)


def omdirigeringer():
    """Gamle bysider -> områdeside (301). Skrives ind i _redirects mellem
    markørerne, så Google flytter placeringen med over på den nye side."""
    start, slut = "# SEO-OMDIRIGERINGER START (genereres af seo-kilde/byg_sider.py)", "# SEO-OMDIRIGERINGER SLUT"
    linjer = [f"/bilpleje/{fra}/  /bilpleje/{til}/  301!" for fra, til in OMDIRIGERINGER.items()]
    blok = start + "\n" + "\n".join(linjer) + "\n" + slut + "\n"
    sti = os.path.join(ROD, "_redirects")
    tekst = open(sti, encoding="utf-8").read()
    if start in tekst:
        tekst = tekst[:tekst.index(start)] + blok + tekst[tekst.index(slut) + len(slut) + 1:]
    else:
        # Skal stå før /bilpleje/:city/-reglerne, ellers rammer de først.
        anker = "# Nye butikker oprettet via admin-panelet"
        tekst = tekst.replace(anker, blok + "\n" + anker, 1)
    open(sti, "w", encoding="utf-8").write(tekst)
    for fra in OMDIRIGERINGER:
        mappe = os.path.join(ROD, "bilpleje", fra)
        if os.path.isdir(mappe):
            shutil.rmtree(mappe)
            print("slettede gammel side bilpleje/" + fra)


if __name__ == "__main__":
    omdirigeringer()
    for k in FYN_BYER_ORDEN + ANDRE_BYER_ORDEN:
        byg_by(k)
    for g in GUIDES:
        byg_guide(g)
    byg_guide_oversigt()
