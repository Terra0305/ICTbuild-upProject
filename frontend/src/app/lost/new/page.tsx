"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DatePicker, SelectField } from "@/components/common/Pickers";
import { IconBack, IconCheck, IconImage, IconX } from "@/components/common/Icons";
import {
  Button,
  Chip,
  ClaimCode,
  Field,
  LinkButton,
  Notice,
  PageShell,
  Swatch,
  fieldClass,
} from "@/components/common/ui";
import { apiFetch, ApiError } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { CATEGORY_OPTIONS, COLOR_OPTIONS, REGION_OPTIONS } from "@/constants";
import {
  validateCustomCategory,
  validateCustomColor,
  validateDescription,
  validateImageFile,
  validateLostDate,
  validateLostItemTitle,
  validatePlaceText,
} from "@/lib/validators";

interface FormState {
  title: string;
  categoryCode: string;
  customCategory: string;
  colorCodes: string[];
  customColorText: string;
  lostDate: string;
  regionCode: string;
  placeText: string;
  description: string;
  image: File | null;
}

const STEP_LABELS = ["물건 정보", "시점·장소", "상세 설명", "사진·확인"];
const STEP_TITLES = [
  "어떤 물건을 잃어버리셨나요?",
  "언제, 어디서 잃어버리셨나요?",
  "물건의 특징을 알려주세요",
  "마지막으로 확인해주세요",
];

const INITIAL_STATE: FormState = {
  title: "",
  categoryCode: "",
  customCategory: "",
  colorCodes: [],
  customColorText: "",
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

  const previewUrl = useMemo(() => (form.image ? URL.createObjectURL(form.image) : null), [form.image]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
      if (form.categoryCode === "ETC") {
        const categoryError = validateCustomCategory(form.customCategory);
        if (categoryError) return categoryError;
      }
      if (form.colorCodes.includes("OTHER")) return validateCustomColor(form.customColorText);
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
    if (form.categoryCode === "ETC") body.append("custom_category", form.customCategory.trim());
    body.append("color_codes", JSON.stringify(form.colorCodes.filter((code) => code !== "OTHER")));
    if (form.colorCodes.includes("OTHER")) body.append("custom_color_text", form.customColorText.trim());
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
      <PageShell width="max-w-md">
        <div className="print-in rounded-2xl bg-surface p-8 text-center shadow-card">
          <span className="pop mx-auto flex size-14 items-center justify-center rounded-full bg-ok-soft text-ok">
            <IconCheck width={28} height={28} className="draw" />
          </span>
          <h1 className="mt-5 text-2xl font-bold">분실물이 등록되었어요</h1>
          {createdId && (
            <p className="mt-3">
              <ClaimCode id={createdId} />
            </p>
          )}
          <p className="mt-4 text-[15px] text-ink-2">
            경찰청 습득물과 비교해 추천 후보를 찾고 있어요. 새 습득물이 올라오면 알림으로 알려드릴게요.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {createdId && (
              <LinkButton href={`/lost/${createdId}/matches`} className="min-h-12">
                추천 후보 보기
              </LinkButton>
            )}
            <LinkButton href="/lost" variant="secondary" className="min-h-12">
              내 분실물 목록
            </LinkButton>
          </div>
        </div>
      </PageShell>
    );
  }

  const categoryLabel =
    form.categoryCode === "ETC"
      ? form.customCategory || "기타"
      : (CATEGORY_OPTIONS.find((c) => c.code === form.categoryCode)?.label ?? "-");
  const colorLabels = [
    ...form.colorCodes.filter((code) => code !== "OTHER").map((c) => COLOR_OPTIONS.find((o) => o.code === c)?.label ?? c),
    ...(form.colorCodes.includes("OTHER") && form.customColorText ? [form.customColorText] : []),
  ];

  return (
    <PageShell width="max-w-xl">
      <nav aria-label="진행 단계" className="mb-8">
        <ol className="flex items-start gap-1.5">
          {STEP_LABELS.map((label, index) => (
            <li
              key={label}
              aria-current={index === step ? "step" : undefined}
              className="flex flex-1 flex-col gap-2"
            >
              <span
                className={`h-1.5 rounded-full transition-colors ${index <= step ? "bg-brand" : "bg-line"}`}
              />
              <span
                className={`text-xs font-semibold ${
                  index === step ? "text-ink" : "text-ink-2"
                } ${index === step ? "" : "hidden sm:block"}`}
              >
                {index + 1}. {label}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      <h1 key={`title-${step}`} className="fade-up text-2xl font-bold sm:text-3xl">{STEP_TITLES[step]}</h1>
      <p className="mt-2 text-sm text-ink-2">
        {step === 3 ? "내용이 맞다면 등록해주세요. 등록 후에도 추천 후보는 계속 업데이트돼요." : "선택이라고 적힌 항목은 비워둬도 괜찮아요."}
      </p>

      <div key={`card-${step}`} className="fade-up mt-8 rounded-2xl bg-surface p-5 shadow-card sm:p-7">
        {step === 0 && (
          <div className="flex flex-col gap-7">
            <Field label="물품명" hint="2~100자" htmlFor="title">
              <input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={100}
                className={fieldClass}
                placeholder="예: 검은색 카드지갑"
              />
            </Field>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">종류</legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.code}
                    selected={form.categoryCode === opt.code}
                    onClick={() =>
                      setForm({
                        ...form,
                        categoryCode: opt.code,
                        customCategory: opt.code === "ETC" ? form.customCategory : "",
                      })
                    }
                  >
                    {opt.label}
                  </Chip>
                ))}
              </div>
              {form.categoryCode === "ETC" && (
                <div className="mt-4">
                  <Field label="기타 종류 직접 입력" hint="2~50자" htmlFor="custom-category">
                    <input
                      id="custom-category"
                      value={form.customCategory}
                      onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                      maxLength={50}
                      className={fieldClass}
                      placeholder="예: 악기, 반려동물용품, 캠핑용품"
                    />
                  </Field>
                </div>
              )}
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">
                색상 <span className="font-normal text-ink-2">여러 개 선택할 수 있어요</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((opt) => (
                  <Chip key={opt.code} selected={form.colorCodes.includes(opt.code)} onClick={() => toggleColor(opt.code)}>
                    <Swatch code={opt.code} size={16} />
                    {opt.label}
                  </Chip>
                ))}
              </div>
              {form.colorCodes.includes("OTHER") && (
                <div className="mt-4">
                  <Field label="기타 색상 직접 입력" hint="1~50자" htmlFor="custom-color">
                    <input
                      id="custom-color"
                      value={form.customColorText}
                      onChange={(e) => setForm({ ...form, customColorText: e.target.value })}
                      maxLength={50}
                      className={fieldClass}
                      placeholder="예: 민트색, 버건디, 무지개색"
                    />
                  </Field>
                </div>
              )}
            </fieldset>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-6">
            <Field label="잃어버린 날짜" htmlFor="lost-date">
              <DatePicker
                id="lost-date"
                value={form.lostDate}
                onChange={(lostDate) => setForm({ ...form, lostDate })}
              />
            </Field>
            <Field label="시·도" htmlFor="region">
              <SelectField
                id="region"
                label="시·도"
                value={form.regionCode}
                onChange={(regionCode) => setForm({ ...form, regionCode })}
                options={REGION_OPTIONS.map((o) => ({ value: o.code, label: o.label }))}
                placeholder="시·도를 선택해주세요"
              />
            </Field>
            <Field label="상세 장소" hint="선택 · 200자 이하" htmlFor="place">
              <input
                id="place"
                value={form.placeText}
                onChange={(e) => setForm({ ...form, placeText: e.target.value })}
                maxLength={200}
                className={fieldClass}
                placeholder="예: 조선대학교 중앙도서관 2층"
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <Field label="특징 설명" hint="선택 · 1,000자 이하" htmlFor="description">
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={1000}
              rows={7}
              className={`${fieldClass} min-h-40 resize-y py-3 leading-relaxed`}
              placeholder="브랜드, 모델명, 각인, 스크래치, 안에 들어 있던 물건 등 구체적일수록 정확해져요."
            />
            <span className="num self-end text-xs text-ink-2">{form.description.length} / 1000</span>
          </Field>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-7">
            <div>
              <p className="mb-2 text-sm font-semibold">
                사진 <span className="font-normal text-ink-2">선택 · JPG/PNG/WEBP · 최대 10MB</span>
              </p>
              {previewUrl ? (
                <div className="relative overflow-hidden rounded-xl border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="선택한 사진 미리보기" className="max-h-64 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, image: null })}
                    className="absolute right-2 top-2 flex size-10 items-center justify-center rounded-full bg-ink/80 text-bg hover:bg-ink"
                    aria-label="사진 지우기"
                  >
                    <IconX width={18} height={18} />
                  </button>
                </div>
              ) : (
                <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl bg-surface-2 px-4 py-8 text-center transition-colors hover:brightness-95 focus-within:ring-4 focus-within:ring-ink/10">
                  <IconImage width={28} height={28} className="text-ink" />
                  <span className="text-[15px] font-semibold">사진 올리기</span>
                  <span className="text-sm text-ink-2">사진이 있으면 비슷한 습득물을 더 정확히 찾아요</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => setForm({ ...form, image: e.target.files?.[0] ?? null })}
                  />
                </label>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-line">
              <div className="flex items-center justify-between bg-surface-2 px-4 py-2.5">
                <span className="text-sm font-bold">등록 내용 확인</span>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="min-h-8 text-sm font-semibold text-ink underline underline-offset-4"
                >
                  수정
                </button>
              </div>
              <dl className="divide-y divide-line px-4 text-[15px]">
                <Summary label="물품명" value={form.title || "-"} />
                <Summary label="종류" value={categoryLabel} />
                <Summary label="색상" value={colorLabels.join(", ") || "-"} />
                <Summary label="잃어버린 날" value={form.lostDate || "-"} />
                <Summary label="지역" value={REGION_OPTIONS.find((r) => r.code === form.regionCode)?.label ?? "-"} />
                {form.placeText && <Summary label="상세 장소" value={form.placeText} />}
              </dl>
            </div>
            {submitError && <Notice tone="error">{submitError}</Notice>}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button variant="secondary" onClick={goBack} disabled={step === 0} className="min-h-12 px-5">
          <IconBack width={18} height={18} />
          이전
        </Button>
        {step < STEP_LABELS.length - 1 ? (
          <Button onClick={goNext} className="min-h-12 flex-1">
            다음
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting} className="min-h-12 flex-1">
            {submitting ? "등록 중..." : "분실물 등록하기"}
          </Button>
        )}
      </div>
    </PageShell>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-3">
      <dt className="shrink-0 text-ink-2">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
