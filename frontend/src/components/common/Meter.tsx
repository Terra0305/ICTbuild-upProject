"use client";

import { useEffect, useRef, useState } from "react";

/** 화면에 보이면 왼쪽에서 채워지는 가로 막대. */
export function Meter({ percent, delay = 0 }: { percent: number; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 아래쪽 여백이 크면 낮은 화면(720px 등)에서 하단 항목이 스크롤 전까지 0으로 멈춘다.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -48px 0px", threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
      <div
        className="h-full origin-left rounded-full bg-ink"
        style={{
          width: `${percent}%`,
          transform: on ? "scaleX(1)" : "scaleX(0)",
          transition: `transform 1000ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        }}
      />
    </div>
  );
}
