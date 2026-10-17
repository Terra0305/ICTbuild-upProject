"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

import {
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from "@/components/common/Icons";

/* ---------- shared popover plumbing ---------- */

const TRIGGER =
  "flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-transparent bg-surface-2 px-4 text-left text-[17px] transition-colors focus:border-ink focus:bg-surface focus:outline-none focus:ring-4 focus:ring-ink/10 aria-expanded:border-ink aria-expanded:bg-surface";

function useDismiss(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
}

function Popover({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className="pop-in absolute left-0 right-0 top-[calc(100%+8px)] z-30 origin-top rounded-2xl bg-surface p-3 shadow-[0_12px_40px_-8px_rgb(0_0_0/0.28)] ring-1 ring-line sm:p-4"
    >
      {children}
    </div>
  );
}

/* ---------- Date picker ---------- */

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function fromISO(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
const sameDay = (a: Date, b: Date) => toISO(a) === toISO(b);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function formatKorean(d: Date) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

export function DatePicker({
  id,
  value,
  onChange,
  max,
  placeholder = "날짜를 선택해주세요",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** 선택 가능한 마지막 날짜(기본: 오늘) */
  max?: Date;
  placeholder?: string;
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const limit = useMemo(() => startOfDay(max ?? today), [max, today]);
  const selected = fromISO(value);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"days" | "months">("days");
  const [cursor, setCursor] = useState<Date>(() => selected ?? today); // 보고 있는 달
  const [focusDay, setFocusDay] = useState<Date>(() => selected ?? today);
  const gridRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const close = useCallback(() => setOpen(false), []);
  const wrapRef = useDismiss(open, close);

  function toggle() {
    if (!open) {
      const base = selected ?? today;
      setCursor(base);
      setFocusDay(base);
      setView("days");
    }
    setOpen((o) => !o);
  }

  function pick(d: Date) {
    if (d > limit) return;
    onChange(toISO(d));
    setOpen(false);
    triggerRef.current?.focus();
  }

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  const canNext = new Date(year, month + 1, 1) <= limit;

  function moveMonth(delta: number) {
    setCursor(new Date(year, month + delta, 1));
  }

  function onGridKey(e: React.KeyboardEvent) {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(e.key in step)) return;
    e.preventDefault();
    let next = addDays(focusDay, step[e.key]);
    if (next > limit) next = limit;
    setFocusDay(next);
    setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
    requestAnimationFrame(() => {
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${toISO(next)}"]`)?.focus();
    });
  }

  const quick = [
    { label: "오늘", date: today },
    { label: "어제", date: addDays(today, -1) },
    { label: "일주일 전", date: addDays(today, -7) },
  ];

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={toggle}
        className={TRIGGER}
      >
        <span className={selected ? "text-ink" : "text-ink-2/70"}>{selected ? formatKorean(selected) : placeholder}</span>
        <IconCalendar className="shrink-0 text-ink-2" />
      </button>

      {open && (
        <Popover label="날짜 선택">
          <div id={listId}>
            <div className="mb-3 flex items-center justify-between">
              {view === "days" ? (
                <button
                  type="button"
                  onClick={() => setView("months")}
                  className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-[17px] font-bold hover:bg-surface-2"
                >
                  {year}년 {month + 1}월
                  <IconChevronDown width={16} height={16} />
                </button>
              ) : (
                <span className="px-3 text-[17px] font-bold">{year}년</span>
              )}
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label={view === "days" ? "이전 달" : "이전 해"}
                  onClick={() => (view === "days" ? moveMonth(-1) : setCursor(new Date(year - 1, month, 1)))}
                  className="flex size-10 items-center justify-center rounded-full hover:bg-surface-2"
                >
                  <IconChevronLeft />
                </button>
                <button
                  type="button"
                  aria-label={view === "days" ? "다음 달" : "다음 해"}
                  disabled={view === "days" ? !canNext : year >= limit.getFullYear()}
                  onClick={() => (view === "days" ? moveMonth(1) : setCursor(new Date(year + 1, month, 1)))}
                  className="flex size-10 items-center justify-center rounded-full hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <IconChevronRight />
                </button>
              </div>
            </div>

            {view === "months" ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 12 }, (_, m) => {
                  const disabled = new Date(year, m, 1) > limit;
                  const current = m === month;
                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setCursor(new Date(year, m, 1));
                        setView("days");
                      }}
                      className={`min-h-12 rounded-full text-[15px] font-semibold transition-colors disabled:text-ink-2/40 ${
                        current ? "bg-ink text-bg" : "hover:bg-surface-2"
                      }`}
                    >
                      {m + 1}월
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 pb-1 text-center text-xs font-semibold text-ink-2">
                  {WEEKDAYS.map((w) => (
                    <span key={w} className="py-1.5">
                      {w}
                    </span>
                  ))}
                </div>
                <div ref={gridRef} role="grid" onKeyDown={onGridKey} className="grid grid-cols-7 gap-y-1">
                  {cells.map((d, i) =>
                    d ? (
                      <button
                        key={i}
                        type="button"
                        data-date={toISO(d)}
                        tabIndex={sameDay(d, focusDay) ? 0 : -1}
                        disabled={d > limit}
                        aria-pressed={selected ? sameDay(d, selected) : false}
                        aria-label={formatKorean(d)}
                        onClick={() => pick(d)}
                        className={`num mx-auto flex size-10 items-center justify-center rounded-full text-[15px] font-medium transition-colors disabled:text-ink-2/35 sm:size-11 ${
                          selected && sameDay(d, selected)
                            ? "bg-ink text-bg"
                            : sameDay(d, today)
                              ? "bg-surface-2 font-bold hover:brightness-95"
                              : "hover:bg-surface-2 disabled:hover:bg-transparent"
                        }`}
                      >
                        {d.getDate()}
                      </button>
                    ) : (
                      <span key={i} />
                    ),
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                  {quick.map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => pick(q.date)}
                      className="min-h-9 rounded-full bg-surface-2 px-4 text-sm font-semibold hover:brightness-95"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </Popover>
      )}
    </div>
  );
}

/* ---------- Select ---------- */

export interface SelectOption {
  value: string;
  label: string;
}

export function SelectField({
  id,
  value,
  onChange,
  options,
  placeholder = "선택해주세요",
  label,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const close = useCallback(() => setOpen(false), []);
  const wrapRef = useDismiss(open, close);
  const selected = options.find((o) => o.value === value);

  function toggle() {
    if (!open) setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen((o) => !o);
  }

  function choose(i: number) {
    onChange(options[i].value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  useEffect(() => {
    if (open) listRef.current?.focus({ preventScroll: true });
  }, [open]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(options.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative" onKeyDown={open ? onKey : undefined}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={toggle}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            toggle();
          }
        }}
        className={TRIGGER}
      >
        <span className={selected ? "text-ink" : "text-ink-2/70"}>{selected ? selected.label : placeholder}</span>
        <IconChevronDown className={`shrink-0 text-ink-2 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="pop-in absolute left-0 right-0 top-[calc(100%+8px)] z-30 origin-top overflow-hidden rounded-2xl bg-surface shadow-[0_12px_40px_-8px_rgb(0_0_0/0.28)] ring-1 ring-line">
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            aria-activedescendant={`${listId}-${active}`}
            className="max-h-72 overflow-y-auto p-1.5 outline-none"
          >
            {options.map((o, i) => {
              const isSelected = o.value === value;
              return (
                <li
                  key={o.value}
                  id={`${listId}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(i)}
                  className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 text-[16px] ${
                    i === active ? "bg-surface-2" : ""
                  } ${isSelected ? "font-bold" : "font-medium"}`}
                >
                  {o.label}
                  {isSelected && <IconCheck width={18} height={18} />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
