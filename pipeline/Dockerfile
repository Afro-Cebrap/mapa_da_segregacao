# Tippecanoe has no Windows build, so the whole pipeline runs in Linux here.
FROM python:3.12-slim

# Build deps for tippecanoe, then tippecanoe itself pinned to a known tag.
# libsqlite3-dev per upstream tippecanoe's own README for tag 2.78.0
# (https://github.com/felt/tippecanoe/blob/2.78.0/README.md), not the
# libsqlite8-dev this Dockerfile originally pinned.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential git libsqlite3-dev zlib1g-dev ca-certificates \
    && git clone --depth 1 --branch 2.78.0 \
        https://github.com/felt/tippecanoe.git /tmp/tippecanoe \
    && make -C /tmp/tippecanoe -j"$(nproc)" \
    && make -C /tmp/tippecanoe install \
    && rm -rf /tmp/tippecanoe \
    && apt-get purge -y build-essential git \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /pipeline

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/pipeline

CMD ["bash", "./tiles.sh"]
