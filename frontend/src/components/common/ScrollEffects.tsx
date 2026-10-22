"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const NATIVE_TIMELINES = typeof CSS !== "undefined" && CSS.supports("animation-timeline: scroll()");

/**
 * - html[data-scrolled]: 상단에서 벗어났는지(문턱을 넘을 때만 기록).
 * - 스크롤 연동 모션은 CSS 스크롤 타임라인이 처리한다(메인 스레드 작업 없음).
 *   지원하지 않는 브라우저에서만, 해당 요소의 transform을 직접 갱신하는 폴백이 돈다.
 */
export function ScrollEffects() {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fallback = !NATIVE_TIMELINES && !reduce;
    const bar = barRef.current;
    const hero = fallback ? document.querySelector<HTMLElement>(".hero-copy") : null;
    let raf = 0;
    let scrolled = false;

    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const next = y > 8;
      if (next !== scrolled) {
        scrolled = next;
        root.dataset.scrolled = next ? "true" : "false";
      }
      if (!fallback) return;
      const max = root.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      if (hero) {
        const h = window.innerHeight;
        const t = Math.min(1, Math.max(0, (y - h * 0.06) / (h * 0.74)));
        hero.style.transform = `translateY(${t * 64}px)`;
        hero.style.opacity = String(1 - t);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  return <div ref={barRef} className="scroll-progress" aria-hidden="true" />;
}
