"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { IconBack, IconImage } from "@/components/common/Icons";
import { Button, LinkButton, Notice, PageShell } from "@/components/common/ui";
import { CATEGORY_OPTIONS, COLOR_OPTIONS, REGION_OPTIONS } from "@/constants";
import { getFoundItem } from "@/lib/api";
import type { FoundItem } from "@/types";

const STATUS_LABELS: Record<FoundItem["status"], string> = {
  STORED: "보관 중",
  RETURNED: "반환 완료",
  DISPOSED: "폐기",
  UNKNOWN: "상태 확인 필요",
};

export default function FoundItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [item, setItem] = useState<FoundItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFoundItem(id)
      .then(setItem)
      .catch(() => setError("습득물을 찾을 수 없습니다."));
  }, [id]);

  if (error) {
    return (
      <PageShell width="max-w-2xl">
        <Notice tone="error">{error}</Notice>
        <div className="mt-6">
          <LinkButton href="/lost" variant="secondary">
            내 분실물로 돌아가기
          </LinkButton>
        </div>
      </PageShell>
    );
  }
  if (!item) {
    return (
      <PageShell width="max-w-2xl">
        <div className="skeleton h-10 w-2/3" />
        <div className="skeleton mt-6 h-64" />
      </PageShell>
    );
  }

  const category = CATEGORY_OPTIONS.find((c) => c.code === item.categoryCode)?.label;
  const colors = item.colorCodes.map((c) => COLOR_OPTIONS.find((o) => o.code === c)?.label ?? c).join(", ");
  const region = REGION_OPTIONS.find((r) => r.code === item.regionCode)?.label;
  const stored = item.status === "STORED" || item.status === "UNKNOWN";

  return (
    <PageShell width="max-w-2xl">
      <Button variant="ghost" className="-ml-3 mb-3 min-h-10 px-3" onClick={() => router.back()}>
        <IconBack width={18} height={18} />
        돌아가기
      </Button>

      <article className="overflow-hidden rounded-2xl bg-surface shadow-card">
        <div className="flex aspect-[16/9] items-center justify-center bg-surface-2">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={`${item.title} 사진`} className="size-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-ink-2">
              <IconImage width={32} height={32} />
              <span className="text-sm">공개된 사진이 없어요</span>
            </div>
          )}
        </div>
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                stored ? "bg-ok-soft text-ok" : "bg-surface-2 text-ink-2"
              }`}
            >
              {STATUS_LABELS[item.status]}
            </span>
            <span className="text-xs text-ink-2">
              출처 {item.source === "LOST112" ? "경찰청 LOST112" : "기관 등록"}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{item.title}</h1>

          <div className="mt-6 rounded-xl bg-tag p-4 text-tag-ink">
            <p className="text-sm font-bold">내 물건 같다면</p>
            <p className="mt-1 text-lg font-bold">{item.storagePlace || "보관 장소 정보 없음"}</p>
            <p className="mt-1 text-sm font-medium">{item.contactText ? `문의 ${item.contactText}` : "문의처 정보가 없어요. 보관 장소로 직접 문의해주세요."}</p>
          </div>

          <dl className="mt-6 grid gap-x-8 gap-y-5 text-[15px] sm:grid-cols-2">
            <Info label="습득 날짜" value={item.foundDate} />
            <Info label="지역" value={region ?? "-"} />
            <Info label="습득 장소" value={item.placeText || "-"} wide />
            <Info label="종류" value={category ?? "-"} />
            <Info label="색상" value={colors || "-"} />
            <Info label="설명" value={item.description || "-"} wide />
          </dl>
        </div>
      </article>

    </PageShell>
  );
}

function Info({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-sm font-semibold text-ink-2">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap font-medium">{value}</dd>
    </div>
  );
}
