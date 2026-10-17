"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

/** 화면에 보이면 0에서 value까지 올라가는 숫자. 서버 렌더 결과는 최종 값이다. */
export function CountUp({
  value,
  duration = 1000,
  delay = 0,
  className = "",
}: {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const armed = useRef(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    armed.current = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (armed.current) el.textContent = "0";
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !armed.current) return;

    let raf = 0;
    let timer = 0;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, Math.max(0, (now - start) / duration));
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        el.textContent = String(Math.round(value * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          io.disconnect();
          timer = window.setTimeout(run, delay);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      el.textContent = String(value);
    };
  }, [value, duration, delay]);

  return <span ref={ref} className={className} dangerouslySetInnerHTML={{ __html: String(value) }} />;
}
