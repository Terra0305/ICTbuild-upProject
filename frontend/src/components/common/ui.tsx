import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { CountUp } from "@/components/common/CountUp";
import { IconAlert, IconInfo } from "@/components/common/Icons";
import type { LostItem, ScoreLabel } from "@/types";

/* ---------- Buttons ---------- */

type Variant = "primary" | "secondary" | "ghost" | "tag" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-bg hover:opacity-85",
  secondary: "bg-surface-2 text-ink hover:brightness-95",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  tag: "bg-ink text-bg hover:opacity-85",
  danger: "bg-danger-soft text-danger hover:brightness-95",
};

const BUTTON_BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-[1.0625rem] font-semibold transition-[background-color,filter,opacity,transform] duration-[160ms] ease-[var(--ease-out)] active:scale-[0.97] active:opacity-80 disabled:pointer-events-none disabled:opacity-50";

export function buttonClass(variant: Variant = "primary", extra = "") {
  return `${BUTTON_BASE} ${VARIANTS[variant]} ${extra}`.trim();
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

export function LinkButton({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}

/* ---------- Layout ---------- */

export function PageShell({
  children,
  width = "max-w-3xl lg:max-w-5xl 2xl:max-w-6xl",
}: {
  children: ReactNode;
  width?: string;
}) {
  return (
    <main id="main" className={`fade-up mx-auto w-full ${width} flex-1 px-4 pb-28 pt-8 sm:px-6 sm:pt-12 md:pb-16`}>
      {children}
    </main>
  );
}

export function PageHeader({
  title,
  description,
  action,
  back,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <div className="mb-8">
      {back && <div className="mb-3">{back}</div>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-[1.75rem] font-bold sm:text-3xl">{title}</h1>
          {description && <p className="mt-2 max-w-prose text-[0.9375rem] text-ink-2">{description}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

/* ---------- Form ---------- */

const FIELD_BOX =
  "min-h-12 w-full rounded-xl border border-transparent bg-surface-2 px-4 text-[1.0625rem] text-ink transition-[border-color,background-color,box-shadow] duration-200 ease-[var(--ease-out)] focus:border-ink focus:bg-surface focus:outline-none focus:ring-4 focus:ring-ink/10 aria-[invalid=true]:border-danger";

export const fieldClass = FIELD_BOX;

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
        {hint && <span className="ml-2 font-normal text-ink-2">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-[0.9375rem] font-medium transition-[background-color,color,filter,transform] duration-[160ms] ease-[var(--ease-out)] active:scale-[0.97] ${
        selected ? "bg-ink text-bg" : "bg-surface-2 text-ink hover:brightness-95"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- Feedback ---------- */

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "warn";
  children: ReactNode;
}) {
  const styles = {
    info: "bg-brand-soft text-ink",
    error: "bg-danger-soft text-danger",
    warn: "bg-warn-soft text-warn",
  }[tone];
  const Icon = tone === "info" ? IconInfo : IconAlert;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-3 rounded-xl p-4 text-sm ${styles}`}>
      <Icon className="mt-0.5 shrink-0" width={18} height={18} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function LoadingList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="불러오는 중">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-28" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-surface px-6 py-14 text-center">
      <p className="text-lg font-bold">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-2">{description}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

/* ---------- Claim tag language ---------- */

/** 접수 번호처럼 보이는 짧은 코드. 서버 id의 앞부분을 그대로 사용한다. */
export function claimCode(id: string): string {
  return `RF-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export function ClaimCode({ id }: { id: string }) {
  return (
    <span className="num rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-2">
      {claimCode(id)}
    </span>
  );
}

const STATUS_STYLE: Record<LostItem["status"], { label: string; cls: string }> = {
  ACTIVE: { label: "찾는 중", cls: "bg-surface-2 text-ink" },
  FOUND: { label: "찾았어요", cls: "bg-ok-soft text-ok" },
  CLOSED: { label: "종료", cls: "bg-surface-2 text-ink-2" },
};

export function StatusBadge({ status }: { status: LostItem["status"] }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${s.cls}`}>
      {status === "ACTIVE" && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
      {s.label}
    </span>
  );
}

export const SCORE_COPY: Record<ScoreLabel, string> = {
  HIGH: "가능성 높음",
  MEDIUM: "확인해볼 만함",
  LOW: "참고용",
};

/** 태그 우측 스텁: 매칭 점수. 색이 아니라 문구로도 등급을 전달한다. */
export function ScoreStub({ score, label }: { score: number; label: ScoreLabel }) {
  const high = label === "HIGH";
  return (
    <div
      className={`flex w-24 shrink-0 flex-col items-center justify-center gap-1 px-3 py-4 text-center sm:w-28 ${
        high ? "bg-ink text-bg" : "bg-surface-2 text-ink"
      }`}
    >
      <span className="text-[0.6875rem] font-bold leading-tight">매칭 점수</span>
      <span className="pop num text-3xl font-bold leading-none sm:text-4xl">
        <CountUp value={Math.round(score * 100)} duration={1100} delay={150} />
      </span>
      <span className="text-[0.6875rem] font-bold leading-tight">{SCORE_COPY[label]}</span>
    </div>
  );
}

/** 카테고리 칩용 색상 견본. 코드→표시색. */
export const COLOR_SWATCH: Record<string, string> = {
  BLACK: "#14161c",
  WHITE: "#ffffff",
  NAVY: "#1b2a5c",
  BEIGE: "#d9c3a0",
  GRAY: "#8b909c",
  RED: "#d8333f",
  BLUE: "#2f6bea",
  GREEN: "#2f9e5b",
  YELLOW: "#f4cf2f",
  PINK: "#f08cb4",
  PURPLE: "#8a55d6",
  BROWN: "#7a4a2b",
  ORANGE: "#f08a24",
  SILVER: "#c4c8d0",
  GOLD: "#c9a227",
  TRANSPARENT: "transparent",
  OTHER: "conic-gradient(#d8333f, #f4cf2f, #2f9e5b, #2f6bea, #8a55d6, #d8333f)",
};

export function Swatch({ code, size = 14 }: { code: string; size?: number }) {
  const bg = COLOR_SWATCH[code] ?? "#8b909c";
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded-full border border-ink/25"
      style={{
        width: size,
        height: size,
        background: code === "TRANSPARENT" ? "repeating-conic-gradient(#ccd 0 25%, #fff 0 50%) 50% / 6px 6px" : bg,
      }}
    />
  );
}
