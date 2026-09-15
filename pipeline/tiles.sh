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
#
# Maxzoom is per-resource, not uniform: setores goes to z14 to match the
# tract-level fidelity the old live DB served at high zoom (its base table,
# not a simplified one); municípios and regiões metropolitanas were already
# capped at z12 by the frontend before this migration and stay there.
# app/src/components/dashboard/DashboardMap.tsx's ARCHIVE_MAXZOOM must be
# kept in sync with these values.
maxzoom_for() {
  case "$1" in
    setores) echo 14 ;;
    municipios) echo 12 ;;
    reg_metropo) echo 12 ;;
    *) echo "unknown resource for maxzoom: $1" >&2; exit 1 ;;
  esac
}

COMMON_TIPPECANOE_FLAGS=(
  --layer="$LAYER"
  --minimum-zoom=0
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
  RESOURCE="${NAME%_*}"
  MAXZOOM="$(maxzoom_for "$RESOURCE")"
  echo ">>> Tiling $NAME (maximum-zoom=$MAXZOOM)"
  tippecanoe "${COMMON_TIPPECANOE_FLAGS[@]}" \
    --maximum-zoom="$MAXZOOM" \
    --output="$OUT/tiles/${NAME}.pmtiles" \
    "$SOURCE"
done

echo ">>> Tilesets:"
ls -lh "$OUT/tiles"

echo ">>> Actual maxzoom per archive (compare against the values above —"
echo ">>> --extend-zooms-if-still-dropping can push the real maxzoom higher"
echo ">>> than requested; if it does, DashboardMap.tsx's ARCHIVE_MAXZOOM"
echo ">>> must be updated to match, or the extra levels are generated,"
echo ">>> uploaded and paid for but never requested by the frontend):"
for TILESET in "$OUT"/tiles/*.pmtiles; do
  echo "--- $(basename "$TILESET")"
  pmtiles-show "$TILESET" | grep -i zoom
done

echo ">>> Done. Review the sizes and zoom levels above before uploading."
