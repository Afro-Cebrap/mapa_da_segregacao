import geopandas as gpd
import pytest
from shapely.geometry import Polygon

# Every column the pipeline reads, so tests can override only what they care about.
DEFAULTS = {
    "code_tract": "355030812345678",
    "code_muni": "3550308",
    "name_muni": "Sao Paulo",
    "code_state": 35,
    "abbrev_state": "SP",
    "name_state": "Sao Paulo",
    "name_metro": "RM Sao Paulo",
    "unit_type": "metro",
    "year": 2022,
    "n_total": 100.0,
    "dissimilarity": 0.5,
    "index_h": 0.4,
    "exp_branca_pp": 0.3,
    "exp_pp_branca": 0.2,
    "iso_branca_branca": 0.6,
    "iso_pp_pp": 0.7,
    "percent_branca": 50.0,
    "percent_preta": 10.0,
    "percent_amarela": 5.0,
    "percent_parda": 30.0,
    "percent_indigena": 5.0,
    "percent_preta_ou_parda": 40.0,
}


def _square(offset: float) -> Polygon:
    return Polygon(
        [
            (offset, offset),
            (offset + 1, offset),
            (offset + 1, offset + 1),
            (offset, offset + 1),
        ]
    )


@pytest.fixture
def make_gdf():
    def _make(rows):
        records = []
        for index, row in enumerate(rows):
            record = dict(DEFAULTS)
            record.update(row)
            record["geometry"] = record.get("geometry", _square(float(index)))
            records.append(record)
        return gpd.GeoDataFrame(records, geometry="geometry", crs="EPSG:4674")

    return _make
