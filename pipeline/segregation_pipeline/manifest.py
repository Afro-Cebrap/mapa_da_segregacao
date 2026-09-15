"""Run manifest, for traceability between a published bucket and the parquet
that produced it."""

import hashlib
from datetime import datetime, timezone
from pathlib import Path

CHUNK_SIZE = 1024 * 1024


def file_sha256(path) -> str:
    digest = hashlib.sha256()
    with open(Path(path), "rb") as handle:
        for chunk in iter(lambda: handle.read(CHUNK_SIZE), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_manifest(source_path, artifacts: dict) -> dict:
    return {
        "generated_at": datetime.now(timezone.utc)
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z"),
        "source_parquet": Path(source_path).name,
        "source_parquet_sha256": file_sha256(source_path),
        "artifacts": artifacts,
    }
