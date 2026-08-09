# Bilpleje.dk — Projektoverblik

## Hvad er det
Markedsplads-side der forbinder private kunder med bilpleje-butikker i Danmark.
Gratis for kunder, butikker betaler på sigt for listing/topplacering.

## Hvor tingene ligger
- **Lokal projektmappe:** `C:\Users\Daniel\Desktop\bilpleje-dk`
- **GitHub-repo:** https://github.com/dymorte24-beep/Marked-Bilpleje
- **Live side:** https://bilpleje-dk.netlify.app
- **Hosting:** Netlify, auto-deploy ved push til `main`-branchen
- **Google-konto brugt overalt:** dymorte24@gmail.com (Netlify + Google Ads)

## Teknisk stack
Ren HTML/CSS/JS, intet build-step.
- `index.html` — al markup (hero-slider, søgesektion, butikskort, lead-formular for butikker)
- `css/style.css` — al styling
- `js/main.js` — before/after-slider, by/ydelses-filter, "Få tilbud"-modal, formularsend
- `privatlivspolitik.html` — GDPR-privatlivspolitik (dataansvarlig: Daniel Mortensen, kontakt dymorte24@gmail.com)
- `tak.html` — kvitteringsside efter formularsend (bruges også som konverteringsmål i Google Ads)
- `logo-bilpleje-dk.png`, `banner-bilpleje-dk.png` — annonce-assets (kvadrat/liggende)
- `netlify.toml` — deploy-config

## Formularer / leads
- To Netlify Forms: `kunde-lead` ("Få tilbud"-knap på butikskort) og `butik-lead` ("For butikker"-sektion)
- Form detection er aktiveret i Netlify (var slået fra i starten — det var derfor intet virkede først)
- E-mail-notifikation ved enhver indsendelse sendes til **dymorte24@gmail.com**
- Begge formularer redirecter til `tak.html` efter succesfuld indsendelse (nødvendigt for at Google Ads kan måle konvertering på en URL)

## Google Ads
- Kampagne: **Performance Max-2** (Performance Max-type)
- Budget: **40 kr./dag** (bevidst lavt valgt til at teste interesse først)
- Konverteringsmål: "Kunder anmoder om et tilbud" → måler besøg på `bilpleje-dk.netlify.app/tak.html`
- Søgetemaer: Professionel Bilpleje, Rensning Af Bil, Rensning Af Bil Indvendig, Detailing Bilpleje, Lakforsegling Bil, Keramisk Coating Bil
- Lokation: Danmark, sprog: Dansk
- Annoncetekst (overskrifter): "Find Bilpleje Nær Dig", "Keramisk Coating & Polering", "Sammenlign Bilpleje Butikker"
- Status pr. 8. august 2026: **Aktiveret**, kampagnen kørte i gang efter betaling/3D Secure-verificering blev gennemført i brugerens egen browser (Claude-styret browser blev Cloudflare-blokeret på verificeringstrinnet)

## Forretningsbeslutninger (vigtigt at huske hvorfor)
- **Intet domæne endnu** — kører bevidst på netlify.app-adressen til at teste om der er kundeinteresse, før der investeres i et .dk-domæne
- **Intet CVR** — kører som privatperson (Daniel Mortensen) indtil videre, ikke en registreret virksomhed
- **Demo-butiksdata** (Glansen Detailing, AutoShine Aarhus, Nordisk Bilpleje, Fyns Bil & Pleje) er placeholder — ingen rigtige butiksaftaler endnu, udskiftes løbende når/hvis der findes rigtige butikker

## Ikke lavet endnu / naturlige næste skridt
- Rigtige butiksdata i stedet for demo-cards
- Eget domæne (bilpleje.dk el. lign.) når der er belæg for investeringen
- Betalingsflow for butikker der vil have "TOP"-placering
- Reel butiksverificering (den grønne "Verificeret"-pille er pt. kun visuel)
- Følge op på Google Ads-performance efter et par dage/uger og justere budget/søgeord
