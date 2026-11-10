# Sådan laves ugens TikTok-videoer (til Claude-rutinen)

Målgruppe: bilejere på Fyn (og bilplejere). Sprog: dansk. Tone: energisk, sjov, konkret.

## VIGTIGST: forklar og fortæl, sælg ikke (Daniel, 2026-11-10)
Videoerne skal være storytelling/undervisning, ikke reklame. Seeren skal lære noget og forstå HVAD der sker.
- Gode typer: "Sådan vasker du bilen bedst om vinteren", "Vask bilen med minimale ridser" (trin for trin),
  "Sådan ser det ud i lakken, når man polerer" (visuelt tværsnit), hvad vejsalt gør ved bilen, hvordan coating virker på mikroniveau,
  hvorfor vaskehal-børster laver ridser, før/efter forklaret.
- Vis det visuelt: tværsnit, diagrammer, lys der reflekteres, trin-for-trin med nummererede scener. Se `eksempel-polering-forklaret.html`.
- Byg det som en lille historie: spørgsmål/problem i krogen -> forklaring i 3-5 trin -> "aha"-afslutning.
- Outro blødt: "Følg med for flere bilpleje-forklaringer" + lille logo. Højst ca. hver 3. video må nævne at man kan finde en bilplejer på findbilplejere.dk.
- Opslagsteksten: et spørgsmål til seeren (fx "Vidste du det?") i stedet for salg.
Brand: navy #131D2E, guld #B68B48, hvid. Wordmark: "find" (normal) + "bilplejere" (fed) + ".dk" (guld). Ikon: lup med guld flueben.

## Format
- 1080x1920 (HTML 540x960 renderet med deviceScaleFactor 2), 30 fps, 18-25 sek.
- Animeret illustration (SVG/CSS) og/eller ægte fotos fra Unsplash (se nedenfor). Ingen genkendelige personer, ingen varemærker/logoer/nummerplader.
- Struktur: krog (0-3 s, stor tekst) -> 3-4 korte scener -> outro med wordmark og "Link i bio".
- Hold tekst væk fra nederste 15 % og højre kant (TikToks knapper).
- Skabeloner: `eksempel-polering-forklaret.html` (forklarende tværsnit, foretrukket stil), `eksempel-vinterfejl.html` (kun grafik) og `eksempel-med-fotos.html` (Unsplash-fotos, læg fotos som f1.jpg.. ved siden af html-filen). window.render(t) tegner frame ved tid t.

## Ægte fotos (Unsplash-connector, tilføjet 2026-11-10)
Brug fotos i mindst 2 af ugens 3 videoer (og læg mærke til i LAERING.md om foto-videoer klarer sig bedre).
1. `mcp__Unsplash__search_photos` med orientation `portrait` og korte engelske søgeord, ét begreb pr. søgning
   (fx "car detailing", "car polish", "car wash foam", "car interior cleaning", "wheel cleaning", "winter car snow").
2. Vælg 2-4 fotos pr. video uden tydelige bilmærke-logoer, nummerplader eller genkendelige ansigter.
3. Hent med `mcp__Unsplash__download_asset` (brug den URL den giver, ikke `urls` fra søgningen), gem som
   `videoer/fotos/<dato>-<emne>-<n>.jpg`, skalér: `ffmpeg -i in.jpg -vf "scale=1080:-2" -q:v 4 ud.jpg`.
4. I HTML: foto som fuldskærms-baggrund med langsom zoom (Ken Burns, fx scale 1.0 -> 1.12 over scenen), mørk
   navy-gradient over (#131D2E, 60-80 % opacitet), så hvid/guld tekst altid kan læses. Skift foto mellem scener.
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
    ffmpeg -framerate 30 -i frames/f%05d.jpg -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart videoer/<dato>-<emne>.mp4

## Udgivelse
- Commit mp4 til grenen `tiktok-videoer` under `videoer/`, push.
- URL: https://raw.githubusercontent.com/dymorte24-beep/marked-bilpleje/tiktok-videoer/videoer/<fil>.mp4
- Metricool createScheduledPost, blogId 7988347, network tiktok, timezone Europe/Copenhagen,
  tiktokData.title påkrævet, isAigc true, commercialContentOwnBrand true.
- Faste dage: mandag, onsdag, lørdag kl. 19:00.

## Emneideer (variér, gentag ikke emner fra `videoer/`)
Lakkens lag og polering forklaret, vask med minimale ridser (tospandsmetoden), vinterens bedste vask, coating-myter, vinterpleje, vejsalt, fælgrens, indvendig rens (hundehår, børnebil), lakrens/polering, PPF og solfilm forklaret,
hvad koster bilpleje, "før/efter" animeret, sådan finder du en bilplejer på findbilplejere.dk, sæsontips (jul, forår, pollen), quiz "rigtigt eller forkert".
Ingen påstande om konkrete bilplejere eller priser, der ikke er sande. Coating m.m. beskrives ærligt (ikke "skudsikker").
