"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { listLostItems } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { CATEGORY_OPTIONS } from "@/constants";
import type { LostItem } from "@/types";

const STATUS_LABELS: Record<LostItem["status"], string> = {
  ACTIVE: "찾는 중",
  FOUND: "매칭됨",
  CLOSED: "종료",
};

export default function LostItemListPage() {
  const router = useRouter();
  const [items, setItems] = useState<LostItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    listLostItems()
      .then(setItems)
      .catch(() => setError("목록을 불러오지 못했습니다."));
  }, [router]);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">내 분실물</h1>
        <Link
          href="/lost/new"
          className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          새로 등록
        </Link>
      </div>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {items === null && !error && (
        <p className="mt-6 text-sm text-zinc-500">불러오는 중...</p>
      )}

      {items?.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500">등록된 분실물이 없습니다.</p>
      )}

      <ul className="mt-6 flex flex-col gap-3">
        {items?.map((item) => (
          <li key={item.id}>
            <Link
              href={`/lost/${item.id}`}
              className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <div>
                <p className="font-medium text-black dark:text-zinc-50">{item.title}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {CATEGORY_OPTIONS.find((c) => c.code === item.categoryCode)?.label ?? item.categoryCode}
                  {" · "}
                  {item.lostDate}
                </p>
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {STATUS_LABELS[item.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
