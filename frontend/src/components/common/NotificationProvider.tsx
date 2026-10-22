"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";

import { IconBell, IconX } from "@/components/common/Icons";
import { CATEGORY_OPTIONS, REGION_OPTIONS } from "@/constants";
import { getLostItemMatches, listLostItems, listNotifications, markNotificationRead } from "@/lib/api";
import { isAuthenticated, subscribeAuthChange } from "@/lib/auth";
import type { LostItem, Notification } from "@/types";

const POLL_MS = 30_000;
const TOAST_MS = 7_000;
const SUMMARY_FLAG = "refind_notification_summary_shown";

/** 같은 매칭에 대한 알림(서비스 내·이메일)을 하나로 묶은 단위. */
export interface NotificationGroup {
  key: string;
  matchId: string;
  lostItemId: string;
  ids: string[];
  channels: Notification["channel"][];
  unread: boolean;
  createdAt: string;
}

export interface MatchInfo {
  foundTitle: string;
  score: number;
}

interface Toast {
  key: string;
  summaryCount?: number;
}

interface Ctx {
  loaded: boolean;
  groups: NotificationGroup[];
  unread: number;
  lostItems: Record<string, LostItem | undefined>;
  matchInfo: Record<string, MatchInfo | undefined>;
  ensureDetails: (lostItemId: string) => void;
  markGroupRead: (group: NotificationGroup) => Promise<boolean>;
  markAllRead: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<Ctx | null>(null);

export function useNotifications(): Ctx {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}

function getServerSnapshot() {
  return false;
}

function groupNotifications(items: Notification[]): NotificationGroup[] {
  const map = new Map<string, NotificationGroup>();
  for (const n of items) {
    const key = n.matchId;
    const g = map.get(key);
    if (g) {
      g.ids.push(n.id);
      if (!g.channels.includes(n.channel)) g.channels.push(n.channel);
      if (n.status !== "READ") g.unread = true;
      if (n.createdAt > g.createdAt) g.createdAt = n.createdAt;
    } else {
      map.set(key, {
        key,
        matchId: n.matchId,
        lostItemId: n.lostItemId,
        ids: [n.id],
        channels: [n.channel],
        unread: n.status !== "READ",
        createdAt: n.createdAt,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const authed = useSyncExternalStore(subscribeAuthChange, isAuthenticated, getServerSnapshot);

  const [items, setItems] = useState<Notification[] | null>(null);
  const [lostItems, setLostItems] = useState<Record<string, LostItem | undefined>>({});
  const [matchInfo, setMatchInfo] = useState<Record<string, MatchInfo | undefined>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);

  const seen = useRef<Set<string> | null>(null); // 이미 알고 있는 매칭 키
  const lostLoaded = useRef(false);
  const matchesRequested = useRef<Set<string>>(new Set());

  const groups = useMemo(() => groupNotifications(items ?? []), [items]);
  const unread = useMemo(() => groups.filter((g) => g.unread).length, [groups]);

  const ensureDetails = useCallback((lostItemId: string) => {
    if (!lostLoaded.current) {
      lostLoaded.current = true;
      listLostItems()
        .then((list) => setLostItems(Object.fromEntries(list.map((i) => [i.id, i]))))
        .catch(() => {
          lostLoaded.current = false;
        });
    }
    if (!matchesRequested.current.has(lostItemId)) {
      matchesRequested.current.add(lostItemId);
      getLostItemMatches(lostItemId)
        .then((matches) =>
          setMatchInfo((prev) => ({
            ...prev,
            ...Object.fromEntries(
              matches.map((m) => [m.matchId, { foundTitle: m.foundItem.title, score: m.score }]),
            ),
          })),
        )
        .catch(() => {
          matchesRequested.current.delete(lostItemId);
        });
    }
  }, []);

  const refresh = useCallback(async () => {
    let list: Notification[];
    try {
      list = await listNotifications();
    } catch {
      return;
    }
    setItems(list);

    const next = groupNotifications(list);
    next.filter((g) => g.unread).slice(0, 5).forEach((g) => ensureDetails(g.lostItemId));

    if (seen.current === null) {
      // 첫 로드: 이미 있던 알림은 토스트로 띄우지 않고, 읽지 않은 게 있으면 요약 한 번만 보여준다.
      seen.current = new Set(next.map((g) => g.key));
      const unreadGroups = next.filter((g) => g.unread);
      let shown = false;
      try {
        shown = window.sessionStorage.getItem(SUMMARY_FLAG) === "1";
      } catch {
        /* ignore */
      }
      if (unreadGroups.length > 0 && !shown) {
        try {
          window.sessionStorage.setItem(SUMMARY_FLAG, "1");
        } catch {
          /* ignore */
        }
        setToasts([{ key: `summary-${unreadGroups[0].key}`, summaryCount: unreadGroups.length }]);
      }
      return;
    }

    const known = seen.current;
    const fresh = next.filter((g) => !known.has(g.key));
    fresh.forEach((g) => known.add(g.key));
    const freshUnread = fresh.filter((g) => g.unread).slice(0, 3);
    if (freshUnread.length > 0) {
      setToasts((prev) => [...freshUnread.map((g) => ({ key: g.key })), ...prev].slice(0, 3));
    }
  }, [ensureDetails]);

  // 로그인 상태에서 주기적으로 새 알림을 확인한다.
  useEffect(() => {
    if (!authed) return;
    const kickoff = window.setTimeout(refresh, 0);
    const timer = window.setInterval(refresh, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      // 로그아웃·계정 전환 시 상태를 비운다.
      seen.current = null;
      lostLoaded.current = false;
      matchesRequested.current = new Set();
      setItems(null);
      setLostItems({});
      setMatchInfo({});
      setToasts([]);
    };
  }, [authed, refresh]);

  const markGroupRead = useCallback(async (group: NotificationGroup) => {
    try {
      await Promise.all(group.ids.map((id) => markNotificationRead(id)));
    } catch {
      return false;
    }
    setItems((prev) => prev?.map((n) => (group.ids.includes(n.id) ? { ...n, status: "READ" as const } : n)) ?? null);
    setToasts((prev) => prev.filter((t) => t.key !== group.key && !t.key.endsWith(group.key)));
    return true;
  }, []);

  const markAllRead = useCallback(async () => {
    const targets = (items ?? []).filter((n) => n.status !== "READ");
    try {
      await Promise.all(targets.map((n) => markNotificationRead(n.id)));
    } catch {
      return false;
    }
    setItems((prev) => prev?.map((n) => ({ ...n, status: "READ" as const })) ?? null);
    setToasts([]);
    return true;
  }, [items]);

  const dismissToast = useCallback((key: string) => setToasts((prev) => prev.filter((t) => t.key !== key)), []);

  const value = useMemo<Ctx>(
    () => ({
      loaded: items !== null,
      groups,
      unread,
      lostItems,
      matchInfo,
      ensureDetails,
      markGroupRead,
      markAllRead,
      refresh,
    }),
    [items, groups, unread, lostItems, matchInfo, ensureDetails, markGroupRead, markAllRead, refresh],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 top-[4.25rem] z-50 flex flex-col items-center gap-3 sm:inset-x-auto sm:right-6 sm:items-end"
      >
        {authed &&
          toasts.map((t) => {
            const gKey = t.summaryCount ? t.key.replace(/^summary-/, "") : t.key;
            const group = groups.find((g) => g.key === gKey);
            if (!group) return null;
            return (
              <ToastCard
                key={t.key}
                toast={t}
                group={group}
                lost={lostItems[group.lostItemId]}
                match={matchInfo[group.matchId]}
                onClose={() => dismissToast(t.key)}
                onOpen={() => {
                  dismissToast(t.key);
                  void markGroupRead(group);
                }}
              />
            );
          })}
      </div>
    </NotificationContext.Provider>
  );
}

export function lostItemMeta(lost: LostItem | undefined): string {
  if (!lost) return "";
  const category =
    lost.categoryCode === "ETC" && lost.customCategory
      ? lost.customCategory
      : (CATEGORY_OPTIONS.find((c) => c.code === lost.categoryCode)?.label ?? "");
  const region = REGION_OPTIONS.find((r) => r.code === lost.regionCode)?.label ?? "";
  return [category, region, lost.lostDate].filter(Boolean).join(" · ");
}

function ToastCard({
  toast,
  group,
  lost,
  match,
  onClose,
  onOpen,
}: {
  toast: Toast;
  group: NotificationGroup;
  lost: LostItem | undefined;
  match: MatchInfo | undefined;
  onClose: () => void;
  onOpen: () => void;
}) {
  const meta = lostItemMeta(lost);
  const [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  // 퇴장은 입장보다 빠르고 조용하게: 180ms 동안 사라진 뒤 제거한다.
  const dismiss = useCallback(() => {
    setLeaving(true);
    window.setTimeout(() => closeRef.current(), 180);
  }, []);
  // 마우스를 올리거나 키보드로 포커스하면 멈추고, 벗어나면 다시 시간을 센다.
  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(dismiss, TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [paused, dismiss]);
  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`${leaving ? "toast-out" : "toast-in"} group pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl bg-surface shadow-[0_12px_40px_-8px_rgb(0_0_0/0.3)] ring-1 ring-line`}>
      <Link href={`/lost/${group.lostItemId}/matches`} onClick={onOpen} className="block p-4 pr-12">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink-2">
          <IconBell width={16} height={16} className="text-ink" />
          <span>{toast.summaryCount && toast.summaryCount > 1 ? `읽지 않은 알림 ${toast.summaryCount}건` : "새 매칭 후보가 도착했어요"}</span>
        </div>
        <p className="mt-2 truncate text-[1.0625rem] font-bold leading-snug">{lost?.title ?? "내 분실물"}</p>
        {meta && <p className="mt-0.5 line-clamp-2 text-sm text-ink-2">{meta}</p>}
        {match && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate font-medium">{match.foundTitle}</span>
            <span className="num shrink-0 font-bold">{Math.round(match.score * 100)}점</span>
          </p>
        )}
        <p className="mt-3 text-sm font-semibold underline underline-offset-4">후보 확인하기</p>
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="알림 닫기"
        className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink"
      >
        <IconX width={16} height={16} />
      </button>
      <span
        aria-hidden="true"
        key={String(paused)}
        className="toast-timer absolute inset-x-0 bottom-0 h-0.5 bg-ink"
        style={{ animationDuration: `${TOAST_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
      />
    </div>
  );
}
