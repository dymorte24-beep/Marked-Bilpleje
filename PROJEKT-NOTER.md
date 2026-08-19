# Bilpleje.dk — Projektoverblik

## 🔑 Butikker kan nu selv logge ind og redigere deres profil (19. aug 2026)
Bygget efter Daniels ønske om, at bilpleje-butikker selv kan rette i deres egen visning uden at gå gennem admin-panelet.

**Ny side:** `/butik-panel/` (noindex, diskret link i forsidens footer). Login via Supabase Auth, samme mønster som `/admin/`, men viser og redigerer KUN den ene butik, kontoen hører til.

**Hvad en butik selv kan ændre:** ydelser, pris fra, rabat, kontaktperson, telefon, mail.
**Hvad en butik IKKE kan ændre — låst på databaseniveau, ikke kun i UI'en:** navn, by, "Verificeret", "Godkendt", tier, hvilken konto der ejer butikken. Dette er bevidst ufravigeligt: det var præcis den slags falske tillidssignaler (opdigtet "Verificeret") der udløste Google Ads-suspenderingen i august, så en butik må aldrig kunne sætte det selv.

**Sådan er det sikret (`shops`-tabellen):**
- Ny kolonne `owner_id uuid references auth.users(id) on delete set null`
- UPDATE-policyen `"Admin kan opdatere butikker"` (using true — alle authenticated) er erstattet af `"Ejer eller admin kan opdatere butik"` (`owner_id = auth.uid() OR auth.jwt()->>'email' = 'dymorte24@gmail.com'`)
- En `before update`-trigger (`protect_admin_fields` / `protect_admin_only_shop_fields()`) nulstiller navn/by/city_key/profile_url/verificeret/godkendt/tier/owner_id til deres gamle værdi, medmindre opdateringen kommer fra Daniels egen mail. Vigtig detalje fundet under test: triggeren skal specifikt tillade forespørgsler UDEN en JWT (dvs. direkte adgang via Supabase SQL Editor/dashboard) — ellers blokerer den også Daniels egne admin-rettelser lavet direkte i databasen

**Sådan oprettes en butiks-login (manuelt, ikke selv-tilmelding — bevidst valg for at undgå at nogen kan udgive sig for en anden butik):**
1. Daniel opretter brugeren i Supabase → Authentication → "Create new user" (samme metode som hans egen konto — Daniel skriver selv adgangskoden, den bliver aldrig set af Claude)
2. Claude kobler kontoens UID til den rigtige butik: `update shops set owner_id = '<uid>' where name = '<butik>';`

**Pilottest gennemført med Final Shine (kontakt@finalshine.dk):** Første forsøg fejlede ("forkert mail eller adgangskode") — kontoen var oprettet og bekræftet, men "Last signed in" var tomt, formentlig pga. rod med browser-autoudfyldning i opret-dialogen. Løst ved at slette og oprette kontoen på ny. Undervejs opdaget og rettet endnu en fejl: `owner_id`-fremmednøglen manglede `on delete set null`, så sletningen af den første (defekte) konto fejlede med en databasefejl, fordi Final Shines butik stadig pegede på den. Efter begge rettelser: login, visning af egne data, redigering og gem bekræftet virkende af Daniel selv — og "Verificeret"-mærket sad stadig urørt bagefter, hvilket bekræfter beskyttelsen virker i praksis.

**Opdatering samme dag — udrullet til alle 6:** Daniel oprettede selv login til de resterende 5 butikker (Shine Wash, CH CarCare, GG AutoCare, Carclean ApS, NSJ-Bilpleje) via Supabase, samme metode som Final Shine. Alle 6 `owner_id`-koblinger verificeret korrekte via SQL. Alle 6 butikker på bilpleje.dk har nu adgang til `/butik-panel/` med deres egen mail.

## 🚗 6. rigtige butik: Final Shine, Aarhus (19. aug 2026)
Oprettet via admin-panelet, samme mønster som de andre 5. Keramisk coating, polering, indvendig rens, udvendig rens, lakforsegling/voks, sæderens, mobil bilpleje, ozonbehandling, damprens, solfilm — 200 kr. fra, ingen rabat, verificeret. Kontakt: Hashem, 42 34 13 10, kontakt@finalshine.dk.

**Noter:**
- Tilføjede **"Solfilm"** som ny ydelseskategori (admin-checkbox + forsidens filter) — fandtes ikke før
- Daniel oplyste også adresse (Holmstrupgårdvej 5, 8220 Brabrand), åbningstider (hverdage 9–16) og hjemmeside (finalshine.dk) — **ingen af de tre er gemt**, da der ikke findes felter til dem i databasen/panelet endnu. Bevidst fravalgt at udvide skemaet denne gang; tag det op igen hvis det bliver et tilbagevendende behov
- "Udvendig klargøring" (Final Shines eget ord) er lagt under den eksisterende "Udvendig rens"-kategori, for at holde søgefilteret samlet i stedet for at splitte i en ny, næsten identisk kategori
- Aarhus har tidligere haft en demo-butik og en statisk by-side, som blev slettet 17. aug — intet at rydde op i, den fælles `by.html`-skabelon viser automatisk Final Shine på `/bilpleje/aarhus/`

## 💬 Idé: AI-chat på virksomhedsprofiler (analyseret 19. aug 2026 — IKKE igangsat)
Daniel fremlagde en detaljeret spec til en AI-chat pr. virksomhedsprofil ("Spørg om [butik]"), der svarer kun ud fra virksomhedens egne godkendte data og guider mod en tilbudsforespørgsel. Fuld arkitektur-analyse lavet, ingen kode skrevet. Kort opsummeret:
- **Passer godt ind uden framework-skift.** Netlify Functions (nyt for projektet — første server-side kode) beskytter Claude API-nøglen; `bilpleje/profil.html` er allerede det fælles skabelon-sted, så chatten kan bygges ét sted og virke for alle butikker
- **Genbrug frem for duplikering:** ny data (åbningstider, mobil-dækning, FAQ) bør ligge i nye kolonner på den eksisterende `shops`-tabel (`ai_enabled`, `ai_info` jsonb) — IKKE duplikere services/pris/by, som allerede findes
- **To åbne beslutninger, ikke afgjort endnu:** (1) skal "Få et tilbud" i chatten blive på profilsiden (kræver at lead-modalen porteres dertil, den findes i dag kun på `index.html`), eller sende brugeren til forsiden; (2) hvor rate-limiting skal bo (foreslået: en simpel tabel i Supabase, for ikke at hente en ny tjeneste ind)
- **Separat, ikke-relateret observation undervejs:** `shops`-tabellens RLS tillader offentlig læsning af HELE tabellen, inkl. `contact_person`/`phone`/`email`, som adminpanelet kun holder skjult i UI'en, ikke reelt adgangsbegrænset. Ikke skabt af chat-idéen, men værd at kigge på separat
- **Status:** Daniel vil vente. Anthropic API koster efter forbrug (kræver egen konto + betalingskort, ikke oprettet endnu); Netlify Functions dækkes af nuværende Personal-plan

## 🐛 Byge-søgning fejlede for byer med æ/ø/å (19. aug 2026) — rettet
Daniel rapporterede: søgning på "Birkerød" gav ingen resultater, selvom Carclean ApS findes i Birkerød og intet var valgt i ydelses-filteret.

**Root cause:** Butikskortene blev tagget med `data-city` sat til `shop.cityKey` — den ASCII-normaliserede værdi der bruges til URL-slugs (fx "birkerod", via æ→e/ø→o/å→a). Søgefeltet blev derimod sammenlignet mod det, brugeren rent faktisk taster (fx "Birkerød", med ægte ø) efter kun `.toLowerCase()` — ingen fjernelse af diakritiske tegn. Så `"birkerod".includes("birkerød")` var altid falsk.

Ramte reelt 4 af de 5 rigtige byer (Brøndby, Helsingør, Holbæk, Birkerød indeholder alle æ/ø — kun Farum gjorde ikke, hvilket er grunden til at søgning under den tidligere QA-gennemgang så ud til at virke: Farum var den ene by, der ikke kunne afsløre fejlen).

**Fix (`js/main.js`):**
- Kortene tagges nu med `data-city="${shop.city}"` (det rigtige bynavn) i stedet for `cityKey`
- Ny `normalizeCity()`-hjælpefunktion (samme æ→e/ø→o/å→a-transform som slug-genereringen) anvendes nu på BÅDE søgefeltets tekst og det gemte bynavn, før de sammenlignes — så det virker uanset om man taster med eller uden diakritiske tegn

Pushet (commit `6784f2f`) og bekræftet virkende direkte i browseren på den live side: søgning på både "Birkerød" (viser kun Carclean ApS) og "Helsingør" (viser kun CH CarCare) giver nu korrekt, filtreret resultat.

## ✅ Pre-launch QA-gennemgang (18. aug 2026) — inden Google Ads genstartes
Gik hele siden igennem som en rigtig kunde ville opleve den, før betalt trafik begynder igen. Fandt og rettede to reelle problemer:
- **`sitemap.xml` var helt forældet** — pegede stadig på alle 14 slettede demo-sider (ville give 404, hvis nogen/noget besøgte dem). Genopbygget til kun at liste de rigtige, nuværende sider
- **`privatlivspolitik.html` var ude af trit med virkeligheden** — nævnte kun Netlify som databehandler, ikke Supabase (tilføjet efter politikken blev skrevet), og lovede automatisk sletning af data, hvilket ikke er sådan systemet reelt fungerer. Begge dele rettet
- **`tilbud_anmodninger`-tabellen manglede en DELETE-policy** — opdaget da oprydning af en testforespørgsel fejlede stille (ingen fejl, men rækken blev heller ikke slettet). Tilføjet

Testet og bekræftet fungerende: forsidens søg/filter (by + alle 14 ydelser), alle 5 butiksprofiler, alle 5 bysider, begge formularer (kunde-lead og butik-tilmelding) ende-til-ende, mobilvisning, og "Videresendt"-knappen (bekræftet togglable begge veje). Ingen fejl i browser-konsollen på nogen af de testede sider.

**Mindre, ikke-kritisk observation:** Carclean ApS' pris (4.490 kr.) inkluderer "lånebil" ifølge Daniels oprindelige oplysninger, men den detalje vises ikke noget sted — der er intet felt til uddybende pris-noter endnu.

## Hvad er det
Markedsplads-side der forbinder private kunder med bilpleje-butikker i Danmark.
Gratis for kunder, butikker betaler på sigt for listing/topplacering.

## 🚗 Første 5 rigtige butikker live (17. aug 2026)
De første rigtige, bekræftede butikker er nu på siden — demo-butikkerne (Glansen Detailing, AutoShine Aarhus, Nordisk Bilpleje, Fyns Bil & Pleje) er slettet fra databasen, og "eksempel-butik"-bjælken på forsiden er fjernet, da den ikke længere er sand.

| Butik | By | Ydelser | Pris fra | Kontakt |
|---|---|---|---|---|
| Shine Wash | Brøndby (mobil på hele Sjælland) | Polering, indvendig rens, udvendig rens, lakforsegling/voks, sæderens, mobil bilpleje, ventilationsrens, damprens | 599 kr. | Ibrahim, 22 71 89 89, info@shinewash.dk |
| CH CarCare | Helsingør (dækker hele Sjælland) | Keramisk coating, polering, indvendig rens, udvendig rens, hjulskift, mobil bilpleje | 500 kr. (hjulskift, FindBilpleje-pris) | 40 50 20 97, kontakt@ch-carcare.dk |
| GG AutoCare | Holbæk | Keramisk coating, polering, indvendig rens, udvendig rens, lakforsegling/voks, sæderens, detailing, ozonbehandling, damprens | 299 kr. | Deniz A. Hansen, 42 47 42 61, jd@ggautocare.dk |
| Carclean ApS | Birkerød | Keramisk coating, polering, indvendig rens | 4.490 kr. (inkl. lånebil) | Jakob Weesgaard, 45 82 19 24, carclean@carclean.dk |
| NSJ-Bilpleje | Farum | Indvendig rens, udvendig rens, mobil bilpleje, damprens, læderpleje | 1.500 kr. | Christian, 41 27 12 87, info@nsj-bilpleje.dk |

Alle 5 er markeret `verificeret: true` (Daniel har talt direkte med dem) og `tier: gratis` (ingen betaling opkrævet endnu, jf. "Gratis i opstartsfasen"). Oprettet via admin-panelets "Opret ny butik"-formular, som nu blev sat på sin første rigtige prøve.

**Undervejs:** Prisfeltet er gjort valgfrit (nogle butikker har endnu ikke oplyst en startpris) — admin-panelet kræver den ikke længere, og den offentlige side skjuler blot prisfeltet, hvis det mangler, i stedet for at vise et tomt/forkert tal. "Eksempelpris"-teksten er fjernet overalt, da priserne nu er ægte. Tilføjede "Læderpleje" som ny ydelseskategori (NSJ-Bilpleje).

**Opdatering samme dag — rabat, kontaktinfo og redigering tilføjet:**
- `shops`-tabellen har nu `discount`, `contact_person`, `phone`, `email`. Shine Wash og CH CarCare er sat til `discount: 10` (den ægte rabat de har tilbudt) og vises nu som et gyldent "10% rabat"-mærke på den offentlige side, ligesom prisen. Alle 5 butikkers kontaktoplysninger er gemt (kontaktperson/telefon/mail er bevidst KUN synlige i admin-panelet, ikke offentligt)
- **Admin-panelet har nu en "Rediger"-knap** — genbruger opret-formularen (nu `saveShop()` i stedet for `createShop()`), forudfylder med butikkens nuværende data, og opdaterer i stedet for at oprette en ny. Testet grundigt: forudfylder korrekt, gemmer korrekt, tabellen forbliver korrekt bagefter
- **Admin-panelet har nu en "Kontakt"-knap** per butik, der folder en linje ud med kontaktperson/telefon/mail, i stedet for at proppe det ind som faste kolonner
- **NSJ-Bilpleje har en ægte Trustpilot-vurdering (4,9/5, ca. 90 anmeldelser)** og en fysisk adresse (Nordvænget 20, 3520 Farum) — ingen af delene er gemt eller vist endnu. Trustpilot-tallet er særligt interessant som fremtidig funktion, da det (modsat de opdigtede ratings der udløste Google Ads-suspenderingen) er et rigtigt, efterprøveligt tredjeparts-tal — men bevidst ikke bygget under tidspres, for ikke at genindføre ratings-visning uden omtanke. Adressefelt findes ikke i databasen endnu

**"Verificeret"-mærket er tilbage offentligt (17. aug 2026):** Nu hvor de 5 butikker er ægte og bekræftede (ikke opdigtede demo-butikker), viser siden igen det grønne "Verificeret"-mærke — stadig kun sat af Daniel i admin-panelet, aldrig noget en butik selv kan slå til. Vigtig forskel til suspenderings-sagen: dengang var mærket løgn (butikkerne fandtes ikke), nu er det sandt.

**By-sider genopbygget som én fælles skabelon (17. aug 2026):** De 14 gamle statiske filer, der pegede på de slettede demo-butikker (3 bysider, 4 profiler, 7 ydelse-sider for Aarhus/København/Odense), er slettet. I stedet er der nu `bilpleje/by.html` — én delt skabelon (samme mønster som `profil.html`), der henter alle butikker i en by fra databasen ud fra URL'en. Virker automatisk for de 5 rigtige byer (Brøndby, Helsingør, Holbæk, Birkerød, Farum) og enhver fremtidig by — ingen grund til at bygge en ny fil, næste gang en butik kommer til i en ny by. Testet på tværs af flere byer, inkl. æ/ø. `profil.html`'s brødkrumme peger nu også korrekt på butikkens by-side.

**Bevidst fravalgt:** Individuelle ydelse+by-sider (fx "keramisk coating i Helsingør") er IKKE bygget for de nye byer. Med kun 1 butik pr. by ville hver ydelse-side vise nøjagtig samme ene resultat som by-siden — "tyndt/næsten-duplikeret indhold", som kan skade fremfor at hjælpe SEO. Genovervej når en by har flere butikker.

**Stadig ikke gjort:**
- **De 5 nye butikker har kun den simple, auto-genererede profilside** (fra `bilpleje/profil.html`-skabelonen) — ingen billeder eller "om os"-tekst endnu, præcis som de gamle demo-profiler havde. Det venter på, at butikkerne selv kan logge ind og redigere (endnu ikke bygget)
- **De gamle SEO-sider for Aarhus/København/Odense (by- og ydelse-sider) refererer stadig til de slettede demo-butikker** og viser nu tomme resultater — er `noindex`, så ikke kritisk, men bør ryddes op eller genbruges til de nye byer på et tidspunkt

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

**Status: LØST.** Rettelserne er pushet live og bekræftet på den rigtige produktionsside. Appel indsendt til Google 15. aug 2026 (Daniel gennemførte selv reCAPTCHA'en og tryk på Send). Kontoen er siden åbnet igen, og Daniel genstartede kampagnen 19. aug 2026 — se "Google Ads" nedenfor.

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

**Status:** Fuldt testet og bekræftet virkende, inkl. det indloggede dashboard-view (15. aug 2026, samme dag).

**Login-historik (relevant hvis det driller igen):** Den oprindelige invitations-mail virkede ikke — den blev sendt, FØR jeg nåede at rette Site URL i Supabase fra standardværdien (`localhost:3000`) til den rigtige admin-adresse, så linket pegede det forkerte sted hen. Løsning: slettede den fastlåste invite-bruger og oprettede i stedet en ny bruger direkte (Supabase Auth → "Create new user"), hvor Daniel selv skrev sin adgangskode direkte i browseren — jeg har på intet tidspunkt kendt eller indtastet den. Virker nu.

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
- **Genaktiveret af Daniel 19. august 2026** — betalt trafik kører nu igen. Sat på pause 11. aug 2026, holdt på pause under Google Ads-suspenderingen (se nedenfor) og hele oprydningen/QA-gennemgangen; alt det arbejde (fjernelse af fiktive tillidssignaler, søgefejl på æ/ø/å rettet, Final Shine tilføjet som 6. rigtige butik) var forberedelsen til netop dette
- **⚠ Statustjek samme dag (19. aug 2026):** Logget ind på Google Ads (Daniel loggede selv ind, jeg kiggede read-only). Kampagnen kører (grøn/"Aktiveret"), men status er **"Kvalificeret (begrænset)"** — ikke fuld visning endnu, af tre grunde:
  1. **Annonceidentitet skal verificeres senest 11. sep. 2026** ellers risikerer flere annoncer at blive sat på pause/begrænset. Kræver Daniels egen handling i Google Ads (identitetsverificering) — jeg kan ikke gøre dette for ham
  2. **Aktivgruppe 1 er "under fornyet gennemgang"** (politik-begrænsning) — sandsynligvis en eftervirkning af suspenderings-sagen: kontoen er åbnet igen, men selve annonceindholdet bliver tjekket igen efter det. Der findes en "Appel"-knap i diagnostikpanelet, men den er IKKE trykket — kræver Daniels beslutning, evt. bedst at vente til den igangværende gennemgang er færdig i stedet for at appellere oveni
  3. **Annoncekvalitet er "Dårlig"** — aktivgruppen mangler nok variation i overskrifter/billeder/beskrivelser. Reelt fixbart ved at tilføje flere aktiver i Google Ads
  - Tal indtil videre: 84 klik, 2.390 eksponeringer — men næsten alt skete 8.-9. aug (før suspenderingen), fladt siden. Ingen bekræftede leads endnu (matcher tomt admin-panel)
  - Der var også en generel (ikke-akut) anbefaling om at aktivere totrinsverificering på selve Google-kontoen
  - **OBS budget-uoverensstemmelse:** kampagnen viser **50 kr./dag** live i Google Ads, men disse noter (se nedenfor) har tidligere sagt 40 kr./dag — ikke afklaret om Daniel har ændret det, eller om noten var forældet. Spørg Daniel
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
