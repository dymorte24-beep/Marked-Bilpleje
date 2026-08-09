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
- `index.html` — al markup (hero-slider, søgesektion, lead-formular for butikker)
- `css/style.css` — al styling
- `js/main.js` — before/after-slider, by/ydelses-filter, "Få tilbud"-modal, formularsend, **og butiksdata**
- `privatlivspolitik.html` — GDPR-privatlivspolitik (dataansvarlig: Daniel Mortensen, kontakt dymorte24@gmail.com)
- `tak.html` — kvitteringsside efter formularsend (bruges også som konverteringsmål i Google Ads)
- `logo-bilpleje-dk.png`, `banner-bilpleje-dk.png` — annonce-assets (kvadrat/liggende)
- `netlify.toml` — deploy-config

### Sådan tilføjer du en rigtig butik
Butikskortene er ikke længere hardcodet HTML — de genereres fra et array kaldet `shops` øverst i `js/main.js`. For at tilføje en rigtig butik: tilføj et nyt objekt til arrayet med `name`, `city`, `cityKey` (lowercase, bruges til søgefilter), `services` (liste), `rating`, `reviews`, `verified` og `premium`. Ingen ændringer nødvendig i HTML.

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
- Google-tag (til konverteringssporing): **AW-18378049298** — tilføjet site-wide 9. august 2026, efter Google flagede konverteringshandlingen som uverificeret uden det

## Domæne
- **bilpleje.dk er optaget** siden 1998 (peger på en bilpleje-blog, bilpleje.nu) — ikke muligt at købe
- Valgt fremtidigt domænenavn: **minbilpleje.dk** (bekræftet ledigt 9. august 2026 via punktum.dk). Daniel foretrak det for at det er kort, selvom "min" signalerer enkelt-butik mere end markedsplads — accepteret tradeoff
- Alternativer der også var ledige, hvis minbilpleje.dk siden fortrydes: bilplejemarked.dk, bilplejemarkedet.dk
- Endnu ikke købt — afventer bevist kundeinteresse fra Google Ads-kampagnen først

## Forretningsbeslutninger (vigtigt at huske hvorfor)
- **Intet domæne endnu** — kører bevidst på netlify.app-adressen til at teste om der er kundeinteresse, før der investeres i et .dk-domæne
- **Intet CVR** — kører som privatperson (Daniel Mortensen) indtil videre, ikke en registreret virksomhed
- **Gratis for butikker i opstartsfasen** — bevidst valg om IKKE at bygge betaling/abonnement endnu. Begrundelse: ingen butikker er onboardet endnu, og at bede dem betale for en ubevist tjeneste er en hård sag at sælge. "TOP"-placering forbliver et fremtidigt betalt perk, men sælges ikke aktivt nu. Sitet er opdateret (9. aug 2026) med "Gratis i opstartsfasen"-badge i "For butikker"-sektionen for at gøre dette eksplicit og skabe en naturlig early-access-fortælling
- **Butiksdata er nu data-drevet** (se ovenfor) specifikt for at gøre det let at tilføje rigtige butikker, efterhånden som Daniel finder dem — demo-butikkerne (Glansen Detailing, AutoShine Aarhus, Nordisk Bilpleje, Fyns Bil & Pleje) er stadig placeholder indtil videre

## Ikke lavet endnu / naturlige næste skridt
- Rigtige butiksdata i stedet for demo-cards (nu meget lettere at tilføje, se "Sådan tilføjer du en rigtig butik" ovenfor)
- Køb af minbilpleje.dk, når der er belæg for investeringen
- Betalingsflow for butikker der vil have "TOP"-placering (bevidst udskudt, se forretningsbeslutninger)
- Reel butiksverificering (den grønne "Verificeret"-pille er pt. kun visuel)
- Følge op på Google Ads-performance efter et par dage/uger og justere budget/søgeord
