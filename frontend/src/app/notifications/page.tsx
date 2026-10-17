"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Reveal } from "@/components/common/Reveal";
import { IconArrow, IconBell } from "@/components/common/Icons";
import { EmptyState, LinkButton, LoadingList, Notice, PageHeader, PageShell } from "@/components/common/ui";
import { listNotifications, markNotificationRead } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import type { Notification } from "@/types";

const CHANNEL_LABELS: Record<Notification["channel"], string> = {
  IN_APP: "서비스 내 알림",
  EMAIL: "이메일",
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
      .catch(() => setError("알림을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."));
  }, [router]);

  async function handleRead(notification: Notification) {
    if (notification.status === "READ") return;
    try {
      await markNotificationRead(notification.id);
      setItems(
        (prev) =>
          prev?.map((item) => (item.id === notification.id ? { ...item, status: "READ" as const } : item)) ?? null,
      );
    } catch {
      setError("읽음 처리에 실패했습니다. 다시 시도해주세요.");
    }
  }

  const unread = items?.filter((i) => i.status !== "READ").length ?? 0;

  return (
    <PageShell>
      <PageHeader
        title="알림"
        description={unread > 0 ? `새 알림 ${unread}건이 있어요.` : "새 매칭 후보가 생기면 여기에 알려드려요."}
      />

      {error && (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      {items === null && !error && <LoadingList rows={3} />}
      {items?.length === 0 && (
        <EmptyState
          title="아직 받은 알림이 없어요"
          description="등록한 분실물과 닮은 새 습득물이 올라오면 이곳과 이메일로 알려드려요."
          action={
            <LinkButton href="/lost" variant="secondary">
              내 분실물 보기
            </LinkButton>
          }
        />
      )}

      <ul className="flex flex-col gap-3">
        {items?.map((item) => {
          const isUnread = item.status !== "READ";
          return (
            <Reveal
              as="li"
              key={item.id}
              className={`flex gap-4 rounded-2xl border p-4 sm:p-5 ${
                isUnread ? "border-transparent bg-surface shadow-card" : "border-line bg-surface/60"
              }`}
            >
              <span
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center ${isUnread ? "text-ink" : "text-ink-2/60"}`}
              >
                <IconBell width={24} height={24} className={isUnread ? "bell-ring" : ""} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-[15px] ${isUnread ? "font-bold" : "font-medium text-ink-2"}`}>
                  새로운 매칭 후보가 등록되었어요
                </p>
                <p className="mt-0.5 text-sm text-ink-2">
                  {CHANNEL_LABELS[item.channel]} · {formatWhen(item.createdAt)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/lost/${item.lostItemId}/matches`}
                    onClick={() => handleRead(item)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-5 text-sm font-semibold text-bg hover:opacity-85"
                  >
                    매칭 결과 보기
                    <IconArrow width={16} height={16} />
                  </Link>
                  {isUnread && (
                    <button
                      type="button"
                      onClick={() => handleRead(item)}
                      className="min-h-10 rounded-full px-4 text-sm font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink"
                    >
                      읽음 처리
                    </button>
                  )}
                </div>
              </div>
            </Reveal>
          );
        })}
      </ul>
    </PageShell>
  );
}
