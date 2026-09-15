#!/usr/bin/env bash
# Publishes ./out to a data bucket. Run only after validate.py passes.
set -euo pipefail

BUCKET="${1:-}"
OUT="${OUT:-./out}"

if [ -z "$BUCKET" ]; then
  echo "usage: ./upload.sh <bucket-name>" >&2
  echo "  staging:    painel-segregacao-001-dados" >&2
  echo "  production: mapa-da-segregacao-dados" >&2
  exit 1
fi

# GeoJSONSeq is a build intermediate; only tiles, meta, scopes and the
# manifest belong in the bucket.
for DIR in tiles meta scopes; do
  echo ">>> Syncing $DIR"
  gsutil -m -h "Cache-Control:public, max-age=3600" \
    rsync -r -d "$OUT/$DIR" "gs://$BUCKET/$DIR"
done

gsutil -h "Cache-Control:public, max-age=300" \
  cp "$OUT/manifest.json" "gs://$BUCKET/manifest.json"

echo ">>> Published to gs://$BUCKET"
