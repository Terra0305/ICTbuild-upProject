"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AuthShell } from "@/components/common/AuthShell";
import { Button, Field, Notice, fieldClass } from "@/components/common/ui";
import { ApiError, login } from "@/lib/api";
import { setTokens } from "@/lib/auth";
import { DEV_MOCK_TOKEN, IS_DEV } from "@/lib/devFlags";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const tokens = await login(email, password);
      setTokens(tokens.access_token, tokens.refresh_token);
      router.push("/lost");
    } catch (err) {
      // 로컬 개발 전용: 백엔드에 연결할 수 없으면(네트워크 오류) 목 로그인으로 대체한다.
      if (IS_DEV && !(err instanceof ApiError)) {
        setTokens(DEV_MOCK_TOKEN, DEV_MOCK_TOKEN);
        router.push("/lost");
        return;
      }
      setError("이메일 또는 비밀번호가 올바르지 않습니다. 다시 확인해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="다시 만나서 반가워요"
      description="로그인하면 등록한 분실물과 새 알림을 바로 확인할 수 있어요."
      footer={
        <>
          아직 계정이 없으신가요?{" "}
          <Link href="/signup" className="font-bold text-ink underline underline-offset-4">
            회원가입
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="이메일" htmlFor="email">
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
            className={fieldClass}
          />
        </Field>
        <Field label="비밀번호" htmlFor="password">
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!error}
            className={fieldClass}
          />
        </Field>
        {IS_DEV && (
          <Notice>개발 모드: 백엔드에 연결되지 않으면 입력값과 상관없이 로그인되고, 예시 데이터로 동작해요.</Notice>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" disabled={submitting} className="mt-1 min-h-12">
          {submitting ? "로그인 중..." : "로그인"}
        </Button>
      </form>
    </AuthShell>
  );
}
