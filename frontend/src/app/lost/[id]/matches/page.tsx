"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CountUp } from "@/components/common/CountUp";
import { Meter } from "@/components/common/Meter";
import { Reveal } from "@/components/common/Reveal";
import { IconBack, IconCalendar, IconImage, IconInfo, IconPin } from "@/components/common/Icons";
import {
  EmptyState,
  LinkButton,
  LoadingList,
  Notice,
  PageHeader,
  PageShell,
  ScoreStub,
} from "@/components/common/ui";
import { getLostItemMatches } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import type { MatchResult, MatchScoreBreakdown } from "@/types";

const BREAKDOWN_LABELS: Array<[keyof MatchScoreBreakdown, string]> = [
  ["text", "설명"],
  ["image", "사진"],
  ["category", "종류"],
  ["color", "색상"],
  ["location", "장소"],
  ["date", "날짜"],
];

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
      .catch(() => setError("추천 결과를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."));
  }, [id, router]);

  return (
    <PageShell>
      <PageHeader
        back={
          <Link
            href={`/lost/${id}`}
            className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink"
          >
            <IconBack width={18} height={18} />
            분실물 상세
          </Link>
        }
        title="추천 후보 TOP 5"
        description="경찰청 습득물 중 내 분실물과 가장 닮은 순서예요."
      />

      <div className="mb-6">
        <Notice>
          <strong className="font-bold">점수는 확정 확률이 아니에요.</strong> 여러 유사도를 합친 값이라, 내 물건이 맞는지는
          사진과 설명을 직접 비교하고 보관 기관에 문의해 확인해주세요.
        </Notice>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {matches === null && !error && <LoadingList rows={3} />}
      {matches?.length === 0 && (
        <EmptyState
          title="아직 닮은 습득물이 없어요"
          description="같은 지역에서 조건에 맞는 습득물을 찾는 중이거나 아직 없어요. 새 습득물이 올라오면 알림으로 알려드릴게요."
          action={
            <LinkButton href="/notifications" variant="secondary">
              알림 확인하기
            </LinkButton>
          }
        />
      )}

      <ol className="flex flex-col gap-4">
        {matches?.map((match, index) => {
          const item = match.foundItem;
          const detail = BREAKDOWN_LABELS.filter(([k]) => match.scoreBreakdown[k] !== null);
          return (
            <Reveal
              as="li"
              key={match.matchId}
              delay={Math.min(index, 2) * 70}
              className="overflow-hidden rounded-2xl bg-surface shadow-card"
            >
              <div className="flex">
                <div className="hidden w-28 shrink-0 items-center justify-center bg-surface-2 sm:flex">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
                  ) : (
                    <IconImage className="text-ink-2/60" width={28} height={28} />
                  )}
                </div>
                <div className="min-w-0 flex-1 p-4 sm:p-5">
                  <p className="num text-xs font-bold text-ink">
                    {index + 1}순위
                  </p>
                  <h2 className="mt-1 text-lg font-bold leading-snug">{item.title}</h2>
                  <div className="mt-2 flex flex-col gap-1 text-sm text-ink-2">
                    <span className="inline-flex items-center gap-1.5">
                      <IconCalendar width={14} height={14} />
                      습득일 {item.foundDate}
                    </span>
                    <span className="inline-flex items-start gap-1.5">
                      <IconPin width={14} height={14} className="mt-1 shrink-0" />
                      <span>
                        {item.placeText ?? "습득 장소 정보 없음"}
                        <span className="text-ink-2"> · 보관 {item.storagePlace ?? "정보 없음"}</span>
                      </span>
                    </span>
                  </div>
                </div>
                <div className="perf w-0.5 self-stretch" aria-hidden="true" />
                <ScoreStub score={match.score} label={match.scoreLabel} />
              </div>

              {(match.reasons.length > 0 || detail.length > 0) && (
                <div className="border-t border-line px-4 py-4 sm:px-5">
                  {match.reasons.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                      {match.reasons.map((reason) => (
                        <li key={reason} className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-ink">
                          {reason}
                        </li>
                      ))}
                    </ul>
                  )}
                  {detail.length > 0 && (
                    <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
                      {detail.map(([key, label]) => {
                        const value = match.scoreBreakdown[key] ?? 0;
                        const pct = Math.round(value * 100);
                        return (
                          <div key={key}>
                            <div className="flex items-baseline justify-between text-xs">
                              <dt className="font-semibold text-ink-2">{label}</dt>
                              <dd className="num font-bold">
                                <CountUp value={pct} duration={1000} delay={index * 40} />
                              </dd>
                            </div>
                            <div className="mt-1">
                              <Meter percent={pct} delay={index * 40} />
                            </div>
                          </div>
                        );
                      })}
                    </dl>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2/50 px-4 py-3 sm:px-5">
                <span className="text-xs text-ink-2">
                  출처 {item.source === "LOST112" ? "경찰청 LOST112" : "기관 등록"}
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/found/${item.id}`}
                    className="inline-flex min-h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-bg hover:opacity-85"
                  >
                    상세보기
                  </Link>
                </div>
              </div>
            </Reveal>
          );
        })}
      </ol>

      {matches && matches.length > 0 && (
        <p className="mt-6 flex items-start gap-2 text-sm text-ink-2">
          <IconInfo width={16} height={16} className="mt-1 shrink-0" />
          마음에 드는 후보가 있다면 상세 화면의 보관 장소와 문의처로 직접 연락해 확인해보세요.
        </p>
      )}
    </PageShell>
  );
}
