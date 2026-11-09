# Sådan laves ugens TikTok-videoer (til Claude-rutinen)

Målgruppe: bilejere på Fyn (og bilplejere). Sprog: dansk. Tone: energisk, sjov, konkret.
Brand: navy #131D2E, guld #B68B48, hvid. Wordmark: "find" (normal) + "bilplejere" (fed) + ".dk" (guld). Ikon: lup med guld flueben.

## Format
- 1080x1920 (HTML 540x960 renderet med deviceScaleFactor 2), 30 fps, 18-25 sek.
- Animeret illustration (SVG/CSS), ingen fotos af rigtige personer, ingen varemærker.
- Struktur: krog (0-3 s, stor tekst) -> 3-4 korte scener -> outro med wordmark og "Link i bio".
- Hold tekst væk fra nederste 15 % og højre kant (TikToks knapper).
- Skabelon: `eksempel-vinterfejl.html` (window.render(t) tegner frame ved tid t).

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
Coating-myter, vinterpleje, vejsalt, fælgrens, indvendig rens (hundehår, børnebil), lakrens/polering, PPF og solfilm forklaret,
hvad koster bilpleje, "før/efter" animeret, sådan finder du en bilplejer på findbilplejere.dk, sæsontips (jul, forår, pollen), quiz "rigtigt eller forkert".
Ingen påstande om konkrete bilplejere eller priser, der ikke er sande. Coating m.m. beskrives ærligt (ikke "skudsikker").
