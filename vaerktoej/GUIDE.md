# Sådan laves ugens TikTok-videoer (til Claude-rutinen)

**LÆS FØRST `LAERING.md` i roden af grenen** (vidIQ-research 2026-11-11: krog, første frame, tempo, voiceover, 3 faste formater).
Reglerne der går forud for det nedenfor, hvor de er i konflikt (fx første frame må IKKE være mørk navy). Tilføj ugens tal nederst i LAERING.md hver søndag.

Målgruppe: bilejere på Fyn (og bilplejere). Sprog: dansk. Tone: energisk, sjov, konkret.

## MÅLGRUPPE OG FORDELING (Daniel, 2026-11-12, efter kundetest med 100 simulerede bilejere)
Kundetesten viste: folk der **skal sælge bilen eller aflevere en leasingbil** sagde ja 7 af 10 gange, bilentusiaster 5 af 10, travle familier 6 af 15. Folk der vasker selv: 0 af 30. Daniel valgte at gå mest efter sælg/leasing-gruppen.
Fordeling af ugens 3 videoer:
- **2 videoer: serien "Sælg bilen / aflever leasingbilen"** (forklarende, ikke salg, samme stil og outro som altid).
- **1 video: gratis vaske- og plejetips** til dem der gør det selv (rækkevidde; der bruges ingen annoncekroner på dem).
Emneideer til serien (variér, gentag ikke):
- "Det her koster dig penge, når du afleverer leasingbilen" (stenslag, ridser, lugt, fælge: hvad tjekkes ved aflevering)
- "Sådan får du mere for bilen, når du sælger den" (rent interiør, poleret lak, gode salgsbilleder)
- "Klargøring før salg: hvad gør en bilplejer?" (trin for trin, før/efter animeret)
- "Køberen ser det her først" (lugt, sæder, rat, fælge, lygter)
- "Polering vs. ny lak: hvad giver mest værdi ved salg?" (forklaret visuelt, ingen konkrete priser)
- "Leasing-tjeklisten: 5 ting du selv kan gøre, og 3 du skal lade en bilplejer gøre"
- "Hundehår og børnekrummer: derfor trækker det ned i prisen"
Regler: lov aldrig en bestemt merpris eller at man "slipper for regningen"; skriv fx "kan hjælpe" og "kan trække ned". Ingen konkrete bilplejer-priser. Opslagstekst: spørgsmål som "Skal du sælge bilen snart?".
I opsummeringen til Daniel: skriv hvilke 2 videoer der var serien, og hold øje i LAERING.md med om serien klarer sig bedre end tips-videoerne.

## VIGTIGST: forklar og fortæl, sælg ikke (Daniel, 2026-11-10)
Videoerne skal være storytelling/undervisning, ikke reklame. Seeren skal lære noget og forstå HVAD der sker.
- Gode typer: "Sådan vasker du bilen bedst om vinteren", "Vask bilen med minimale ridser" (trin for trin),
  "Sådan ser det ud i lakken, når man polerer" (visuelt tværsnit), hvad vejsalt gør ved bilen, hvordan coating virker på mikroniveau,
  hvorfor vaskehal-børster laver ridser, før/efter forklaret.
- Vis det visuelt: tværsnit, diagrammer, lys der reflekteres, trin-for-trin med nummererede scener. Se `eksempel-polering-forklaret.html`.
- Byg det som en lille historie: spørgsmål/problem i krogen -> forklaring i 3-5 trin -> "aha"-afslutning.
- Outro (ALTID, godkendt af Daniel): "Få en professionel bilplejer til at gøre arbejdet ordentligt" -> "Find din bilplejer hos" -> findbilplejere.dk-logo -> "Link i bio"-knap. Ca. 4 sek. Resten af videoen er ren forklaring uden salg.
- Opslagsteksten: et spørgsmål til seeren (fx "Vidste du det?") i stedet for salg.
Brand: navy #131D2E, guld #B68B48, hvid. Wordmark: "find" (normal) + "bilplejere" (fed) + ".dk" (guld). Ikon: lup med guld flueben.

## Format
- 1080x1920 (HTML 540x960 renderet med deviceScaleFactor 2), 30 fps, 18-25 sek.
- Animeret illustration (SVG/CSS) og/eller ægte fotos fra Unsplash (se nedenfor). Ingen genkendelige personer, ingen varemærker/logoer/nummerplader.
- Struktur: krog (0-2 s, lyst konkret billede + påstand på max 8 ord) -> billedskift hvert 1,5-2,5 s -> reveal -> kort outro (max 3 s) oven på sidste billede. Se LAERING.md.
- SIKKER ZONE (Daniel 2026-11-10: tekst blev skjult af TikToks søgefelt og knapper). I 540x960-koordinater skal al tekst, tal,
  labels og vigtige ting ligge inden for x 40-450 og y 150-640. Brug left:40px; right:90px i stedet for width:100%, og centrér
  ting omkring x=245 (ikke 270). Top (y<140) dækkes af søgefeltet, bund (y>650) af navn/tekst, højre (x>450) af like/kommentar.
  Tjek ALTID: bash vaerktoej/tjek-safezone.sh video.mp4 ark.jpg og se på arket: intet vigtigt må krydse de røde linjer.
- Skabeloner: `eksempel-polering-forklaret.html` (forklarende tværsnit, foretrukket stil), `eksempel-vinterfejl.html` (kun grafik) og `eksempel-med-fotos.html` (Unsplash-fotos, læg fotos som f1.jpg.. ved siden af html-filen). window.render(t) tegner frame ved tid t.

## Ægte fotos (Unsplash-connector, tilføjet 2026-11-10)
Brug fotos i mindst 2 af ugens 3 videoer (og læg mærke til i LAERING.md om foto-videoer klarer sig bedre).
1. `mcp__Unsplash__search_photos` med orientation `portrait` og korte engelske søgeord, ét begreb pr. søgning
   (fx "car detailing", "car polish", "car wash foam", "car interior cleaning", "wheel cleaning", "winter car snow").
2. Vælg 2-4 fotos pr. video uden tydelige bilmærke-logoer, nummerplader eller genkendelige ansigter.
3. Hent med `mcp__Unsplash__download_asset` (brug den URL den giver, ikke `urls` fra søgningen), gem som
   `videoer/fotos/<dato>-<emne>-<n>.jpg`, skalér: `ffmpeg -i in.jpg -vf "scale=1080:-2" -q:v 4 ud.jpg`.
4. I HTML: foto som fuldskærms-baggrund med langsom zoom (Ken Burns, fx scale 1.0 -> 1.12 over scenen), navy-gradient over (#131D2E) KUN bag teksten (fx nederste/øverste tredjedel, 40-60 %), så fotoet stadig er lyst og tydeligt. Hvid/guld tekst skal stadig kunne læses. Skift foto mellem scener.
5. Lille linje nederst i scenen: "Foto: <fotografens navn> / Unsplash".
6. Fejler Unsplash (mangler adgang eller bekræftet e-mail), så lav videoerne uden fotos og skriv det i opsummeringen til Daniel.

Canva-connectoren er forbundet, men på gratis-planen er AI-billeder og AI-video ikke tilgængelige. Brug den ikke i rutinen, før Daniel evt. opgraderer.

## Animationer (brug dem, se `eksempel-med-fotos.html`)
Alt er deterministisk i window.render(t) (ingen CSS-transitions/Math.random uden seed), ellers hakker renderingen.
- Overskrift ord for ord med "pop" (data-words, "/" = linjeskift).
- Guld + navy wipe-overgang mellem scener.
- Ken Burns: langsom zoom + panorering på fotos.
- Lysstribe ("shine") der glider hen over lakken.
- Tal-badge der drejer ind og pulserer; tip-boks der "tegnes" ind fra venstre.
- Emne-effekter: skumbobler (vask), gnister (polering) – find på nye der passer til emnet (sne, vanddråber, støv).
- Outro: luppen tegnes streg for streg, logo glider op, "Link i bio"-knap popper og pulserer.

## Rendering
    node vaerktoej/render.js <fil.html> frames <sekunder> 30
    ffmpeg -framerate 30 -i frames/f%05d.jpg -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart /tmp/stum.mp4
    # LYD ER PÅKRÆVET (Daniel 2026-11-10: videoer uden lyd duer ikke på TikTok). Eget syntetiseret lydspor = ingen rettighedsproblemer.
    # Sæt cues efter din egen tidslinje: whoosh ved sceneskift, pop når trin/tal dukker op, chime når logoet vises. Skift --seed hver video.
    python3 vaerktoej/lyd.py <sekunder> /tmp/lyd.wav --whoosh 3.5,8.6 --pop 3.6,7.8 --chime 25.8 --seed <1-99>
    ffmpeg -i /tmp/stum.mp4 -i /tmp/lyd.wav -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart videoer/<dato>-<emne>.mp4
    # Tjek: ffprobe skal vise både en video- og en audio-stream.

## Udgivelse
- Commit mp4 til grenen `tiktok-videoer` under `videoer/`, push.
- URL: https://raw.githubusercontent.com/dymorte24-beep/marked-bilpleje/tiktok-videoer/videoer/<fil>.mp4
- Metricool createScheduledPost, blogId 7988347, network tiktok, timezone Europe/Copenhagen,
  tiktokData.title påkrævet, isAigc true, commercialContentOwnBrand true. (autoAddMusic virker kun på foto-opslag, så lyden skal ligge i mp4'en.)
- Faste dage: mandag, onsdag, lørdag kl. 19:00.
- Fordeling: 2 videoer i serien "Sælg bilen / aflever leasingbilen" + 1 gør-det-selv-tip (se MÅLGRUPPE OG FORDELING øverst).
- ALLE 3 videoer hver uge skal være forklarende i stil med `eksempel-polering-forklaret.html` (tværsnit/diagrammer/trin), evt. kombineret med Unsplash-fotos i krogen. Alt kører automatisk uden Daniels godkendelse.

## Emneideer (variér, gentag ikke emner fra `videoer/`)
Lakkens lag og polering forklaret, vask med minimale ridser (tospandsmetoden), vinterens bedste vask, coating-myter, vinterpleje, vejsalt, fælgrens, indvendig rens (hundehår, børnebil), lakrens/polering, PPF og solfilm forklaret,
hvad koster bilpleje, "før/efter" animeret, sådan finder du en bilplejer på findbilplejere.dk, sæsontips (jul, forår, pollen), quiz "rigtigt eller forkert".
Ingen påstande om konkrete bilplejere eller priser, der ikke er sande. Coating m.m. beskrives ærligt (ikke "skudsikker").
