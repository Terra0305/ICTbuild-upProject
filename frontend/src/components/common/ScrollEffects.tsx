"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * 스크롤 위치를 CSS 변수로 노출한다.
 * --scroll: 스크롤 px, --progress: 0~1, html[data-scrolled]: 상단에서 벗어났는지.
 */
export function ScrollEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;

    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const max = root.scrollHeight - window.innerHeight;
      root.style.setProperty("--scroll", String(Math.round(y)));
      root.style.setProperty("--progress", String(max > 0 ? Math.min(1, y / max) : 0));
      root.dataset.scrolled = y > 8 ? "true" : "false";
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

  return <div className="scroll-progress" aria-hidden="true" />;
}
