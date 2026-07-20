"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getLostItemMatches } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import type { MatchResult } from "@/types";

export default function LostItemMatchesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [matches, setMatches] = useState<MatchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    getLostItemMatches(id)
      .then(setMatches)
      .catch(() => setError("추천 결과를 불러오지 못했습니다."));
  }, [id, router]);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">추천 후보 TOP 5</h1>
      <p className="mt-1 text-xs text-zinc-500">
        표시된 점수는 AI의 확정 확률이 아니라 여러 유사도 값을 합친 매칭 점수입니다.
      </p>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      {matches === null && !error && <p className="mt-6 text-sm text-zinc-500">불러오는 중...</p>}
      {matches?.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500">아직 조건에 맞는 습득물이 없습니다.</p>
      )}

      <ul className="mt-6 flex flex-col gap-4">
        {matches?.map((match) => (
          <li
            key={match.matchId}
            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-black dark:text-zinc-50">{match.foundItem.title}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  습득일 {match.foundItem.foundDate} · {match.foundItem.placeText ?? "장소 정보 없음"}
                </p>
                <p className="text-xs text-zinc-500">보관 장소: {match.foundItem.storagePlace ?? "-"}</p>
              </div>
              <span className="shrink-0 rounded-full bg-black px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-black">
                매칭 점수 {Math.round(match.score * 100)}점
              </span>
            </div>

            {match.reasons.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {match.reasons.map((reason) => (
                  <li
                    key={reason}
                    className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {reason}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
              <span>출처: {match.foundItem.source}</span>
              <a
                href={`/found/${match.foundItem.id}`}
                className="font-medium text-black underline dark:text-white"
              >
                상세보기
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
