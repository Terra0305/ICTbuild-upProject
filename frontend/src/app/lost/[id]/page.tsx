"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { IconBack, IconImage, IconSearch } from "@/components/common/Icons";
import {
  Button,
  ClaimCode,
  LinkButton,
  Notice,
  PageShell,
  StatusBadge,
  Swatch,
} from "@/components/common/ui";
import { CATEGORY_OPTIONS, COLOR_OPTIONS, REGION_OPTIONS } from "@/constants";
import { closeLostItem, getLostItem } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import type { LostItem, LostItemClosureReason } from "@/types";

const CLOSURE_OPTIONS: Array<{
  reason: LostItemClosureReason;
  title: string;
  description: string;
}> = [
  {
    reason: "MATCHED_BY_REFIND",
    title: "ReFind 추천 후보를 통해 찾았어요",
    description: "이 항목의 매칭과 알림을 종료합니다.",
  },
  {
    reason: "FOUND_ELSEWHERE",
    title: "직접 또는 다른 경로로 찾았어요",
    description: "찾기 활동을 종료하고 결과만 기록합니다.",
  },
  {
    reason: "NOT_FOUND",
    title: "찾지 못했어요",
    description: "더 이상 새 매칭 알림을 받지 않습니다.",
  },
  {
    reason: "INCORRECT_REGISTRATION",
    title: "잘못 등록했어요",
    description: "잘못된 분실 신고를 종료합니다.",
  },
];

const CLOSURE_LABELS: Record<LostItemClosureReason, string> = {
  MATCHED_BY_REFIND: "ReFind 추천 후보를 통해 찾음",
  FOUND_ELSEWHERE: "직접 또는 다른 경로로 찾음",
  NOT_FOUND: "찾지 못해 종료",
  INCORRECT_REGISTRATION: "잘못 등록하여 종료",
};

export default function LostItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [item, setItem] = useState<LostItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCloseOptions, setShowCloseOptions] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    getLostItem(id)
      .then(setItem)
      .catch(() => setError("분실물을 찾을 수 없습니다."));
  }, [id, router]);

  useEffect(() => {
    if (!showCloseOptions) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowCloseOptions(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [showCloseOptions]);

  async function handleClose(reason: LostItemClosureReason) {
    if (!item) return;
    setIsClosing(true);
    setActionError(null);
    try {
      setItem(await closeLostItem(item.id, reason));
      setShowCloseOptions(false);
    } catch {
      setActionError("종료 처리에 실패했습니다. 다시 시도해주세요.");
      setShowCloseOptions(false);
    } finally {
      setIsClosing(false);
    }
  }

  if (error) {
    return (
      <PageShell>
        <Notice tone="error">{error}</Notice>
        <div className="mt-6">
          <LinkButton href="/lost" variant="secondary">
            내 분실물로 돌아가기
          </LinkButton>
        </div>
      </PageShell>
    );
  }
  if (!item) {
    return (
      <PageShell>
        <div className="skeleton h-10 w-2/3" />
        <div className="skeleton mt-6 h-64" />
      </PageShell>
    );
  }

  const category =
    item.categoryCode === "ETC" && item.customCategory
      ? item.customCategory
      : (CATEGORY_OPTIONS.find((c) => c.code === item.categoryCode)?.label ?? item.categoryCode);
  const colorLabels = [
    ...item.colorCodes.map((c) => COLOR_OPTIONS.find((o) => o.code === c)?.label ?? c),
    ...(item.customColorText ? [item.customColorText] : []),
  ];

  return (
    <PageShell width="max-w-2xl lg:max-w-5xl 2xl:max-w-6xl">
      <Link href="/lost" className="mb-4 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink">
        <IconBack width={18} height={18} />
        내 분실물
      </Link>

      <article className="overflow-hidden rounded-2xl bg-surface shadow-card lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="relative flex aspect-[16/9] items-center justify-center bg-surface-2 lg:aspect-auto lg:min-h-[22rem]">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={`${item.title} 사진`} className="size-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-ink-2">
              <IconImage width={32} height={32} />
              <span className="text-sm">등록된 사진이 없어요</span>
            </div>
          )}
        </div>
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} />
            <ClaimCode id={item.id} />
          </div>
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{item.title}</h1>

          <dl className="mt-6 grid gap-x-8 gap-y-5 text-[0.9375rem] sm:grid-cols-2">
            <Info label="종류" value={category} />
            <Info
              label="색상"
              value={
                colorLabels.length ? (
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {item.colorCodes.map((c) => (
                      <span key={c} className="inline-flex items-center gap-1.5">
                        <Swatch code={c} />
                        {COLOR_OPTIONS.find((o) => o.code === c)?.label ?? c}
                      </span>
                    ))}
                    {item.customColorText && <span>{item.customColorText}</span>}
                  </span>
                ) : (
                  "-"
                )
              }
            />
            <Info label="잃어버린 날" value={item.lostDate} />
            <Info label="지역" value={REGION_OPTIONS.find((r) => r.code === item.regionCode)?.label ?? item.regionCode} />
            <Info label="상세 장소" value={item.placeText || "-"} wide />
            <Info label="특징 설명" value={item.description || "-"} wide />
            {item.closureReason && <Info label="종료 결과" value={CLOSURE_LABELS[item.closureReason]} wide />}
          </dl>
        </div>
      </article>

      {actionError && (
        <div className="mt-4">
          <Notice tone="error">{actionError}</Notice>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <LinkButton href={`/lost/${item.id}/matches`} className="min-h-12 flex-1">
          <IconSearch width={18} height={18} />
          추천 후보 보기
        </LinkButton>
        {item.status === "ACTIVE" && (
          <Button variant="secondary" className="min-h-12" onClick={() => setShowCloseOptions(true)}>
            찾기 종료하기
          </Button>
        )}
      </div>

      {showCloseOptions && (
        <div
          className="backdrop-in fixed inset-0 z-50 flex items-end bg-black/40 p-4 backdrop-blur-sm sm:items-center sm:justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isClosing) setShowCloseOptions(false);
          }}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="close-title"
            className="sheet-in max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl bg-surface p-6 shadow-card"
          >
            <h2 id="close-title" className="text-xl font-bold">
              분실물 찾기를 종료할까요?
            </h2>
            <p className="mt-1.5 text-sm text-ink-2">종료 사유를 선택하면 이후 새 매칭 알림이 중지돼요.</p>
            <div className="mt-5 flex flex-col gap-2">
              {CLOSURE_OPTIONS.map((option) => (
                <button
                  key={option.reason}
                  type="button"
                  disabled={isClosing}
                  onClick={() => handleClose(option.reason)}
                  className="rounded-full bg-surface-2/70 px-6 py-3.5 text-left transition-colors hover:bg-surface-2 disabled:opacity-50"
                >
                  <span className="block text-[0.9375rem] font-bold">{option.title}</span>
                  <span className="mt-0.5 block text-sm text-ink-2">{option.description}</span>
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              disabled={isClosing}
              onClick={() => setShowCloseOptions(false)}
              className="mt-3 w-full"
            >
              계속 찾기
            </Button>
          </section>
        </div>
      )}
    </PageShell>
  );
}

function Info({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-sm font-semibold text-ink-2">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap font-medium">{value}</dd>
    </div>
  );
}
