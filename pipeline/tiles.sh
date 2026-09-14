#!/usr/bin/env bash
# Runs build.py, then turns each GeoJSONSeq into a .pmtiles archive.
set -euo pipefail

PARQUET="${PARQUET:-/data/sf_segregation_indices.parquet}"
OUT="${OUT:-/out}"
LAYER="setores_layer"

# No simplification of our own: -ps disables line simplification, and the
# zoom-bucket simplified tables of the old PostGIS pipeline are gone entirely.
# --drop-densest-as-needed stays only as a safety valve against the per-tile
# size limit at low zoom, where all of Brazil lands in one tile.
# If low zoom is dropping too many tracts, relax -ps BEFORE relaxing the drop
# flag: losing vertex precision at z4 is far less visible than losing whole
# tracts. See pipeline/README.md.
TIPPECANOE_FLAGS=(
  --layer="$LAYER"
  --minimum-zoom=0
  --maximum-zoom=12
  -ps
  --read-parallel
  --drop-densest-as-needed
  --extend-zooms-if-still-dropping
  --force
)

echo ">>> Building artifacts from $PARQUET"
python build.py --parquet "$PARQUET" --out "$OUT"

mkdir -p "$OUT/tiles"

for SOURCE in "$OUT"/geojsonseq/*.geojsonl; do
  NAME="$(basename "$SOURCE" .geojsonl)"
  echo ">>> Tiling $NAME"
  tippecanoe "${TIPPECANOE_FLAGS[@]}" \
    --output="$OUT/tiles/${NAME}.pmtiles" \
    "$SOURCE"
done

echo ">>> Tilesets:"
ls -lh "$OUT/tiles"
echo ">>> Done. Review the sizes above before uploading."
