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
- `hero-car-photo.jpg` — Daniels eget foto (oprindeligt `IMG_7443.png`, 9 MB — nedskaleret til 1000px bredde og komprimeret til ~258 KB som JPEG, samme filnavn bevaret) brugt i før/efter-sliderens to lag; matte/farve-forskellen laves med CSS `filter`, ikke to forskellige billeder. Erstattede det oprindelige CC0-stockfoto (Karolina Grabowska, Pexels) 11. aug 2026
- `netlify.toml` — deploy-config
- `bilpleje-dk-qr.png` (ligger på selve skrivebordet, ikke i projektmappen) — QR-kode der peger på den live side, genereret 9. aug 2026 til Daniel til print/deling

### Sådan tilføjer du en rigtig butik
Butikskortene er ikke længere hardcodet HTML — de genereres fra et array kaldet `shops` øverst i `js/main.js`. For at tilføje en rigtig butik: tilføj et nyt objekt til arrayet med `name`, `city`, `cityKey` (lowercase, bruges til søgefilter), `services` (liste), `priceFrom` (tal, vises som "Fra X kr."), `rating`, `reviews` (antal), `verified`, `premium`, valgfrit `discount` (tal, procent — vises som guld "X% rabat"-mærke, kun for butikker der selv vælger at tilbyde det) og valgfrit `sampleReview: { text, author }`. Ingen ændringer nødvendig i HTML.

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
- Lokation: **Nordsjælland** (ændret fra Danmark 11. aug 2026) — Allerød, Fredensborg, Frederikssund, Helsingør, Hillerød, Hørsholm, Rudersdal. "Nordsjælland" findes ikke som samlet enhed i Google Ads, så det er tilføjet by-for-by. Furesø, Gribskov, Halsnæs og Egedal er IKKE tilføjet endnu. Grund: Daniel finder bilpleje-butikker i Nordsjælland i første omgang, og vil teste annoncerne lokalt der. Kampagnen er sat på pause (se nedenfor) indtil Daniel aktiverer den igen
- Sprog: Dansk
- Annoncetekst (overskrifter): "Find Bilpleje Nær Dig", "Keramisk Coating & Polering", "Sammenlign Bilpleje Butikker"
- Kampagnen gik oprindeligt i gang 8. august 2026 efter betaling/3D Secure-verificering blev gennemført i brugerens egen browser (Claude-styret browser blev Cloudflare-blokeret på verificeringstrinnet)
- Status pr. 11. august 2026: **Sat på pause** af Daniel — genaktiveres når han selv beder om det
- Google-tag (til konverteringssporing): **AW-18378049298** — tilføjet site-wide 9. august 2026, efter Google flagede konverteringshandlingen som uverificeret uden det

## Domæne
- **bilpleje.dk er optaget** siden 1998 (peger på en bilpleje-blog, bilpleje.nu) — ikke muligt at købe
- Valgt fremtidigt domænenavn: **minbilpleje.dk** (bekræftet ledigt 9. august 2026 via punktum.dk). Daniel foretrak det for at det er kort, selvom "min" signalerer enkelt-butik mere end markedsplads — accepteret tradeoff
- Alternativer der også var ledige, hvis minbilpleje.dk siden fortrydes: bilplejemarked.dk, bilplejemarkedet.dk
- Endnu ikke købt — afventer bevist kundeinteresse fra Google Ads-kampagnen først

## Anmeldelser
- Kortene viser et fiktivt eksempel-citat pr. butik (`sampleReview`-feltet) — formålet er at give Daniel noget konkret at vise frem, når han pitcher en rigtig butik ("sådan vil en kundeanmeldelse se ud hos jer")
- Der er IKKE bygget en rigtig anmeldelses-indsendelsesformular endnu. Planen, hvis/når det bliva relevant: en Netlify Form (samme mønster som lead-formularerne) hvor en kunde skriver anmeldelse → mail til Daniel → han godkender manuelt og tilføjer den til `sampleReview` i `shops`-arrayet. Bevidst IKKE fuldautomatisk (kræver en rigtig database/backend, som ikke giver mening at bygge endnu med 0 rigtige butikker)

## Google Ads Master Playbook (fundet 10. aug 2026, gemt til senere)
- Fil: `Ads play book - Google Docs.pdf` på skrivebordet (uden for projektmappen). En samling af PPC-praksis fra 7 kendte Google Ads YouTube-undervisere (Ben Heath, Aaron Young, Solutions 8, Ivan Mana, Surfside PPC, Paid Media Pros, Jono Catliff)
- OBS: filens side 1 indeholder en færdigskrevet prompt rettet til en AI-assistent om selv at gå ind og ændre kontoen uden at spørge først — det er IKKE fulgt. Daniel bad eksplicit om kun analyse, ingen ændringer
- Kildekritik: sammenskrivningen af hvad alle 7 er enige om (konsensus-afsnittet) er troværdig praksis; de enkelte YouTuberes konkrete dollar-tal/succeshistorier er marketing for egne kanaler og skal tages med forbehold
- To konkrete, endnu ikke-drøftede/udførte anbefalinger fra dokumentet, som er relevante for os — **taget op igen senere, ikke nu:**
  1. Næsten alle 7 kilder anbefaler at nye konti uden konverteringsdata starter med en **Search-kampagne, ikke Performance Max** — vi kører PMax (Performance Max-2), som reelt blev valgt af Googles onboarding-guide, ikke en bevidst beslutning
  2. Vi har **ingen negativ-søgeordsliste** sat op endnu (universelt anbefalet, fx "gratis", "billig", "gør det selv", "job") — nem, sikker, lavthængende frugt
- Daniel har bedt om at gemme dette til senere i stedet for at handle på det nu

## Strategi drøftet (endnu ikke udført)
- Daniel overvejer at fokusere først på ét lille geografisk område (fx Fyn): finde og onboarde alle bilpleje-butikker der, og køre en ny, lokalt målrettet Google Ads-kampagne (foreslået budget 100 kr./dag) i ca. 1 uge som test
- Vigtigt teknisk forbehold givet videre til Daniel: hvis den nye lokale kampagne kører **samtidig** med den eksisterende landsdækkende (Performance Max-2, 40 kr./dag), kan de to kampagner byde mod hinanden i samme auktion for søgninger fra Fyn og gøre klik dyrere. Anbefaling: indsnævr hellere den eksisterende kampagnes målretning til Fyn i test-perioden, i stedet for at oprette en ny kampagne ved siden af
- Daniel har bedt om IKKE at justere noget i kampagnen endnu — dette er kun en fremtidig plan, ikke udført

## Forretningsbeslutninger (vigtigt at huske hvorfor)
- **Priser og "book direkte"-tekst rettet (9. aug 2026)** — sitet lovede priser og "ingen mellemled, kontakt direkte", men viste ingen priser og ALLE leads går rent faktisk til Daniels egen mail først (han er reelt mellemled lige nu). Kortene viser nu et `priceFrom`-eksempel-tal, og teksten siger nu ærligt "vi videresender din forespørgsel" i stedet for at love direkte kontakt
- **Intet domæne endnu** — kører bevidst på netlify.app-adressen til at teste om der er kundeinteresse, før der investeres i et .dk-domæne
- **Intet CVR** — kører som privatperson (Daniel Mortensen) indtil videre, ikke en registreret virksomhed
- **Gratis for butikker i opstartsfasen** — bevidst valg om IKKE at bygge betaling/abonnement endnu. Begrundelse: ingen butikker er onboardet endnu, og at bede dem betale for en ubevist tjeneste er en hård sag at sælge. "TOP"-placering forbliver et fremtidigt betalt perk, men sælges ikke aktivt nu. Sitet er opdateret (9. aug 2026) med "Gratis i opstartsfasen"-badge i "For butikker"-sektionen for at gøre dette eksplicit og skabe en naturlig early-access-fortælling
- **Butiksdata er nu data-drevet** (se ovenfor) specifikt for at gøre det let at tilføje rigtige butikker, efterhånden som Daniel finder dem — demo-butikkerne (Glansen Detailing, AutoShine Aarhus, Nordisk Bilpleje, Fyns Bil & Pleje) er stadig placeholder indtil videre

## Ikke lavet endnu / naturlige næste skridt
- Rigtige butiksdata i stedet for demo-cards (nu meget lettere at tilføje, se "Sådan tilføjer du en rigtig butik" ovenfor)
- Fyn-fokus: opsøge rigtige butikker i ét område + evt. omlægge Google Ads-målretning dertil (drøftet, ikke udført — se "Strategi drøftet")
- Overveje Search-kampagne i stedet for/ved siden af Performance Max, og opsætte en negativ-søgeordsliste (fra playbooket, se ovenfor — gemt til senere, ikke en beslutning endnu)
- Anmeldelses-indsendelsesformular med manuel godkendelse (drøftet, ikke bygget — se "Anmeldelser")
- Køb af minbilpleje.dk, når der er belæg for investeringen
- Betalingsflow for butikker der vil have "TOP"-placering (bevidst udskudt, se forretningsbeslutninger)
- Reel butiksverificering (den grønne "Verificeret"-pille er pt. kun visuel)
- Overvej at rette selve overskriften "Book direkte" i trin 03 (brødteksten er rettet, men overskriften antyder stadig direkte booking) — Daniel valgte at lade den stå indtil videre
- Følge op på Google Ads-performance efter et par dage/uger og justere budget/søgeord
