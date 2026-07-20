"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch, ApiError } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { CATEGORY_OPTIONS, COLOR_OPTIONS, REGION_OPTIONS } from "@/constants";
import {
  validateDescription,
  validateImageFile,
  validateLostDate,
  validateLostItemTitle,
  validatePlaceText,
} from "@/lib/validators";

interface FormState {
  title: string;
  categoryCode: string;
  colorCodes: string[];
  lostDate: string;
  regionCode: string;
  placeText: string;
  description: string;
  image: File | null;
}

const STEP_LABELS = ["물건 정보", "분실 시점·장소", "상세 설명", "사진·확인"];

const INITIAL_STATE: FormState = {
  title: "",
  categoryCode: "",
  colorCodes: [],
  lostDate: "",
  regionCode: "",
  placeText: "",
  description: "",
  image: null,
};

export default function NewLostItemPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, [router]);

  function toggleColor(code: string) {
    setForm((prev) => ({
      ...prev,
      colorCodes: prev.colorCodes.includes(code)
        ? prev.colorCodes.filter((c) => c !== code)
        : [...prev.colorCodes, code],
    }));
  }

  function validateStep(): string | null {
    if (step === 0) {
      const titleError = validateLostItemTitle(form.title);
      if (titleError) return titleError;
      if (!form.categoryCode) return "카테고리를 선택해주세요.";
    }
    if (step === 1) {
      const dateError = validateLostDate(form.lostDate);
      if (dateError) return dateError;
      if (!form.regionCode) return "시·도를 선택해주세요.";
      const placeError = validatePlaceText(form.placeText);
      if (placeError) return placeError;
    }
    if (step === 2) {
      const descError = validateDescription(form.description);
      if (descError) return descError;
    }
    if (step === 3 && form.image) {
      const imageError = validateImageFile(form.image);
      if (imageError) return imageError;
    }
    return null;
  }

  function goNext() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const body = new FormData();
    body.append("title", form.title);
    body.append("category_code", form.categoryCode);
    body.append("color_codes", JSON.stringify(form.colorCodes));
    body.append("lost_date", form.lostDate);
    body.append("region_code", form.regionCode);
    body.append("place_text", form.placeText);
    body.append("description", form.description);
    if (form.image) body.append("image", form.image);

    try {
      const created = await apiFetch<{ id: string }>("/lost-items", { method: "POST", body });
      setCreatedId(created.id);
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setSubmitError("로그인이 만료되었습니다. 다시 로그인해주세요.");
        router.push("/login");
      } else if (err instanceof ApiError) {
        setSubmitError(`등록에 실패했습니다 (상태 코드 ${err.status}). 잠시 후 다시 시도해주세요.`);
      } else {
        setSubmitError("아직 등록 API가 연결되지 않았습니다. 백엔드 배포 완료 후 다시 시도해주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-6 py-32 text-center">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">등록이 완료되었습니다</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          등록하신 분실물과 습득물 데이터를 비교해 추천 후보를 찾는 중입니다.
        </p>
        <div className="mt-8 flex gap-3">
          {createdId && (
            <button
              type="button"
              onClick={() => router.push(`/lost/${createdId}/matches`)}
              className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              매칭 결과 보기
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push("/lost")}
            className="rounded-full border border-zinc-300 px-6 py-3 text-sm dark:border-zinc-700"
          >
            내 분실물 목록
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-16">
      <ol className="mb-8 flex items-center gap-2 text-xs text-zinc-500">
        {STEP_LABELS.map((label, index) => (
          <li
            key={label}
            className={`flex-1 border-b-2 pb-2 text-center ${
              index === step
                ? "border-black font-medium text-black dark:border-white dark:text-white"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5 text-sm">
            물품명 (2~100자)
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={100}
              className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="예: 검은색 카드지갑"
            />
          </label>
          <div className="flex flex-col gap-1.5 text-sm">
            카테고리
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => setForm({ ...form, categoryCode: opt.code })}
                  className={`rounded-full border px-3 py-1.5 text-xs ${
                    form.categoryCode === opt.code
                      ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                      : "border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            색상 (복수 선택 가능)
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => toggleColor(opt.code)}
                  className={`rounded-full border px-3 py-1.5 text-xs ${
                    form.colorCodes.includes(opt.code)
                      ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                      : "border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5 text-sm">
            분실 날짜
            <input
              type="date"
              value={form.lostDate}
              onChange={(e) => setForm({ ...form, lostDate: e.target.value })}
              className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            시·도
            <select
              value={form.regionCode}
              onChange={(e) => setForm({ ...form, regionCode: e.target.value })}
              className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">선택해주세요</option>
              {REGION_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            상세 장소 (선택, 200자 이하)
            <input
              value={form.placeText}
              onChange={(e) => setForm({ ...form, placeText: e.target.value })}
              maxLength={200}
              className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="예: 조선대학교 중앙도서관 2층"
            />
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5 text-sm">
            특징 설명 (선택, 1,000자 이하)
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={1000}
              rows={6}
              className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="브랜드, 모델명, 각인, 스크래치 등 구체적인 특징을 입력해주세요."
            />
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5 text-sm">
            사진 (선택, JPG/PNG/WEBP, 최대 10MB)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setForm({ ...form, image: e.target.files?.[0] ?? null })}
            />
          </label>
          <dl className="rounded-md border border-zinc-200 p-4 text-sm dark:border-zinc-800">
            <div className="flex justify-between py-1">
              <dt className="text-zinc-500">물품명</dt>
              <dd>{form.title || "-"}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-zinc-500">카테고리</dt>
              <dd>{CATEGORY_OPTIONS.find((c) => c.code === form.categoryCode)?.label ?? "-"}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-zinc-500">색상</dt>
              <dd>{form.colorCodes.join(", ") || "-"}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-zinc-500">분실 날짜</dt>
              <dd>{form.lostDate || "-"}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-zinc-500">지역</dt>
              <dd>{REGION_OPTIONS.find((r) => r.code === form.regionCode)?.label ?? "-"}</dd>
            </div>
          </dl>
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0}
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm disabled:opacity-40 dark:border-zinc-700"
        >
          이전
        </button>
        {step < STEP_LABELS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            다음
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {submitting ? "등록 중..." : "등록하기"}
          </button>
        )}
      </div>
    </div>
  );
}
