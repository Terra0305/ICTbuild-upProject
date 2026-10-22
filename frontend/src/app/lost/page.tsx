"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Reveal } from "@/components/common/Reveal";
import { IconCalendar, IconImage, IconPin, IconPlus } from "@/components/common/Icons";
import {
  ClaimCode,
  EmptyState,
  LinkButton,
  LoadingList,
  Notice,
  PageHeader,
  PageShell,
  StatusBadge,
  Swatch,
} from "@/components/common/ui";
import { CATEGORY_OPTIONS, REGION_OPTIONS } from "@/constants";
import { listLostItems } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import type { LostItem } from "@/types";

type Filter = "ALL" | "ACTIVE" | "DONE";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "ALL", label: "전체" },
  { key: "ACTIVE", label: "찾는 중" },
  { key: "DONE", label: "완료" },
];

export default function LostItemListPage() {
  const router = useRouter();
  const [items, setItems] = useState<LostItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    listLostItems()
      .then(setItems)
      .catch(() => setError("목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."));
  }, [router]);

  const visible = useMemo(() => {
    if (!items) return [];
    if (filter === "ACTIVE") return items.filter((i) => i.status === "ACTIVE");
    if (filter === "DONE") return items.filter((i) => i.status !== "ACTIVE");
    return items;
  }, [items, filter]);

  const activeCount = items?.filter((i) => i.status === "ACTIVE").length ?? 0;

  return (
    <PageShell>
      <PageHeader
        title="내 분실물"
        description={
          items && items.length > 0
            ? `지금 ${activeCount}건을 찾고 있어요. 새 습득물이 올라오면 알림으로 알려드려요.`
            : "등록한 분실물과 추천 후보를 한곳에서 확인해요."
        }
        action={
          <div className="hidden md:block">
            <LinkButton href="/lost/new">
              <IconPlus width={18} height={18} />새 분실물 등록
            </LinkButton>
          </div>
        }
      />

      {error && <Notice tone="error">{error}</Notice>}
      {items === null && !error && <LoadingList />}

      {items && items.length === 0 && (
        <EmptyState
          title="아직 등록한 분실물이 없어요"
          description="잃어버린 물건을 등록하면 경찰청 습득물과 바로 비교해드려요."
          action={<LinkButton href="/lost/new">분실물 등록하기</LinkButton>}
        />
      )}

      {items && items.length > 0 && (
        <>
          <div role="group" aria-label="상태 필터" className="relative mb-5 grid grid-cols-3 rounded-full bg-surface-2 p-1">
            <span
              aria-hidden="true"
              className="seg-thumb absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-surface shadow-card"
              style={{ transform: `translateX(${FILTERS.findIndex((f) => f.key === filter) * 100}%)` }}
            />
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`relative z-10 min-h-9 rounded-full px-3 text-[0.8125rem] font-semibold transition-colors duration-200 ${
                  filter === f.key ? "text-ink" : "text-ink-2 hover:text-ink"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <EmptyState title="해당하는 분실물이 없어요" description="다른 필터를 선택해보세요." />
          ) : (
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[repeat(2,minmax(0,1fr))] lg:gap-4">
              {visible.map((item, i) => (
                <Reveal as="li" key={item.id} delay={Math.min(i, 3) * 60}>
                  <LostItemTag item={item} />
                </Reveal>
              ))}
            </ul>
          )}
        </>
      )}
    </PageShell>
  );
}

function LostItemTag({ item }: { item: LostItem }) {
  const category =
    item.categoryCode === "ETC" && item.customCategory
      ? item.customCategory
      : (CATEGORY_OPTIONS.find((c) => c.code === item.categoryCode)?.label ?? item.categoryCode);
  const region = REGION_OPTIONS.find((r) => r.code === item.regionCode)?.label ?? item.regionCode;
  const muted = item.status !== "ACTIVE";

  return (
    <Link
      href={`/lost/${item.id}`}
      className={`group flex overflow-hidden rounded-2xl bg-surface shadow-card card-lift ${
        muted ? "opacity-80" : ""
      }`}
    >
      <div className="flex w-20 shrink-0 items-center justify-center bg-surface-2 sm:w-28">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <IconImage className="text-ink-2/60" width={28} height={28} />
        )}
      </div>
      <div className="perf w-0.5 self-stretch" aria-hidden="true" />
      <div className="min-w-0 flex-1 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="line-clamp-2 min-w-0 text-[1.0625rem] font-semibold leading-snug">{item.title}</p>
          <StatusBadge status={item.status} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
          <span>{category}</span>
          <span className="inline-flex items-center gap-1">
            <IconCalendar width={14} height={14} />
            {item.lostDate}
          </span>
          <span className="inline-flex items-center gap-1">
            <IconPin width={14} height={14} />
            {region}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1">
            {item.colorCodes.slice(0, 5).map((c) => (
              <Swatch key={c} code={c} />
            ))}
          </span>
          <ClaimCode id={item.id} />
        </div>
      </div>
    </Link>
  );
}
