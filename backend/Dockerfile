# syntax=docker/dockerfile:1
#
# Smart Mid-Day Meal Management System - API
#
# Two stages so the ~300 MB of build toolchain needed to compile the ML wheels
# never reaches the final image.

# ---------------------------------------------------------------- builder ---
FROM python:3.12-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

# build-essential/cmake are needed by some of the face-recognition wheels;
# they stay in this stage only.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        cmake \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip setuptools wheel \
    && /opt/venv/bin/pip install -r requirements.txt

# Bake the InsightFace buffalo_l model into the image. Without this the first
# attendance capture blocks for minutes while ~300 MB downloads, and an
# offline host never works at all. A failure here is not fatal: the model is
# fetched at runtime into the mounted models volume instead.
ENV INSIGHTFACE_HOME=/opt/insightface
RUN mkdir -p /opt/insightface && \
    /opt/venv/bin/python -c "\
from insightface.app import FaceAnalysis; \
FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider']).prepare(ctx_id=0, det_size=(640, 640)); \
print('buffalo_l model ready')" || echo "WARNING: model pre-download failed; it will download on first use"

# ----------------------------------------------------------------- runtime ---
FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    INSIGHTFACE_HOME=/opt/insightface

# OpenCV needs libGL and libglib even in its headless code paths; curl backs
# the container healthcheck.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
        libgomp1 \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Run as a non-root user.
RUN useradd --create-home --uid 1000 appuser

COPY --from=builder /opt/venv /opt/venv
COPY --from=builder --chown=appuser:appuser /opt/insightface /opt/insightface

WORKDIR /app
COPY --chown=appuser:appuser . .

# Writable at runtime: student photos and attendance captures.
RUN mkdir -p uploads/students uploads/attendance \
    && chown -R appuser:appuser /app/uploads /opt/insightface

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
    CMD curl -fsS http://localhost:8000/health || exit 1

# One worker by default: the face-recognition model is several hundred MB of
# resident memory per process. Raise WEB_CONCURRENCY only with the RAM to match.
ENV WEB_CONCURRENCY=1
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port 8000 --workers ${WEB_CONCURRENCY}"]
