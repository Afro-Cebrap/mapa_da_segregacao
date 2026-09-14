import hashlib

from segregation_pipeline.manifest import build_manifest, file_sha256


def test_file_sha256_matches_hashlib(tmp_path):
    target = tmp_path / "data.parquet"
    target.write_bytes(b"hello")

    assert file_sha256(target) == hashlib.sha256(b"hello").hexdigest()


def test_manifest_records_source_and_artifacts(tmp_path):
    source = tmp_path / "data.parquet"
    source.write_bytes(b"hello")

    manifest = build_manifest(source, {"tiles/setores_2022.pmtiles": 42})

    assert manifest["source_parquet_sha256"] == hashlib.sha256(b"hello").hexdigest()
    assert manifest["artifacts"]["tiles/setores_2022.pmtiles"] == 42
    assert manifest["generated_at"].endswith("Z")
