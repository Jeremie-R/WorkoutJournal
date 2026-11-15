#!/bin/sh
# Builds the Google Play store graphics into android/play/: phone screenshots (1080×1920),
# the feature graphic (1024×500) and the 512px icon. Same demo data and requirements as run.sh
# (macOS, dev server running on http://localhost:5173).
set -e
cd "$(dirname "$0")"
ROOT="$(cd ../.. && pwd)"
OUT="$(mktemp -d)"
DEST="$ROOT/android/play"

# A 405×720 CSS viewport (9:16) rendered at 4/3 zoom on a 2x backing store gives 1080×1920.
node plan.mjs "$OUT" 405 720 1.3333333
swift shoot.swift "$OUT/config.json"

mkdir -p "$DEST/screenshots"
rm -f "$DEST"/screenshots/*.jpg
i=1
for name in journal workout log-pick log-confirm progress history session-editor workout-detail; do
  sips -z 1920 1080 -s formatOptions 90 "$OUT/$name.jpg" --out "$DEST/screenshots/$i-$name.jpg" >/dev/null
  i=$((i + 1))
done

cp feature.html "$OUT/"
cp "$ROOT/node_modules/@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2" "$OUT/newsreader.woff2"
cp "$ROOT/node_modules/@fontsource-variable/inter/files/inter-latin-opsz-normal.woff2" "$OUT/inter.woff2"
printf '{"width":1024,"height":500,"quality":0.92,"outDir":"%s","steps":[{"url":"file://%s/feature.html","wait":1,"shot":"feature.jpg"}]}' "$OUT" "$OUT" >"$OUT/feature.json"
swift shoot.swift "$OUT/feature.json"
sips -z 500 1024 -s formatOptions 92 "$OUT/feature.jpg" --out "$DEST/feature-graphic.jpg" >/dev/null

cp "$ROOT/public/icons/app-512.png" "$DEST/icon-512.png"
rm -rf "$OUT"
echo "Play graphics written to android/play"
