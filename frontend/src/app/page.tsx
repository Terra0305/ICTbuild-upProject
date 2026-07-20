import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-32 text-center dark:bg-black">
      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">ReFind</p>
      <h1 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        공공 유실물 데이터로 분실물을 찾아드립니다
      </h1>
      <p className="mt-4 max-w-md text-base text-zinc-600 dark:text-zinc-400">
        물품 정보를 등록하면 경찰청 습득물 데이터와 자동으로 비교하여
        가능성이 높은 후보를 알려드립니다.
      </p>
      <Link
        href="/lost/new"
        className="mt-8 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        분실물 등록 시작하기
      </Link>
    </div>
  );
}
