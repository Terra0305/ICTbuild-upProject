FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc libgomp1 libpq-dev && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY app ./app
COPY scripts ./scripts
COPY alembic.ini ./

# The API imports the text encoder and FAISS index, so production needs the
# optional AI dependency group as well as the base web dependencies.
# torch must come from the CPU-only wheel index first, otherwise pip pulls
# the default CUDA build, which is far larger and OOMs on Railway's
# memory-limited containers even though nothing here uses a GPU.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir ".[ai]"

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
