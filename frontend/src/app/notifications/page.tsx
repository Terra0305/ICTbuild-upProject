"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { listNotifications, markNotificationRead } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import type { Notification } from "@/types";

const CHANNEL_LABELS: Record<Notification["channel"], string> = {
  IN_APP: "서비스 내 알림",
  EMAIL: "이메일",
};

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    listNotifications()
      .then(setItems)
      .catch(() => setError("알림을 불러오지 못했습니다."));
  }, [router]);

  async function handleRead(notification: Notification) {
    if (notification.status === "READ") return;
    await markNotificationRead(notification.id);
    setItems((prev) =>
      prev?.map((item) =>
        item.id === notification.id ? { ...item, status: "READ" as const } : item
      ) ?? null
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">알림</h1>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      {items === null && !error && <p className="mt-6 text-sm text-zinc-500">불러오는 중...</p>}
      {items?.length === 0 && <p className="mt-6 text-sm text-zinc-500">받은 알림이 없습니다.</p>}

      <ul className="mt-6 flex flex-col gap-3">
        {items?.map((item) => (
          <li
            key={item.id}
            className={`rounded-md border px-4 py-3 text-sm ${
              item.status === "READ"
                ? "border-zinc-100 text-zinc-500 dark:border-zinc-900"
                : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{CHANNEL_LABELS[item.channel]} · 새로운 매칭 후보가 등록되었습니다</span>
              {item.status !== "READ" && (
                <button
                  type="button"
                  onClick={() => handleRead(item)}
                  className="text-xs font-medium text-black underline dark:text-white"
                >
                  읽음 처리
                </button>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
              <span>{new Date(item.createdAt).toLocaleString("ko-KR")}</span>
              <Link
                href={`/lost/${item.lostItemId}/matches`}
                className="font-medium text-black underline dark:text-white"
              >
                매칭 결과 보기
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
