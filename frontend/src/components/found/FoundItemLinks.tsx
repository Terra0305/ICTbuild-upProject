"use client";

import { useEffect, useState } from "react";

import { IconExternal, IconPin } from "@/components/common/Icons";
import { mapSearchUrl, POLICE_FOUND_SEARCH_URL } from "@/constants";
import type { FoundItem } from "@/types";

const COPIED_MS = 1_500;

const LINK_CLASS =
  "inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-ink-2 ring-1 ring-line hover:bg-surface-2 hover:text-ink";

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
      {children}
      <IconExternal width={14} height={14} />
      <span className="sr-only">(새 창)</span>
    </a>
  );
}

/** 카드용: 습득물 한 건으로 바로 가는 공식 페이지가 없어, 보관 장소 지도와 경찰 습득물 검색으로 안내한다. */
export function FoundItemShortcuts({ item }: { item: FoundItem }) {
  return (
    <>
      {item.storagePlace && (
        <ExternalLink href={mapSearchUrl(item.storagePlace)}>
          <IconPin width={14} height={14} />
          지도에서 보기
        </ExternalLink>
      )}
      {item.source === "LOST112" && <ExternalLink href={POLICE_FOUND_SEARCH_URL}>경찰민원24 검색</ExternalLink>}
    </>
  );
}

/** 상세 화면용: 직접 확인하는 방법을 순서대로 안내한다. */
export function FoundItemVerify({ item }: { item: FoundItem }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(item.sourceItemId);
      setCopied(true);
    } catch {
      /* 클립보드를 쓸 수 없으면 화면의 번호를 직접 보고 적으면 된다. */
    }
  }

  if (item.source !== "LOST112" && !item.storagePlace) return null;
  return (
    <section className="mt-6 rounded-xl bg-surface-2 p-4" aria-labelledby="verify-title">
      <h2 id="verify-title" className="text-sm font-bold">
        내 물건인지 확인하려면
      </h2>
      <p className="mt-1 text-sm text-ink-2">
        {item.source === "LOST112"
          ? "경찰청 습득물은 경찰민원24 습득물 검색에서 보관 장소와 습득일로 찾을 수 있고, 보관 기관에 전화로 문의할 수 있어요."
          : "보관 장소로 직접 문의해 확인해주세요."}
      </p>
      {item.source === "LOST112" && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-ink-2">관리번호</span>
          <span className="num font-bold">{item.sourceItemId}</span>
          <button
            type="button"
            onClick={() => void copyId()}
            className="min-h-9 rounded-full px-3 text-xs font-semibold text-ink-2 ring-1 ring-line hover:bg-surface hover:text-ink"
          >
            {copied ? "복사됨" : "복사"}
          </button>
          <span className="text-xs text-ink-2">문의할 때 알려주세요.</span>
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <FoundItemShortcuts item={item} />
      </div>
    </section>
  );
}
