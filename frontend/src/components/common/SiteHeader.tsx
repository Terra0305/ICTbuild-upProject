"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { IconBell, IconList, IconLogout, IconPlus, LogoMark } from "@/components/common/Icons";
import { useNotifications } from "@/components/common/NotificationProvider";
import { clearTokens, isAuthenticated, subscribeAuthChange } from "@/lib/auth";

function getServerSnapshot() {
  return false;
}

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const authed = useSyncExternalStore(subscribeAuthChange, isAuthenticated, getServerSnapshot);
  const { unread } = useNotifications();

  function handleLogout() {
    clearTokens();
    router.push("/");
  }

  const count = authed ? unread : 0;
  const isActive = (href: string) =>
    href === "/lost" ? pathname === "/lost" || /^\/lost\/(?!new)/.test(pathname) : pathname.startsWith(href);

  const desktopLink = (href: string, label: string, badge = 0) => (
    <Link
      href={href}
      aria-current={isActive(href) ? "page" : undefined}
      className={`relative flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition-colors ${
        isActive(href)
          ? "bg-ink/10 text-shell-ink"
          : "text-shell-ink-2 hover:bg-ink/5 hover:text-shell-ink"
      }`}
    >
      {label}
      {badge > 0 && (
        <span className="num ml-1.5 rounded-full bg-tag px-1.5 text-[11px] font-bold leading-5 text-tag-ink">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );

  return (
    <>
      <header
        className="site-header sticky top-0 z-40 border-b border-line bg-shell text-shell-ink backdrop-blur-xl backdrop-saturate-150"
      >
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-[17px] font-bold tracking-tight">
            <LogoMark />
            ReFind
          </Link>
          <nav aria-label="주 메뉴" className="flex items-center gap-1">
            {authed ? (
              <>
                <div className="hidden items-center gap-1 md:flex">
                  {desktopLink("/lost", "내 분실물")}
                  {desktopLink("/notifications", "알림", count)}
                  <Link
                    href="/lost/new"
                    className="ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-bg hover:opacity-85"
                  >
                    <IconPlus width={16} height={16} />
                    분실물 등록
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="로그아웃"
                  className="flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold text-shell-ink-2 hover:bg-ink/5 hover:text-shell-ink md:ml-1 md:px-3"
                >
                  <IconLogout width={18} height={18} />
                  <span className="hidden md:inline">로그아웃</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex min-h-10 items-center rounded-full px-4 text-sm font-semibold text-shell-ink-2 hover:bg-ink/5 hover:text-shell-ink"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-bg hover:opacity-85"
                >
                  회원가입
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {authed && (
        <nav
          aria-label="하단 메뉴"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-shell pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 md:hidden"
        >
          <ul className="mx-auto grid max-w-md grid-cols-3">
            <li>
              <TabLink href="/lost" active={isActive("/lost")} label="내 분실물">
                <IconList />
              </TabLink>
            </li>
            <li>
              <Link
                href="/lost/new"
                aria-current={pathname === "/lost/new" ? "page" : undefined}
                className="flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-bold text-ink"
              >
                <span className="-mt-5 flex size-12 items-center justify-center rounded-full bg-tag text-tag-ink shadow-card ring-4 ring-surface">
                  <IconPlus width={24} height={24} />
                </span>
                등록
              </Link>
            </li>
            <li>
              <TabLink href="/notifications" active={isActive("/notifications")} label="알림" badge={count}>
                <IconBell />
              </TabLink>
            </li>
          </ul>
        </nav>
      )}
    </>
  );
}

function TabLink({
  href,
  active,
  label,
  badge = 0,
  children,
}: {
  href: string;
  active: boolean;
  label: string;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-bold ${
        active ? "text-ink" : "text-ink-2"
      }`}
    >
      <span className="relative">
        {children}
        {badge > 0 && (
          <span className="num absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-bold leading-4 text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      {label}
    </Link>
  );
}
