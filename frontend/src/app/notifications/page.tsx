"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { IconArrow, IconBell } from "@/components/common/Icons";
import {
  lostItemMeta,
  useNotifications,
  type NotificationGroup,
} from "@/components/common/NotificationProvider";
import { Reveal } from "@/components/common/Reveal";
import { Button, EmptyState, LinkButton, LoadingList, Notice, PageHeader, PageShell } from "@/components/common/ui";
import { isAuthenticated } from "@/lib/auth";

const CHANNEL_LABELS = { IN_APP: "서비스 내", EMAIL: "이메일" } as const;
const PAGE_SIZE = 10;

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
  const { loaded, groups, unread, lostItems, matchInfo, ensureDetails, markGroupRead, markAllRead, refresh } =
    useNotifications();
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    void refresh();
  }, [router, refresh]);

  const shown = groups.slice(0, visible);
  // 화면에 보이는 알림의 분실물·후보 정보를 미리 불러온다.
  const lostIds = shown.map((g) => g.lostItemId).join(",");
  useEffect(() => {
    if (!lostIds) return;
    new Set(lostIds.split(",")).forEach(ensureDetails);
  }, [lostIds, ensureDetails]);

  async function read(group: NotificationGroup) {
    if (!group.unread) return;
    if (!(await markGroupRead(group))) setError("읽음 처리에 실패했습니다. 다시 시도해주세요.");
  }

  async function readAll() {
    if (!(await markAllRead())) setError("읽음 처리에 실패했습니다. 다시 시도해주세요.");
  }

  return (
    <PageShell>
      <PageHeader
        title="알림"
        description={unread > 0 ? `새 알림 ${unread}건이 있어요.` : "새 매칭 후보가 생기면 여기에 알려드려요."}
        action={
          unread > 0 ? (
            <Button variant="secondary" onClick={readAll} className="min-h-10 px-4 text-[15px]">
              모두 읽음
            </Button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      {!loaded && <LoadingList rows={3} />}
      {loaded && groups.length === 0 && (
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
        {shown.map((group) => {
          const lost = lostItems[group.lostItemId];
          const match = matchInfo[group.matchId];
          const meta = lostItemMeta(lost);
          return (
            <Reveal
              as="li"
              key={group.key}
              className={`flex gap-4 rounded-2xl p-4 sm:p-5 ${
                group.unread ? "bg-surface shadow-card" : "bg-surface/60 ring-1 ring-line"
              }`}
            >
              <span
                className={`relative mt-0.5 flex size-8 shrink-0 items-center justify-center ${group.unread ? "text-ink" : "text-ink-2/60"}`}
              >
                <IconBell width={24} height={24} className={group.unread ? "bell-ring" : ""} />
                {group.unread && (
                  <span className="absolute right-0.5 top-0 size-2.5 rounded-full bg-danger ring-2 ring-surface" aria-label="읽지 않음" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-[15px] ${group.unread ? "font-bold" : "font-medium text-ink-2"}`}>
                  새로운 매칭 후보가 등록되었어요
                </p>
                <p className="mt-2 truncate text-[17px] font-bold">{lost?.title ?? "내 분실물"}</p>
                {meta && <p className="mt-0.5 truncate text-sm text-ink-2">{meta}</p>}
                {match && (
                  <p className="mt-3 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium">{match.foundTitle}</span>
                    <span className="num shrink-0 font-bold">{Math.round(match.score * 100)}점</span>
                  </p>
                )}
                <p className="mt-3 text-xs text-ink-2">
                  {group.channels.map((c) => CHANNEL_LABELS[c]).join(" · ")} · {formatWhen(group.createdAt)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/lost/${group.lostItemId}/matches`}
                    onClick={() => void read(group)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-5 text-sm font-semibold text-bg hover:opacity-85"
                  >
                    매칭 결과 보기
                    <IconArrow width={16} height={16} />
                  </Link>
                  {group.unread && (
                    <button
                      type="button"
                      onClick={() => void read(group)}
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

      {groups.length > visible && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            이전 알림 더 보기 ({groups.length - visible}건)
          </Button>
        </div>
      )}
    </PageShell>
  );
}
