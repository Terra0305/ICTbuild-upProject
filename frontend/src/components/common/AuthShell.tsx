import type { ReactNode } from "react";

import { IconBell, IconSearch, IconTag } from "@/components/common/Icons";

const POINTS = [
  { icon: IconTag, text: "물건 정보를 한 번만 등록하세요" },
  { icon: IconSearch, text: "경찰청 습득물과 자동으로 비교해요" },
  { icon: IconBell, text: "새 후보가 생기면 알림으로 알려드려요" },
];

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main id="main" className="mx-auto grid w-full max-w-5xl 2xl:max-w-6xl flex-1 grid-cols-[minmax(0,1fr)] gap-10 px-4 py-10 sm:px-6 md:grid-cols-2 md:items-center md:gap-16 md:py-16">
      <div className="fade-up order-2 hidden md:order-1 md:block">
        <h2 className="text-3xl font-bold">
          잃어버린 순간부터
          <br />
          찾을 때까지 함께해요
        </h2>
        <ul className="mt-8 flex flex-col gap-5">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-4">
              <span className="flex size-11 items-center justify-center rounded-full bg-surface-2 text-ink">
                <Icon />
              </span>
              <span className="text-[0.9375rem] font-medium">{text}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="order-1 w-full md:order-2">
        <div className="mx-auto w-full max-w-md rounded-2xl bg-surface p-6 shadow-card sm:p-8">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-ink-2">{description}</p>
          <div className="mt-7">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm text-ink-2">{footer}</p>
      </div>
    </main>
  );
}
