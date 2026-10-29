"""사용법: cd backend && .venv/bin/python ../docs/eval/run_weight_sensitivity.py

가중치(기획서 §8.3)를 하나씩 흔들었을 때 정답 순위가 얼마나 변하는지 본다.
항목별 점수는 한 번만 계산하고, 가중치만 바꿔 다시 합산한다.
이미지는 검증셋에 사진이 없어 평가에서 제외된다(가중치 재정규화로 처리).
"""

import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "..", "backend"))

from run_eval import SEEDS, build_corpus, rank_of  # noqa: E402

from app.ai import scorer  # noqa: E402
from app.ai.text_encoder import encode_texts as _onnx_encode  # noqa: E402
from app.services import matching_service as ms  # noqa: E402

BASE_WEIGHTS = dict(scorer.WEIGHTS)
ENCODER = "onnx-int8"


def encode_texts(texts):
    """배포와 같은 ONNX 모델을 쓰고, 파일이 없는 로컬에서는 같은 모델의 fp32 캐시로 대신한다."""
    global ENCODER
    try:
        return _onnx_encode(texts)
    except Exception:  # noqa: BLE001 - 로컬 평가 편의용 대체 경로
        ENCODER = "sentence-transformers fp32 (캐시)"
        model = _local_model()
        return model.encode(texts, normalize_embeddings=True, batch_size=64)


_MODEL = None


def _local_model():
    global _MODEL
    if _MODEL is None:
        from sentence_transformers import SentenceTransformer

        _MODEL = SentenceTransformer(
            "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
            device="cpu",
            local_files_only=True,
        )
    return _MODEL


DIMS = ["text", "category", "color", "location", "date"]  # image: 검증셋에 없음


def component_scores(seed: int, strict: bool):
    """질의마다 (후보 정답 위치, 후보별 항목 점수 dict, 날짜순서키)를 만든다."""
    losts, founds = build_corpus(seed, strict)
    for item, emb in zip(founds, encode_texts([f.normalized_text for f in founds]), strict=True):
        item.text_embedding = emb.tolist()
    for item, emb in zip(losts, encode_texts([x.normalized_text for x in losts]), strict=True):
        item.text_embedding = emb.tolist()
    order_key = [f.found_date.toordinal() for f in founds]
    out = []
    for qi, lost in enumerate(losts):
        rows = [ms._score_pair(lost, f) if ms._is_plausible(lost, f) else None for f in founds]
        out.append((qi, rows))
    return out, order_key


def rank_with(weights, qi, rows, order_key):
    scorer.WEIGHTS.update(weights)
    final = [-1.0 if r is None else scorer.compute_final_score(r) for r in rows]
    return rank_of(final, qi, order_key)


def summarize(ranks):
    r = np.array(ranks)
    return {
        "R@1": float((r <= 1).mean()) * 100,
        "R@5": float((r <= 5).mean()) * 100,
        "MRR": float((1 / r).mean()) * 100,
    }


def scenarios():
    yield "기준(0.35/0.15/0.10/0.10/0.05)", dict(BASE_WEIGHTS)
    for d in DIMS:
        for factor in (0.5, 1.5):
            w = dict(BASE_WEIGHTS)
            w[d] = BASE_WEIGHTS[d] * factor
            yield f"{d} ×{factor}", w
    for d in DIMS:
        w = dict(BASE_WEIGHTS)
        w[d] = 0.0
        yield f"{d} 제외", w
    yield "텍스트만", {k: (1.0 if k == "text" else 0.0) for k in BASE_WEIGHTS}
    yield "균등(이미지 제외)", {k: (0.0 if k == "image" else 1.0) for k in BASE_WEIGHTS}


def main():
    result = {}
    for mode, strict in (("normal", False), ("strict", True)):
        per_seed = [component_scores(seed, strict) for seed in SEEDS]
        table = {}
        for name, weights in scenarios():
            ranks = []
            for queries, order_key in per_seed:
                ranks += [rank_with(weights, qi, rows, order_key) for qi, rows in queries]
            table[name] = summarize(ranks)
        result[mode] = table
        scorer.WEIGHTS.update(BASE_WEIGHTS)
    result["_encoder"] = ENCODER
    json.dump(
        result,
        open(os.path.join(HERE, "weight_sensitivity.json"), "w"),
        ensure_ascii=False,
        indent=2,
    )
    print(f"인코더: {ENCODER}")
    for mode, table in result.items():
        if mode.startswith("_"):
            continue
        print(f"\n## {mode}")
        print("| 시나리오 | R@1 | R@5 | MRR |\n|---|---:|---:|---:|")
        for name, m in table.items():
            print(f"| {name} | {m['R@1']:.1f} | {m['R@5']:.1f} | {m['MRR']:.1f} |")


if __name__ == "__main__":
    main()
