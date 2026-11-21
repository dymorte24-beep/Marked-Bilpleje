#!/bin/bash
# Laver et kontaktark af en video med TikToks "farlige zoner" markeret med rødt.
# Al tekst og vigtige ting skal ligge UDEN FOR de røde felter (dækkes af TikToks søgefelt, knapper og tekst).
# Brug: bash vaerktoej/tjek-safezone.sh video.mp4 kontaktark.jpg
# Zoner (1080x1920, opdateret 2026-11-21): top 0-220 (søgefelt), bund 1500-1920 (navn, tekst), højre 920-1080 i y 760-1560 (like/kommentar/del).
V="$1"; OUT="${2:-safezone.jpg}"
ffmpeg -loglevel error -y -i "$V" -vf "fps=1/2,scale=1080:1920,drawbox=x=0:y=0:w=1080:h=220:color=red:t=8,drawbox=x=0:y=1500:w=1080:h=420:color=red:t=8,drawbox=x=920:y=760:w=160:h=800:color=red:t=8,scale=270:480,tile=6x2" -frames:v 1 "$OUT"
echo "Kontaktark: $OUT"
