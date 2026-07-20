"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { closeLostItem, getLostItem } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { CATEGORY_OPTIONS, COLOR_OPTIONS, REGION_OPTIONS } from "@/constants";
import type { LostItem } from "@/types";

export default function LostItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [item, setItem] = useState<LostItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    getLostItem(id)
      .then(setItem)
      .catch(() => setError("분실물을 찾을 수 없습니다."));
  }, [id, router]);

  async function handleClose() {
    if (!item) return;
    await closeLostItem(item.id);
    setItem({ ...item, status: "CLOSED" });
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
        <Row label="상태" value={item.status} />
      </dl>

      <div className="mt-8 flex gap-3">
        <Link
          href={`/lost/${item.id}/matches`}
          className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          추천 후보 보기
        </Link>
        {item.status !== "CLOSED" && (
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm dark:border-zinc-700"
          >
            종료 처리
          </button>
        )}
      </div>
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
