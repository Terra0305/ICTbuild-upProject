"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { closeLostItem, getLostItem } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { CATEGORY_OPTIONS, COLOR_OPTIONS, REGION_OPTIONS } from "@/constants";
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
  const [showCloseOptions, setShowCloseOptions] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    getLostItem(id)
      .then(setItem)
      .catch(() => setError("분실물을 찾을 수 없습니다."));
  }, [id, router]);

  async function handleClose(reason: LostItemClosureReason) {
    if (!item) return;
    setIsClosing(true);
    try {
      setItem(await closeLostItem(item.id, reason));
      setShowCloseOptions(false);
    } catch {
      setError("종료 처리에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsClosing(false);
    }
  }

  if (error) {
    return <p className="px-6 py-16 text-center text-sm text-red-600">{error}</p>;
  }
  if (!item) {
    return <p className="px-6 py-16 text-center text-sm text-zinc-500">불러오는 중...</p>;
  }

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">{item.title}</h1>
      <dl className="mt-6 flex flex-col gap-2 text-sm">
        <Row label="카테고리" value={CATEGORY_OPTIONS.find((c) => c.code === item.categoryCode)?.label ?? item.categoryCode} />
        <Row
          label="색상"
          value={item.colorCodes.map((c) => COLOR_OPTIONS.find((o) => o.code === c)?.label ?? c).join(", ") || "-"}
        />
        <Row label="분실 날짜" value={item.lostDate} />
        <Row label="지역" value={REGION_OPTIONS.find((r) => r.code === item.regionCode)?.label ?? item.regionCode} />
        <Row label="상세 장소" value={item.placeText || "-"} />
        <Row label="설명" value={item.description || "-"} />
        <Row label="상태" value={item.status === "ACTIVE" ? "찾는 중" : item.status === "FOUND" ? "찾았어요" : "종료"} />
        {item.closureReason && <Row label="종료 결과" value={CLOSURE_LABELS[item.closureReason]} />}
      </dl>

      <div className="mt-8 flex gap-3">
        <Link
          href={`/lost/${item.id}/matches`}
          className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          추천 후보 보기
        </Link>
        {item.status === "ACTIVE" && (
          <button
            type="button"
            onClick={() => setShowCloseOptions(true)}
            className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm dark:border-zinc-700"
          >
            종료 처리
          </button>
        )}
      </div>

      {showCloseOptions && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-4 sm:items-center sm:justify-center">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="close-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-950"
          >
            <h2 id="close-title" className="text-lg font-semibold">분실물 찾기를 종료할까요?</h2>
            <p className="mt-1 text-sm text-zinc-500">종료 사유를 선택하면 이후 새 매칭 알림이 중지됩니다.</p>
            <div className="mt-5 flex flex-col gap-2">
              {CLOSURE_OPTIONS.map((option) => (
                <button
                  key={option.reason}
                  type="button"
                  disabled={isClosing}
                  onClick={() => handleClose(option.reason)}
                  className="rounded-xl border border-zinc-200 p-4 text-left hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <span className="block text-sm font-medium">{option.title}</span>
                  <span className="mt-1 block text-xs text-zinc-500">{option.description}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={isClosing}
              onClick={() => setShowCloseOptions(false)}
              className="mt-4 w-full rounded-full border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
            >
              취소
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-zinc-100 py-2 dark:border-zinc-900">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right text-black dark:text-zinc-50">{value}</dd>
    </div>
  );
}
