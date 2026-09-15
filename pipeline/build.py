"""Generate every static artifact from the source parquet.

Usage:
    python build.py --parquet /data/sf_segregation_indices.parquet --out ./out

Writes GeoJSONSeq per resource/year plus the JSON tree. Tiling runs separately
in tiles.sh, because tippecanoe is a native binary and lives in Docker.
"""

import argparse
import gc
import json
from pathlib import Path

from segregation_pipeline import meta, scopes
from segregation_pipeline.features import write_geojsonseq
from segregation_pipeline.manifest import build_manifest
from segregation_pipeline.selection import (
    RESOURCES,
    YEARS,
    select_rows,
    setores_rows,
)
from segregation_pipeline.source import (
    drop_exact_duplicates,
    load_source,
    normalize,
)


def _write_json(path: Path, payload) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":"), allow_nan=False),
        encoding="utf-8",
    )
    return len(payload)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--parquet", required=True)
    parser.add_argument("--out", default="out")
    args = parser.parse_args()

    out_dir = Path(args.out)
    artifacts: dict[str, int] = {}

    print(f">>> Reading {args.parquet}")
    gdf = drop_exact_duplicates(normalize(load_source(args.parquet)))
    print(f"    {len(gdf)} rows after de-duplication")

    for resource in RESOURCES:
        for year in YEARS:
            selected = select_rows(gdf, resource, year)
            if selected.empty:
                print(f"!!! {resource}_{year} selected 0 rows; skipping")
                continue

            geojson_path = out_dir / "geojsonseq" / f"{resource}_{year}.geojsonl"
            geojson_path.parent.mkdir(parents=True, exist_ok=True)
            count = write_geojsonseq(selected, resource, geojson_path)
            artifacts[f"geojsonseq/{resource}_{year}.geojsonl"] = count
            print(f"    {resource}_{year}: {count} features")

            if resource == "municipios":
                artifacts[f"meta/municipios_lista_{year}.json"] = _write_json(
                    out_dir / "meta" / f"municipios_lista_{year}.json",
                    meta.build_municipios_lista(selected),
                )
                artifacts[f"meta/indicadores_municipios_{year}.json"] = _write_json(
                    out_dir / "meta" / f"indicadores_municipios_{year}.json",
                    meta.build_municipios_rankings(selected),
                )
            elif resource == "reg_metropo":
                artifacts[f"meta/indicadores_reg_metro_{year}.json"] = _write_json(
                    out_dir / "meta" / f"indicadores_reg_metro_{year}.json",
                    meta.build_reg_metro_rankings(selected),
                )

            del selected
            gc.collect()

    # Scope files need every unit_type row, not the resolved single row per
    # tract, so they read the deduplicated frame directly via setores_rows,
    # not select_rows.
    for year in YEARS:
        setores_all = setores_rows(gdf, year)
        if setores_all.empty:
            continue
        written = scopes.write_scope_files(setores_all, year, out_dir)
        artifacts[f"scopes/setores/{year}"] = written
        print(f"    scopes {year}: {written}")

    manifest_path = out_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(build_manifest(args.parquet, artifacts), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f">>> Done. Manifest at {manifest_path}")


if __name__ == "__main__":
    main()
