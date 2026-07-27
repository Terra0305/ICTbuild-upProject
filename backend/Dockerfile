FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc libgomp1 libpq-dev curl && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY app ./app
COPY scripts ./scripts
COPY alembic.ini ./

# The API imports the text encoder and FAISS index, so production needs the
# optional AI dependency group as well as the base web dependencies.
RUN pip install --no-cache-dir ".[ai]"

# Bake the int8-quantized ONNX text embedding model into the image so the
# container never needs to reach huggingface.co (or hold torch/transformers
# in memory) at runtime. The full torch/transformers stack was pushing the
# process past Railway's memory limit and causing repeated OOM kills.
RUN mkdir -p app/ai/models/text-embed \
    && curl -fL "https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2/resolve/main/tokenizer.json" \
        -o app/ai/models/text-embed/tokenizer.json \
    && curl -fL "https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2/resolve/main/onnx/model_quantized.onnx" \
        -o app/ai/models/text-embed/model_quantized.onnx

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
