import pytest

from app.ai.faiss_index import FoundItemFaissIndex


def test_faiss_index_returns_most_similar_item(tmp_path) -> None:
    index = FoundItemFaissIndex(3, tmp_path)
    index.build(
        [
            ("wallet-id", [1.0, 0.0, 0.0]),
            ("phone-id", [0.0, 1.0, 0.0]),
        ]
    )
    index.save()

    reloaded = FoundItemFaissIndex(3, tmp_path)
    assert reloaded.load() is True
    results = reloaded.search([0.9, 0.1, 0.0], limit=1)
    assert results[0][0] == "wallet-id"
    assert results[0][1] == pytest.approx(0.9)


def test_faiss_index_add_in_batches_keeps_unique_ids(tmp_path) -> None:
    index = FoundItemFaissIndex(3, tmp_path)
    index.add([("wallet-id", [1.0, 0.0, 0.0])])
    index.add([("phone-id", [0.0, 1.0, 0.0])])

    assert index.search([0.0, 1.0, 0.0], limit=1)[0][0] == "phone-id"
    assert index.search([1.0, 0.0, 0.0], limit=1)[0][0] == "wallet-id"
