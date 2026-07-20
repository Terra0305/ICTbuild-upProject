"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { clearTokens, isAuthenticated, subscribeAuthChange } from "@/lib/auth";

function getServerSnapshot() {
  return false;
}

export function SiteHeader() {
  const router = useRouter();
  const authed = useSyncExternalStore(subscribeAuthChange, isAuthenticated, getServerSnapshot);

  function handleLogout() {
    clearTokens();
    router.push("/");
  }

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <Link href="/" className="text-sm font-semibold text-black dark:text-zinc-50">
        ReFind
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        {authed ? (
          <>
            <Link href="/lost" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white">
              내 분실물
            </Link>
            <Link
              href="/notifications"
              className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
            >
              알림
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
            >
              로그아웃
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white">
              로그인
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-black px-4 py-1.5 text-white dark:bg-white dark:text-black"
            >
              회원가입
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
