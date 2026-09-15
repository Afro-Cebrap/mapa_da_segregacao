import math

import pytest

from build import _write_json


def test_write_json_rejects_non_finite_values(tmp_path):
    """pandas coerces missing values to float('nan') in string-dtype
    columns, and json.dumps defaults to emitting a bare NaN token: invalid
    JSON that makes JSON.parse throw and destroys the whole file rather than
    one row. allow_nan=False turns that silent corruption into a build
    failure instead.
    """
    target = tmp_path / "payload.json"

    with pytest.raises(ValueError):
        _write_json(target, {"value": math.nan})

    assert not target.exists()
