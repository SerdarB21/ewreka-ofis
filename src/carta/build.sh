#!/usr/bin/env bash
# Ewreka Carta derleme betiği: PDF.js (legacy dağıtımı) + Ewreka eklentileri -> ../../ewreka-ofis/modules/carta
# Kullanım: ./build.sh [hedef_klasör]
set -euo pipefail
cd "$(dirname "$0")"
PDFJS_VERSION=6.3.289
OUT="${1:-../../ewreka-ofis/modules/carta}"
if [ ! -d pdfjs-legacy/build ]; then
  curl -L -o pdfjs-legacy.zip "https://github.com/mozilla/pdf.js/releases/download/v${PDFJS_VERSION}/pdfjs-${PDFJS_VERSION}-legacy-dist.zip"
  mkdir -p pdfjs-legacy && (cd pdfjs-legacy && unzip -q ../pdfjs-legacy.zip)
fi
[ -d node_modules/pdf-lib ] || npm ci
rm -rf "$OUT"; mkdir -p "$OUT/web/locale" "$OUT/build" "$OUT/lib"
cp pdfjs-legacy/build/pdf.mjs pdfjs-legacy/build/pdf.worker.mjs pdfjs-legacy/build/pdf.sandbox.mjs "$OUT/build/"
cp -r pdfjs-legacy/web/viewer.mjs pdfjs-legacy/web/viewer.css pdfjs-legacy/web/images pdfjs-legacy/web/cmaps pdfjs-legacy/web/standard_fonts pdfjs-legacy/web/wasm pdfjs-legacy/web/iccs "$OUT/web/"
cp -r pdfjs-legacy/web/locale/tr pdfjs-legacy/web/locale/en-US "$OUT/web/locale/"
echo '{"tr":"tr/viewer.ftl","en-US":"en-US/viewer.ftl"}' > "$OUT/web/locale/locale.json"
cp node_modules/pdf-lib/dist/pdf-lib.min.js node_modules/@pdf-lib/fontkit/dist/fontkit.umd.min.js "$OUT/lib/"
cp fonts/DejaVuSans-Bold.ttf "$OUT/lib/"
cp ewreka/index.html "$OUT/index.html"
cp ewreka/carta.js ewreka/carta.css "$OUT/web/"
cp pdfjs-legacy/LICENSE "$OUT/PDFJS-LICENSE.txt"
echo "Carta derlendi -> $OUT"
