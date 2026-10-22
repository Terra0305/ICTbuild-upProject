"use client";

import { useCallback, useSyncExternalStore } from "react";

import { IconMoon, IconSun } from "@/components/common/Icons";

type Theme = "light" | "dark";

const STORAGE_KEY = "refind_theme";
const listeners = new Set<() => void>();

/** 저장된 선택이 있으면 그것을, 없으면 시스템 설정을 따른다. */
function readTheme(): Theme {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    mq.removeEventListener("change", listener);
  };
}

function applyTheme(next: Theme) {
  const root = document.documentElement;
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("theme-fade");
    window.setTimeout(() => root.classList.remove("theme-fade"), 320);
  }
  document.documentElement.dataset.theme = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* 저장할 수 없어도 현재 세션에서는 적용된다 */
  }
  listeners.forEach((l) => l());
}

/** 첫 페인트 전에 저장된 테마를 적용해 깜빡임을 막는 인라인 스크립트. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
  const toggle = useCallback(() => applyTheme(theme === "dark" ? "light" : "dark"), [theme]);
  const toDark = theme === "light";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={toDark ? "다크 모드로 전환" : "라이트 모드로 전환"}
      title={toDark ? "다크 모드" : "라이트 모드"}
      className="flex size-10 items-center justify-center rounded-full text-shell-ink-2 transition-colors hover:bg-ink/5 hover:text-shell-ink"
    >
      {toDark ? <IconMoon width={20} height={20} /> : <IconSun width={20} height={20} />}
    </button>
  );
}
