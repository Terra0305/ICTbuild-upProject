"""사용법: cd backend && .venv/bin/python ../docs/eval/run_eval.py

검증셋으로 ReFind 매칭 파이프라인 vs 키워드 검색 비교.

실제 ReFind 코드(normalizer, 임베딩, scorer, geo, _is_plausible)를 그대로 호출한다.
"""
import json
import math
import random
import re
import sys
from collections import Counter
from datetime import date, timedelta
from types import SimpleNamespace

import os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "backend"))
sys.path.insert(0, HERE)

import numpy as np

from app.ai import scorer
from app.ai.normalizer import build_normalized_text
from app.ai.text_encoder import encode_texts
from app.services import matching_service as ms
from eval_data import (DISTRACTOR_COLORS, DISTRACTOR_POOL, GWANGJU_PLACES,
                       OTHER_PLACES, PAIRS)

BASE = date(2026, 8, 1)
N_DISTRACTORS = 600
SEEDS = [0, 1, 2, 3, 4]
THRESHOLD = 0.50  # match_display_threshold


def build_corpus(seed: int, strict: bool = False):
    rng = random.Random(seed)
    losts, founds = [], []
    for i, (cat, diff, lt, lc, ld, lp, ft, fc, fd, fp) in enumerate(PAIRS):
        lost_date = BASE + timedelta(days=(i * 3) % 45)
        found_date = lost_date + timedelta(days=rng.randint(0, 9))
        if strict:  # 날짜·장소가 정답을 가려주지 못하게: 분실 후 0~60일, 5km 이내 임의 경찰서
            found_date = lost_date + timedelta(days=rng.randint(0, 60))
        losts.append(SimpleNamespace(
            id=i, category_code=cat, difficulty=diff, title=lt, desc=ld,
            color_codes=lc, place_text=lp, region_code="", lost_date=lost_date,
            normalized_text=build_normalized_text(cat, lt, lc, ld)))
        if strict:
            probe = SimpleNamespace(place_text=lp, region_code="")
            ok = [st for st in GWANGJU_PLACES if ms._distance_km(probe, SimpleNamespace(
                place_text=None, storage_place=st)) is not None and ms._distance_km(probe, SimpleNamespace(
                place_text=None, storage_place=st)) <= 5.0]
            fp = rng.choice(ok or [fp])
        founds.append(SimpleNamespace(
            id=i, category_code=cat, title=ft, desc=fd, color_codes=fc,
            place_text=None, storage_place=fp, region_code="", found_date=found_date,
            normalized_text=build_normalized_text(cat, ft, fc, fd)))
    cats = list(DISTRACTOR_POOL)
    for j in range(N_DISTRACTORS):
        cat = cats[j % len(cats)]
        titles, feats = DISTRACTOR_POOL[cat]
        color = rng.choice(DISTRACTOR_COLORS)
        title = rng.choice(titles)
        if rng.random() < 0.6:
            title = f"{rng.choice(['검정색','흰색','회색','갈색','파란색','빨간색','분홍색'])} {title}"
        desc = ", ".join(rng.sample(feats, 2))
        place = rng.choice(GWANGJU_PLACES) if rng.random() < 0.7 else rng.choice(OTHER_PLACES)
        colors = [color] if rng.random() > 0.15 else []
        founds.append(SimpleNamespace(
            id=1000 + j, category_code=cat, title=title, desc=desc, color_codes=colors,
            place_text=None, storage_place=place, region_code="",
            found_date=BASE + timedelta(days=rng.randint(0, 60)),
            normalized_text=build_normalized_text(cat, title, colors, desc)))
    return losts, founds


# ---- 키워드 베이스라인 -----------------------------------------------------
def tokens(text):
    return [t for t in re.split(r"[\s,.'/()·]+", text) if len(t) >= 2]


def kw_exact_scores(lost, founds):
    """LOST112식 키워드 검색: 검색어(제목+설명) 단어가 습득물 글에 포함된 개수."""
    qs = tokens(lost.title + " " + lost.desc)
    out = []
    for f in founds:
        text = f.title + " " + f.desc
        out.append(sum(1 for q in qs if q in text))
    return out


def bigrams(text):
    t = re.sub(r"\s+", "", text)
    return [t[i:i + 2] for i in range(len(t) - 1)]


def tfidf_scores(lost, founds):
    docs = [Counter(bigrams(f.title + " " + f.desc)) for f in founds]
    df = Counter()
    for d in docs:
        df.update(d.keys())
    n = len(docs)
    idf = {k: math.log((n + 1) / (v + 1)) + 1 for k, v in df.items()}
    q = Counter(bigrams(lost.title + " " + lost.desc))
    qv = {k: c * idf.get(k, 1.0) for k, c in q.items()}
    qn = math.sqrt(sum(v * v for v in qv.values())) or 1
    out = []
    for d in docs:
        dv = {k: c * idf[k] for k, c in d.items()}
        dn = math.sqrt(sum(v * v for v in dv.values())) or 1
        out.append(sum(v * dv.get(k, 0) for k, v in qv.items()) / (qn * dn))
    return out


# ---- 평가 -------------------------------------------------------------------
def rank_of(scores, truth_idx, order_key):
    order = sorted(range(len(scores)), key=lambda i: (-scores[i], order_key[i]))
    return order.index(truth_idx) + 1


def evaluate(seed, strict=False):
    losts, founds = build_corpus(seed, strict)
    embs = encode_texts([f.normalized_text for f in founds])
    lembs = encode_texts([l.normalized_text for l in losts])
    for f, e in zip(founds, embs):
        f.text_embedding = e.tolist()
    for l, e in zip(losts, lembs):
        l.text_embedding = e.tolist()

    order_key = [f.found_date.toordinal() for f in founds]
    res = {k: [] for k in ["kw_exact", "kw_tfidf", "kw_tfidf_filter", "text_only", "refind"]}
    diffs = [l.difficulty for l in losts]

    for qi, lost in enumerate(losts):
        plausible = [ms._is_plausible(lost, f) for f in founds]

        s = kw_exact_scores(lost, founds)
        res["kw_exact"].append(rank_of(s, qi, order_key))

        s = tfidf_scores(lost, founds)
        res["kw_tfidf"].append(rank_of(s, qi, order_key))
        s2 = [x if p else -1 for x, p in zip(s, plausible)]
        res["kw_tfidf_filter"].append(rank_of(s2, qi, order_key))

        t = [scorer.text_score(lost.normalized_text, f.normalized_text,
                               lost.text_embedding, f.text_embedding) for f in founds]
        t2 = [x if p else -1 for x, p in zip(t, plausible)]
        res["text_only"].append(rank_of(t2, qi, order_key))

        full = []
        for f, p in zip(founds, plausible):
            if not p:
                full.append(-1)
                continue
            full.append(scorer.compute_final_score(ms._score_pair(lost, f)))
        res["refind"].append(rank_of(full, qi, order_key))
        res.setdefault("_full_truth", []).append(full[qi])
        res.setdefault("_pass_filter", []).append(plausible[qi])
        res.setdefault("_n_cand", []).append(sum(plausible))
    return res, diffs


def metrics(ranks):
    r = np.array(ranks)
    return {"R@1": float((r <= 1).mean()), "R@3": float((r <= 3).mean()),
            "R@5": float((r <= 5).mean()), "MRR": float((1 / r).mean())}


def main(strict):
    agg = {}
    by_diff = {}
    extra = {"truth_ge_display": [], "pass_filter": [], "avg_candidates": []}
    for seed in SEEDS:
        res, diffs = evaluate(seed, strict)
        for k, ranks in res.items():
            if k.startswith("_"):
                continue
            agg.setdefault(k, []).append(metrics(ranks))
            for d in "EMH":
                sel = [r for r, dd in zip(ranks, diffs) if dd == d]
                by_diff.setdefault((k, d), []).append(metrics(sel))
        extra["truth_ge_display"].append(float(np.mean([x >= THRESHOLD for x in res["_full_truth"]])))
        extra["pass_filter"].append(float(np.mean(res["_pass_filter"])))
        extra["avg_candidates"].append(float(np.mean(res["_n_cand"])))

    def mean(lst, key):
        return round(float(np.mean([m[key] for m in lst])) * 100, 1)

    out = {"n_queries": len(PAIRS), "n_found": len(PAIRS) + N_DISTRACTORS, "seeds": len(SEEDS),
           "overall": {k: {m: mean(v, m) for m in ["R@1", "R@3", "R@5", "MRR"]} for k, v in agg.items()},
           "by_difficulty": {f"{k}|{d}": {m: mean(v, m) for m in ["R@1", "R@5", "MRR"]}
                             for (k, d), v in by_diff.items()},
           "extra": {k: round(float(np.mean(v)), 3) for k, v in extra.items()}}
    return out


if __name__ == "__main__":
    allout = {"normal": main(False), "strict": main(True)}
    print(json.dumps({m: {"overall": o["overall"], "extra": o["extra"]} for m, o in allout.items()}, ensure_ascii=False, indent=1))
    print(json.dumps({m: {k: v for k, v in o["by_difficulty"].items() if "refind" in k or "text_only" in k or "tfidf_filter" in k} for m, o in allout.items()}, ensure_ascii=False))
    json.dump(allout, open(os.path.join(HERE, "eval_result.json"), "w"), ensure_ascii=False, indent=2)
