import Link from "next/link";

import { CountUp } from "@/components/common/CountUp";
import { IconArrow, IconBell, IconImage, IconSearch, IconShield, IconTag, LogoMark } from "@/components/common/Icons";
import { Meter } from "@/components/common/Meter";
import { Reveal } from "@/components/common/Reveal";
import { ScrollLine } from "@/components/common/ScrollLine";
import { LinkButton, ScoreStub, buttonClass } from "@/components/common/ui";
import { CATEGORY_OPTIONS, MATCH_NOTIFICATION_THRESHOLD, REGION_OPTIONS } from "@/constants";

const STEPS = [
  {
    icon: IconTag,
    title: "잃어버린 물건을 알려주세요",
    body: "물품명, 색상, 잃어버린 날짜와 지역이면 충분해요. 사진이 있으면 더 정확해져요.",
  },
  {
    icon: IconSearch,
    title: "경찰청 습득물과 비교해요",
    body: "설명·사진·종류·색상·장소·날짜를 함께 보고 가능성이 높은 후보 TOP 5를 골라요.",
  },
  {
    icon: IconBell,
    title: "새 습득물이 들어오면 알려드려요",
    body: "지금은 없어도 괜찮아요. 비슷한 물건이 새로 등록되면 알림으로 먼저 알려드려요.",
  },
];

const FACTORS = ["설명 텍스트", "사진", "물건 종류", "색상", "장소", "날짜"];

const TRUST = [
  { icon: IconShield, label: "공공데이터 기반" },
  { icon: IconSearch, label: "자동 비교" },
  { icon: IconBell, label: "새 후보 알림" },
];

/** 예시 화면용 가짜 후보 (실제 데이터가 아니다). */
const SAMPLE_RANKS = [
  { title: "검정 가죽 카드지갑", meta: "강남경찰서 보관", score: 92 },
  { title: "검정색 지갑", meta: "서울교통공사 유실물센터", score: 81 },
  { title: "카드 케이스 (갈색)", meta: "역삼파출소 보관", score: 66 },
  { title: "학생증이 든 파우치", meta: "서초경찰서 보관", score: 58 },
  { title: "명함지갑", meta: "서울교통공사 유실물센터", score: 52 },
];

export default function Home() {
  const notifyScore = Math.round(MATCH_NOTIFICATION_THRESHOLD * 100);

  return (
    <div className="snap-page flex flex-1 flex-col">
      {/* 1. Hero */}
      <section className="snap-section flex flex-col bg-surface">
        <div className="flex flex-1 items-center">
          <div className="mx-auto grid w-full max-w-5xl grid-cols-[minmax(0,1fr)] items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-12">
            <div className="hero-copy">
              <h1 className="text-[2rem] font-bold leading-[1.2] sm:text-5xl">
                <span className="rise block" style={{ ["--d" as string]: "0ms" }}>
                  잃어버린 물건,
                </span>
                <span className="rise block" style={{ ["--d" as string]: "110ms" }}>
                  습득물에서 <span className="text-ink-2">대신 찾아드려요</span>
                </span>
              </h1>
              <p
                className="rise mt-5 max-w-md text-[17px] leading-relaxed text-ink-2 sm:text-lg"
                style={{ ["--d" as string]: "220ms" }}
              >
                물건 정보를 등록하면 경찰청 LOST112 공공 습득물과 자동으로 비교해 가능성이 높은 후보를 보여드려요.
              </p>
              <div
                className="rise mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
                style={{ ["--d" as string]: "320ms" }}
              >
                <LinkButton href="/lost/new" className="min-h-14 px-7">
                  분실물 등록하기
                  <IconArrow width={18} height={18} />
                </LinkButton>
                <Link
                  href="/login"
                  className="inline-flex min-h-14 items-center justify-center rounded-full px-6 text-[17px] font-semibold text-ink hover:bg-ink/5"
                >
                  이미 등록했어요 · 로그인
                </Link>
              </div>
              <ul
                className="rise mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-ink-2"
                style={{ ["--d" as string]: "420ms" }}
              >
                {TRUST.map(({ icon: Icon, label }) => (
                  <li key={label} className="inline-flex items-center gap-1.5">
                    <Icon width={16} height={16} className="text-ink" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            <figure className="mx-auto w-full max-w-md md:max-w-none" aria-label="추천 후보 예시 화면">
              <div className="flex flex-col gap-3">
                <div className="print-in overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-line">
                  <div className="flex">
                    <div className="min-w-0 flex-1 p-5">
                      <span className="num text-xs text-ink-2">RF-7K2D91</span>
                      <p className="mt-4 text-lg font-bold leading-snug">{SAMPLE_RANKS[0].title}</p>
                      <p className="mt-1 text-sm text-ink-2">습득 2일 전 · 서울특별시 · 경찰서 보관</p>
                      <ul className="mt-4 flex flex-wrap gap-1.5">
                        {["종류 일치", "색상 일치", "같은 지역", "설명 유사"].map((r) => (
                          <li key={r} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink">
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="perf w-px self-stretch" aria-hidden="true" />
                    <ScoreStub score={0.92} label="HIGH" />
                  </div>
                </div>
                {SAMPLE_RANKS.slice(1, 3).map((r, i) => (
                  <div
                    key={r.title}
                    className="print-in flex items-center justify-between gap-4 rounded-2xl bg-bg px-5 py-4"
                    style={{ animationDelay: `${(i + 1) * 160}ms`, opacity: 1 - (i + 1) * 0.18 }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold">{r.title}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-2">{r.meta}</p>
                    </div>
                    <span className="num text-2xl font-bold">{r.score}</span>
                  </div>
                ))}
              </div>
              <figcaption className="mt-3 text-center text-xs text-ink-2 md:text-left">
                예시 화면이에요. 실제 후보는 등록한 분실물을 기준으로 달라져요.
              </figcaption>
            </figure>
          </div>
        </div>

        {/* Category marquee */}
        <div className="border-t border-line py-4" aria-label="찾을 수 있는 물건 종류">
          <div className="marquee">
            <ul className="marquee-track">
              {[...CATEGORY_OPTIONS, ...CATEGORY_OPTIONS].map((c, i) => (
                <li
                  key={`${c.code}-${i}`}
                  aria-hidden={i >= CATEGORY_OPTIONS.length ? true : undefined}
                  className="shrink-0 rounded-full bg-surface-2 px-4 py-2 text-sm font-medium text-ink-2"
                >
                  {c.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 2. Steps */}
      <section className="snap-section flex items-center bg-bg">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-[minmax(0,1fr)] gap-10 px-4 py-16 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-16">
          <Reveal>
            <h2 className="text-2xl font-bold sm:text-3xl">직접 뒤지지 않아도 돼요</h2>
            <p className="mt-3 max-w-sm text-ink-2">
              흩어진 습득물 목록을 일일이 검색하는 대신, 등록 한 번으로 비교와 감시를 맡기세요.
            </p>
          </Reveal>
          <ol className="relative flex flex-col gap-8">
            <span className="perf absolute bottom-6 left-6 top-6 w-0.5" aria-hidden="true" />
            <ScrollLine className="absolute bottom-6 left-6 top-6 w-0.5 bg-ink" />
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="relative">
                <Reveal delay={i * 120} className="flex gap-5">
                  <span className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full bg-ink text-bg ring-8 ring-bg">
                    <Icon />
                  </span>
                  <div className="pt-1">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <p className="mt-1.5 text-[15px] text-ink-2">{body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 3. Bento: what you get */}
      <section className="snap-section flex items-center bg-surface">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
          <Reveal>
            <h2 className="text-2xl font-bold sm:text-3xl">등록하면 이런 걸 받아요</h2>
            <p className="mt-3 max-w-md text-ink-2">후보 목록부터 알림까지, 찾는 데 필요한 것만 담았어요.</p>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-6">
            {/* Ranked list */}
            <Reveal className="rounded-3xl bg-bg p-6 md:col-span-4 md:row-span-2 md:p-8">
              <p className="text-lg font-bold">가능성 높은 순서대로 TOP 5</p>
              <p className="mt-1 text-sm text-ink-2">후보마다 점수와 닮은 이유를 함께 보여드려요.</p>
              <ol className="mt-6 flex flex-col gap-4">
                {SAMPLE_RANKS.map((r, i) => (
                  <li key={r.title} className="flex items-center gap-4">
                    <span className="num flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[15px] font-semibold">{r.title}</span>
                        <span className="num text-sm font-bold">
                          <CountUp value={r.score} delay={i * 80} />
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <Meter percent={r.score} delay={i * 80} />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-5 text-xs text-ink-2">예시 데이터예요.</p>
            </Reveal>

            {/* Notification banner */}
            <Reveal delay={80} className="rounded-3xl bg-ink p-6 text-bg md:col-span-2">
              <p className="text-lg font-bold">새 후보가 생기면 바로</p>
              <div className="mt-5 rounded-2xl bg-bg/15 p-4 backdrop-blur">
                <div className="flex items-center gap-2 text-xs opacity-80">
                  <LogoMark size={16} />
                  <span className="font-semibold">ReFind</span>
                  <span className="ml-auto">지금</span>
                </div>
                <p className="mt-2 text-sm font-semibold">새로운 매칭 후보가 등록되었어요</p>
                <p className="mt-0.5 text-xs opacity-80">검정 가죽 카드지갑 · 82점</p>
              </div>
            </Reveal>

            {/* Coverage numbers */}
            <Reveal delay={160} className="rounded-3xl bg-bg p-6 md:col-span-2">
              <p className="text-lg font-bold">전국 어디서든</p>
              <div className="mt-5 flex items-end gap-6">
                <div>
                  <p className="num text-4xl font-bold">
                    <CountUp value={REGION_OPTIONS.length} />
                  </p>
                  <p className="mt-1 text-xs text-ink-2">시·도</p>
                </div>
                <div>
                  <p className="num text-4xl font-bold">
                    <CountUp value={CATEGORY_OPTIONS.length} delay={120} />
                  </p>
                  <p className="mt-1 text-xs text-ink-2">물건 종류</p>
                </div>
              </div>
            </Reveal>

            {/* Photo */}
            <Reveal delay={80} className="rounded-3xl bg-bg p-6 md:col-span-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-ink text-bg">
                <IconImage />
              </span>
              <p className="mt-4 text-lg font-bold">사진이 있으면 더 정확해요</p>
              <p className="mt-1 text-sm text-ink-2">
                설명만으로 비슷한 물건이 많을 때, 사진을 함께 비교해 후보의 순서를 가려내요.
              </p>
            </Reveal>

            {/* Threshold */}
            <Reveal delay={160} className="rounded-3xl bg-bg p-6 md:col-span-3">
              <p className="num text-5xl font-bold">
                <CountUp value={notifyScore} />
                <span className="ml-1 text-xl">점</span>
              </p>
              <p className="mt-3 text-lg font-bold">넘는 후보만 알려드려요</p>
              <p className="mt-1 text-sm text-ink-2">알림이 쏟아지지 않도록, 같은 후보는 한 번만 보내요.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 4. Honesty */}
      <section className="snap-section flex items-center bg-bg">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-[minmax(0,1fr)] gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:gap-16 md:py-20">
          <Reveal>
            <div className="flex items-center gap-2">
              <IconShield />
              <span className="text-sm font-bold">점수를 정직하게 보여드려요</span>
            </div>
            <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
              점수는 확률이 아니라
              <br />
              닮은 정도예요
            </h2>
            <p className="mt-4 text-ink-2">
              여러 기준의 유사도를 합친 값이라 100점이어도 내 물건이라고 확정할 수는 없어요. 후보마다 어떤 점이 닮았는지
              근거를 함께 보여드리니, 보관 기관에 문의하기 전에 직접 비교해보세요.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <p className="text-sm font-bold">이런 기준으로 비교해요</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {FACTORS.map((f) => (
                <li key={f} className="rounded-full bg-surface px-4 py-2 text-sm font-medium">
                  {f}
                </li>
              ))}
            </ul>
            <dl className="mt-8 grid gap-5 text-sm">
              <div>
                <dt className="font-bold">데이터 출처</dt>
                <dd className="mt-1 text-ink-2">경찰청 LOST112 습득물 공공데이터를 기반으로 해요.</dd>
              </div>
              <div>
                <dt className="font-bold">알림 기준</dt>
                <dd className="mt-1 text-ink-2">
                  새 습득물이 <span className="num font-bold text-ink">{notifyScore}점</span> 이상일 때만, 같은 후보는 한
                  번만 알려드려요.
                </dd>
              </div>
            </dl>
          </Reveal>
        </div>
      </section>

      {/* 5. Closing */}
      <section className="snap-section flex items-center bg-ink text-bg">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 text-center sm:px-6">
          <Reveal>
            <h2 className="text-2xl font-bold sm:text-4xl">시간이 지날수록 찾기 어려워져요</h2>
            <p className="mx-auto mt-3 max-w-md text-bg/70">
              기억이 또렷한 지금 바로 등록해두면, 나머지는 ReFind가 지켜볼게요.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/lost/new" className={buttonClass("secondary", "min-h-14 bg-bg px-8 text-ink hover:brightness-100 hover:opacity-90")}>
                분실물 등록하기
                <IconArrow width={18} height={18} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="snap-end mt-auto border-t border-line px-4 py-8 text-center text-xs text-ink-2 sm:px-6">
        ReFind · 경찰청 LOST112 공공데이터 기반 분실물 매칭 서비스
      </footer>
    </div>
  );
}
