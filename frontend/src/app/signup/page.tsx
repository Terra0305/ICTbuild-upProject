"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AuthShell } from "@/components/common/AuthShell";
import { Button, Field, Notice, fieldClass } from "@/components/common/ui";
import { ApiError, login, signup } from "@/lib/api";
import { setTokens } from "@/lib/auth";
import { DEV_MOCK_TOKEN, IS_DEV } from "@/lib/devFlags";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signup(email, password, name);
      const tokens = await login(email, password);
      setTokens(tokens.access_token, tokens.refresh_token);
      router.push("/lost");
    } catch (err) {
      if (IS_DEV && !(err instanceof ApiError)) {
        setTokens(DEV_MOCK_TOKEN, DEV_MOCK_TOKEN);
        router.push("/lost");
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        setError("이미 가입된 이메일입니다. 로그인해주세요.");
      } else {
        setError("회원가입에 실패했습니다. 비밀번호는 8자 이상이어야 합니다.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="1분이면 시작할 수 있어요"
      description="가입하면 분실물을 등록하고 추천 후보와 알림을 받아볼 수 있어요."
      footer={
        <>
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-bold text-ink underline underline-offset-4">
            로그인
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="이름" htmlFor="name">
          <input
            id="name"
            required
            autoComplete="name"
            placeholder="홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            className={fieldClass}
          />
        </Field>
        <Field label="이메일" htmlFor="email" hint="알림을 받을 주소예요">
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="비밀번호" htmlFor="password" hint="8자 이상">
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="8자 이상 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClass}
          />
        </Field>
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" disabled={submitting} className="mt-1 min-h-12">
          {submitting ? "가입 중..." : "회원가입"}
        </Button>
      </form>
    </AuthShell>
  );
}
