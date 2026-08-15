# Bilpleje.dk — Projektoverblik

## Hvad er det
Markedsplads-side der forbinder private kunder med bilpleje-butikker i Danmark.
Gratis for kunder, butikker betaler på sigt for listing/topplacering.

## ⚠ Google Ads-konto suspenderet (14.-15. aug 2026) — VIGTIGT
Kontoen blev suspenderet med begrundelsen **"Uacceptabel forretningspraksis"** (grov overtrædelse). Årsag (mest sandsynlig, ud fra Googles egen politiktekst om "urigtige oplysninger om din virksomhed"): annoncerne kørte til en side med **fiktive tillids-signaler** på de 4 demo-butikker, der så ægte ud:
- "Verificeret"-mærke på butikker, der ikke er rigtige/tilmeldte
- Fiktive ratings/anmeldelsestal (fx "4.9 ★ (112)")
- Fiktive navngivne kunde-citater ("Mette, Aarhus" m.fl.)
- Fiktive "facts" på profilsider (fx "8+ års erfaring", "500+ biler behandlet", "Certificeret coating-partner")
- `aggregateRating` i LocalBusiness structured data (schema.org) — maskinlæsbar falsk rating, sandsynligvis den mest alvorlige enkeltfaktor
- "TOP"/rabat-mærker der antyder en reel, betalt aftale med en ikke-eksisterende butik
- Samme stock-foto genbrugt som "galleri" for to forskellige "butikker"

**Fix udført (15. aug 2026):** Alle ovenstående fjernet fra hele sitet (forside, alle 3 bysider, alle 4 profilsider, alle 7 ydelse-sider). Tilbage er kun: navn, by, ydelser, et eksempel-prisniveau (nu tydeligt mærket "Eksempelpris"), og en synlig bjælke der siger sitet er under opbygning og butikkerne er eksempler. `aggregateRating` og hele LocalBusiness-blokken er fjernet fra JSON-LD på alle 4 profilsider (BreadcrumbList beholdt, den er bare navigation, ingen påstand om en virksomhed).

**Status:** Rettelserne er pushet live og bekræftet på den rigtige produktionsside. Appel indsendt til Google 15. aug 2026 (Daniel gennemførte selv reCAPTCHA'en og tryk på Send). Google svarer normalt inden for 1-3 hverdage, kan tage længere. Kampagnen er fortsat sat på pause, indtil kontoen forhåbentlig genåbnes.

**Lærdom fremadrettet:** Når rigtige butikker tilmeldes, må rating/anmeldelser/verificeret-status kun vises, hvis tallene er ægte (fx fra en rigtig Google-anmeldelse butikken selv leverer dokumentation for) — aldrig eksempeltal på en side, der er mål for betalt trafik.

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
- `google0a9e92bd80e0a852.html` — Google Search Console-verifikationsfil, må IKKE slettes (se "Google Search Console" nedenfor)
- `bilpleje-dk-qr.png` (ligger på selve skrivebordet, ikke i projektmappen) — QR-kode der peger på den live side, genereret 9. aug 2026 til Daniel til print/deling
- `bilpleje/`, `keramisk-coating/`, `polering/`, `indvendig-rens/`, `folie/` — SEO-sider (by/ydelse/virksomhed), se "SEO-motor" nedenfor. Alle `noindex` (testdata)
- `sitemap.xml`, `robots.txt` — se "SEO-motor" nedenfor

## SEO-motor: by/ydelse/virksomheds-sider (bygget 11. aug 2026, pushet live 14. aug 2026 — TESTDATA, ikke søge-klar)
**Status:** Alle filer er pushet til GitHub og ligger nu offentligt på `bilpleje-dk.netlify.app` (commit `7209e5e`). "Offentligt tilgængelig" ≠ "indekseret" — alle 14 nye sider er stadig `noindex`, så Google viser dem ikke i søgeresultater, selvom de kan besøges direkte via URL.
Fuld lokal-SEO-struktur bygget efter Daniels detaljerede spec (inspireret af et dokument om "FindBilpleje.dk" — det navn/de tre rigtige virksomheder i dokumentet, Shine Wash/CH CarCare/GG AutoCare, er **bevidst IKKE brugt**. Kun de eksisterende 4 testbutikker fra `shops`-arrayet indgår).

**Arkitektur-beslutning:** Ingen framework/build-værktøj findes i projektet (og intet Node.js på maskinen), så "fuldautomatisk dynamisk routing" (det spec'en egentlig bad om) er ikke muligt endnu. Løsningen er statiske HTML-filer, hånd/AI-genereret pr. by/ydelse/virksomhed — holdbart ved nuværende skala (4 butikker), men bliver en flaskehals ved 100+ butikker. Den beslutning tages når/hvis I når dertil.

**URL-struktur** (mappe + `index.html` = pæne URL'er uden `.html`, virker automatisk på Netlify):
- Bysider: `/bilpleje/aarhus/`, `/bilpleje/kobenhavn/`, `/bilpleje/odense/`
- Virksomhedssider: `/bilpleje/aarhus/glansen-detailing/`, `/bilpleje/aarhus/autoshine-aarhus/`, `/bilpleje/kobenhavn/nordisk-bilpleje/`, `/bilpleje/odense/fyns-bil-pleje/`
- Ydelse+by (kun hvor der er et reelt match — ingen tomme sider): `/keramisk-coating/aarhus/`, `/polering/aarhus/`, `/indvendig-rens/aarhus/`, `/keramisk-coating/kobenhavn/`, `/folie/kobenhavn/`, `/polering/odense/`, `/indvendig-rens/odense/`

**Hver side har:** unik title/meta description, klikbare breadcrumbs, BreadcrumbList structured data, canonical tag, og på virksomhedssider LocalBusiness structured data (kun tal der allerede findes i `shops`-arrayet — intet opfundet).

**Virksomhedssider har to niveauer** (samme mønster som de tidligere mockups):
- **Verificeret** (Glansen Detailing, Nordisk Bilpleje): 2 billeder + "facts"-grid (fx "8+ års erfaring")
- **Ikke-verificeret** (AutoShine Aarhus, Fyns Bil & Pleje): kun navn, ydelser, pris, anmeldelse

**KRITISK — alt er `noindex` lige nu:** Alle 14 nye sider har `<meta name="robots" content="noindex">`, præcis som privatlivspolitik/tak-siderne. Google indekserer IKKE testdataen. `sitemap.xml` indeholder alle siderne til test af selve mekanismen, men må **ikke indsendes til Search Console** før testdata er erstattet med rigtige butikker og noindex er fjernet de rigtige steder. `robots.txt` er permissiv (blokerer intet — noindex-tags gør arbejdet).

**Ændringer i eksisterende filer (design/funktionalitet upåvirket, testet):**
- `js/main.js`: hvert shop-objekt har nu et `profileUrl`-felt. Hele butikskortet (ikke kun navnet) linker nu til profilsiden, via et usynligt `.card-link-overlay`-lag der dækker hele kortet. "Få tilbud"-knappen ligger over overlayet (z-index) og åbner stadig modalen uden at navigere væk — testet ved klik direkte på knappen. Søgefilter testet og virker uændret
- `css/style.css`: tilføjet `.seo-page`, `.breadcrumb`, `.related-links`, `.card-link-overlay` (rent additivt). `.card` fik `position:relative`, `.card-cta` fik `position:relative; z-index:2` (nødvendigt for at overlayet ikke blokerer knappen)
- De 12 butikskort på de 10 nye SEO-sider (bysider + ydelse-sider) har samme "hele kortet er klikbart"-mønster
- De to gamle mockup-filer i `butik/`-mappen er slettet (afløst af den rigtige struktur under `/bilpleje/`)

**Fejlsøgning 14. aug 2026 — "klikker Glansen Detailing, lander på Odense":** Testet grundigt på den live production-side (ikke kun lokalt): (1) direkte klik på Glansen Detailing-kortet på `/bilpleje/aarhus/`-bysiden → lander korrekt på Glansen-profilen; (2) samme test fra forsidens søgeresultater → samme korrekte resultat; (3) alle 4 kort-links inspiceret direkte i DOM'en (`getBoundingClientRect()`) — hver overlay har korrekt href og ingen af kortenes klik-områder overlapper hinanden. Ingen fejl fundet i koden. Tjekkede også om hero-billedet kunne forårsage layout-shift (som kan give fejlklik hvis siden "hopper" lige efter man trykker) — det gør det ikke, `.slider-box` har `aspect-ratio:4/3` sat, så pladsen er reserveret før billedet loader. Konklusion: koden er korrekt. Hvis det sker igen, brug for gerne: enhed (mobil/computer), browser, og præcis hvor på kortet der blev trykket.

**Næste skridt når Daniel er klar:**
1. Erstat testdata med de tre rigtige virksomheder (Shine Wash, CH CarCare, GG AutoCare) i `shops`-arrayet + generér deres sider efter samme mønster
2. Fjern `noindex` fra de sider der har rigtigt indhold
3. Indsend `sitemap.xml` til Google Search Console
4. Overvej "om os"-tekst-felt i butiks-optag-skemaet, så rigtige butikker leverer rigtig beskrivelsestekst i stedet for eksempeltekst

### Sådan tilføjer du en rigtig butik (OPDATERET 15. aug 2026 — se "Database og admin-panel" nedenfor)
Butikkerne ligger IKKE længere i `js/main.js` — de ligger i Supabase-databasen (tabellen `shops`). Nemmeste måde at tilføje en rigtig butik lige nu: bed mig gøre det, eller indsæt en ny række direkte i Supabase (Table Editor eller SQL). Felter: `name`, `city`, `city_key` (lowercase, bruges til søgefilter), `services` (liste), `price_from` (tal), `tier` (`gratis`/`betalt`), `verificeret` (kun sandt, når du selv har bekræftet butikken er ægte — se advarsel nedenfor), `godkendt` (skal være `true` for at butikken vises), `profile_url`. Et fremtidigt skridt er en formular i admin-panelet, så det ikke kræver SQL.

## Database og admin-panel (bygget 15. aug 2026)
Efter Google Ads-suspenderingen (se nedenfor) bad Daniel om et rigtigt system: en database i stedet for hardcodet data, og et admin-panel kun til ham med overblik over butiks-status og indkomne tilbudsforespørgsler.

**Teknologi:** Supabase (gratis plan, hostet i eu-west-1/Irland). Konto oprettet af Daniel selv (dymorte24@gmail.com) — jeg opretter aldrig konti på tredjepartstjenester.
- **Projekt-URL:** `https://xeosltdpvkcaudiijtge.supabase.co`
- **Publishable/anon-nøgle** ligger direkte i `js/main.js` og `admin/index.html` — det er meningen, den er lavet til at være offentlig og styres af Row Level Security (RLS), ikke hemmelighed
- **To tabeller:** `shops` (erstatter det gamle hardcodede array) og `tilbud_anmodninger` (hver "Få tilbud"-indsendelse)
- **RLS-regler:** alle kan læse `shops`; kun en logget ind admin kan oprette/redigere/slette. Alle kan indsætte i `tilbud_anmodninger` (så kunder kan sende uden login); kun admin kan læse forespørgslerne

**Forsiden (`js/main.js`)** henter nu butikker live fra databasen (`loadShops()`) i stedet for et hardcodet array — udseendet for besøgende er uændret. Lead-formularen ("Få tilbud") gemmer nu forespørgslen i `tilbud_anmodninger` UDOVER den eksisterende mail via Netlify Forms (rørt ikke ved den del). OBS: brugte `Promise.allSettled` for at vente på begge kald, før siden skifter til tak-siden — ellers kan navigationen nå at afbryde database-kaldet, før det er færdigt (fundet under test).

**Admin-panel:** `/admin/` (noindex, ikke en del af den offentlige SEO-struktur). Login med mail/adgangskode via Supabase Auth. Viser en tabel over alle butikker (navn, by, tier, verificeret, godkendt) og en liste over alle tilbudsforespørgsler. Har en "skift adgangskode"-boks, fordi Daniels bruger blev oprettet via invitations-mail (han sætter selv sin adgangskode ved første login — jeg har aldrig kendt eller indtastet den).

**Ikke testet af mig endnu:** Selve det indloggede admin-panel-view (tabellerne med rigtige data). Login-siden virker og fejlfrit, og selve datalaget er testet grundigt via direkte SQL-forespørgsler og en rigtig test-indsendelse gennem formularen — men jeg har ikke Daniels adgangskode og kunne derfor ikke se dashboardet selv. Daniel skal tjekke sin mail for invitationen, sætte en adgangskode, og bekræfte dashboardet ser rigtigt ud.

**Naturlige næste skridt:** en formular i admin-panelet til at oprette/redigere butikker uden SQL; en offentlig tilmeldingsformular til butikker der selv vil oprette en profil (med `godkendt = false` som standard, så Daniel skal godkende før den vises — vigtigt efter suspenderings-lektien: intet går live uautoriseret).

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

## Google Search Console
- Sat op og verificeret 11. august 2026 for `https://bilpleje-dk.netlify.app/` (webadressepræfiks-metode, da vi ikke ejer et rigtigt domæne endnu)
- Verificeringsmetode: HTML-fil (`google0a9e92bd80e0a852.html` i rodmappen — må ikke slettes, ellers mistes verificeringen)
- Formål: viser gratis/organisk søgetrafik og hvilke sider Google rent faktisk har indekseret — adskilt fra Google Ads, som kun viser betalt trafik
- Ingen data endnu (helt ny opsætning, Google skriver "prøv igen om et døgns tid")
- Ikke lavet endnu: sitemap.xml er ikke oprettet/indsendt — ville hjælpe Google finde sider hurtigere, especially hvis butiks-profilsiderne (se nedenfor) bliver til virkelighed
- Hvis/når domænet skifter til minbilpleje.dk, skal ejerskabet verificeres igen for det nye domæne

## Domæne
- **bilpleje.dk er optaget** siden 1998 (peger på en bilpleje-blog, bilpleje.nu) — ikke muligt at købe
- Valgt fremtidigt domænenavn: **minbilpleje.dk** (bekræftet ledigt 9. august 2026 via punktum.dk). Daniel foretrak det for at det er kort, selvom "min" signalerer enkelt-butik mere end markedsplads — accepteret tradeoff
- Alternativer der også var ledige, hvis minbilpleje.dk siden fortrydes: bilplejemarked.dk, bilplejemarkedet.dk
- Endnu ikke købt — afventer bevist kundeinteresse fra Google Ads-kampagnen først
- Genbekræftet 15. aug 2026 (samme dag som Ads-suspenderingen): Daniel vil stadig vente. Ekstra grund lige nu: kontoen er suspenderet og kampagnen på pause, så der er ingen aktiv trafik at måle interesse ud fra. Genoptag domænesnakken når kontoen er genåbnet og kampagnen kører igen

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

## Strategi — geografisk fokus (OPDATERET, delvist udført)
- Oprindelig idé (10. aug 2026): fokusere først på ét lille geografisk område (dengang nævnt: Fyn) for at finde og onboarde bilpleje-butikker lokalt, og teste Google Ads koncentreret dér
- **Ændret til Nordsjælland** (11. aug 2026) — det er der Daniel rent faktisk har fundet bilpleje-butikkerne i første omgang, ikke Fyn. Kampagnens målretning er ændret til Nordsjælland-byer (se "Google Ads" ovenfor) i stedet for at oprette en ny separat kampagne, netop for at undgå at to kampagner byder mod hinanden i samme auktion
- Kampagnen er sat på pause, mens Daniel finder butikker — aktiveres igen når han er klar

## Forretningsbeslutninger (vigtigt at huske hvorfor)
- **Priser og "book direkte"-tekst rettet (9. aug 2026)** — sitet lovede priser og "ingen mellemled, kontakt direkte", men viste ingen priser og ALLE leads går rent faktisk til Daniels egen mail først (han er reelt mellemled lige nu). Kortene viser nu et `priceFrom`-eksempel-tal, og teksten siger nu ærligt "vi videresender din forespørgsel" i stedet for at love direkte kontakt
- **Intet domæne endnu** — kører bevidst på netlify.app-adressen til at teste om der er kundeinteresse, før der investeres i et .dk-domæne
- **Intet CVR** — kører som privatperson (Daniel Mortensen) indtil videre, ikke en registreret virksomhed
- **Gratis for butikker i opstartsfasen** — bevidst valg om IKKE at bygge betaling/abonnement endnu. Begrundelse: ingen butikker er onboardet endnu, og at bede dem betale for en ubevist tjeneste er en hård sag at sælge. "TOP"-placering forbliver et fremtidigt betalt perk, men sælges ikke aktivt nu. Sitet er opdateret (9. aug 2026) med "Gratis i opstartsfasen"-badge i "For butikker"-sektionen for at gøre dette eksplicit og skabe en naturlig early-access-fortælling
- **Butiksdata er nu data-drevet** (se ovenfor) specifikt for at gøre det let at tilføje rigtige butikker, efterhånden som Daniel finder dem — demo-butikkerne (Glansen Detailing, AutoShine Aarhus, Nordisk Bilpleje, Fyns Bil & Pleje) er stadig placeholder indtil videre

## Ikke lavet endnu / naturlige næste skridt
- Rigtige butiksdata i stedet for demo-cards (nu meget lettere at tilføje, se "Sådan tilføjer du en rigtig butik" ovenfor)
- Nordsjælland-fokus: opsøge rigtige butikker i de 7 tilføjede byer (se "Google Ads" ovenfor) — kampagne-målretning er allerede lavet, mangler kun rigtige butiksdata og genaktivering
- Overveje Search-kampagne i stedet for/ved siden af Performance Max, og opsætte en negativ-søgeordsliste (fra playbooket, se ovenfor — gemt til senere, ikke en beslutning endnu)
- Anmeldelses-indsendelsesformular med manuel godkendelse (drøftet, ikke bygget — se "Anmeldelser")
- Køb af minbilpleje.dk, når der er belæg for investeringen
- Betalingsflow for butikker der vil have "TOP"-placering (bevidst udskudt, se forretningsbeslutninger)
- Reel butiksverificering (den grønne "Verificeret"-pille er pt. kun visuel)
- Overvej at rette selve overskriften "Book direkte" i trin 03 (brødteksten er rettet, men overskriften antyder stadig direkte booking) — Daniel valgte at lade den stå indtil videre
- Følge op på Google Ads-performance efter et par dage/uger og justere budget/søgeord
