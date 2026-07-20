"""Persistent FAISS cosine-similarity index for found-item text embeddings."""

from __future__ import annotations

import json
from pathlib import Path

import faiss
import numpy as np


class FoundItemFaissIndex:
    """FAISS IndexFlatIP plus a durable integer-ID to UUID mapping."""

    def __init__(self, dimension: int, directory: str | Path) -> None:
        self.dimension = dimension
        self.directory = Path(directory)
        self.index_path = self.directory / "found_items_text.faiss"
        self.mapping_path = self.directory / "found_items_text_ids.json"
        self.index = faiss.IndexIDMap2(faiss.IndexFlatIP(dimension))
        self.id_to_uuid: dict[int, str] = {}

    def build(self, entries: list[tuple[str, list[float]]]) -> None:
        """Replace the index from ``(found_item_uuid, embedding)`` entries."""
        self.index = faiss.IndexIDMap2(faiss.IndexFlatIP(self.dimension))
        self.id_to_uuid = {}
        if not entries:
            return

        vectors = np.asarray([embedding for _, embedding in entries], dtype=np.float32)
        if vectors.ndim != 2 or vectors.shape[1] != self.dimension:
            raise ValueError(f"Expected embedding dimension {self.dimension}.")

        ids = np.arange(1, len(entries) + 1, dtype=np.int64)
        self.index.add_with_ids(vectors, ids)
        self.id_to_uuid = {
            int(index_id): item_id for index_id, (item_id, _) in zip(ids, entries, strict=True)
        }

    def search(self, query_embedding: list[float], limit: int = 100) -> list[tuple[str, float]]:
        if self.index.ntotal == 0 or limit <= 0:
            return []

        query = np.asarray([query_embedding], dtype=np.float32)
        if query.shape[1] != self.dimension:
            raise ValueError(f"Expected query dimension {self.dimension}.")

        scores, ids = self.index.search(query, min(limit, self.index.ntotal))
        return [
            (self.id_to_uuid[int(index_id)], float(score))
            for score, index_id in zip(scores[0], ids[0], strict=True)
            if index_id != -1 and int(index_id) in self.id_to_uuid
        ]

    def save(self) -> None:
        self.directory.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self.index, str(self.index_path))
        self.mapping_path.write_text(
            json.dumps({"dimension": self.dimension, "ids": self.id_to_uuid}, ensure_ascii=False),
            encoding="utf-8",
        )

    def load(self) -> bool:
        if not self.index_path.exists() or not self.mapping_path.exists():
            return False

        payload = json.loads(self.mapping_path.read_text(encoding="utf-8"))
        if payload.get("dimension") != self.dimension:
            raise ValueError("Stored FAISS index dimension does not match the configured model.")
        self.index = faiss.read_index(str(self.index_path))
        self.id_to_uuid = {int(index_id): item_id for index_id, item_id in payload["ids"].items()}
        return True
