#!/bin/bash
# Laver et kontaktark af en video med TikToks "farlige zoner" markeret med rødt.
# Al tekst og vigtige ting skal ligge UDEN FOR de røde felter (dækkes af TikToks søgefelt, knapper og tekst).
# Brug: bash vaerktoej/tjek-safezone.sh video.mp4 kontaktark.jpg
# Zoner (1080x1920): top 0-280 (søgefelt), bund 1300-1920 (navn, tekst, knapper), højre 900-1080 (like/kommentar/del).
V="$1"; OUT="${2:-safezone.jpg}"
ffmpeg -loglevel error -y -i "$V" -vf "fps=1/2,scale=1080:1920,drawbox=x=0:y=0:w=1080:h=280:color=red:t=8,drawbox=x=0:y=1300:w=1080:h=620:color=red:t=8,drawbox=x=900:y=280:w=180:h=1020:color=red:t=8,scale=270:480,tile=6x2" -frames:v 1 "$OUT"
echo "Kontaktark: $OUT"
