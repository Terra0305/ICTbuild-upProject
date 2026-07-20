"use client";

import { use, useEffect, useState } from "react";

import { getFoundItem } from "@/lib/api";
import type { FoundItem } from "@/types";

export default function FoundItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [item, setItem] = useState<FoundItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFoundItem(id)
      .then(setItem)
      .catch(() => setError("습득물을 찾을 수 없습니다."));
  }, [id]);

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
        <Row label="습득 날짜" value={item.foundDate} />
        <Row label="습득 장소" value={item.placeText || "-"} />
        <Row label="보관 장소" value={item.storagePlace || "-"} />
        <Row label="문의" value={item.contactText || "-"} />
        <Row label="설명" value={item.description || "-"} />
        <Row label="출처" value={item.source} />
      </dl>
      {item.detailUrl && (
        <a
          href={item.detailUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block text-sm font-medium text-black underline dark:text-white"
        >
          원본 공공데이터 보기
        </a>
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
