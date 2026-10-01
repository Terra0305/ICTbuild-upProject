# 배포 안내

ReFind는 AWS 서울 리전(`ap-northeast-2`)에서 동작한다. 데모용 구성이라 비용을 최소로 맞췄고,
서버는 EC2 한 대뿐이다. 이전에 쓰던 Railway(백엔드)와 Vercel(프론트)은 정리 대상이다.

## 서비스 주소

| 용도 | 주소 |
|---|---|
| 웹 (프론트) | https://d29d7xry7tkopu.cloudfront.net |
| API | https://d29d7xry7tkopu.cloudfront.net/api/v1 |
| 헬스체크 | https://d29d7xry7tkopu.cloudfront.net/health |
| 업로드 이미지 | https://d29d7xry7tkopu.cloudfront.net/lost-items/... |

프론트와 API가 같은 주소(같은 출처)라 CORS 설정이 필요 없다.

## 구성

```text
브라우저 ─HTTPS─▶ CloudFront
                   ├─ /lost-items/*  ─▶ S3 (업로드 이미지, 비공개 버킷)
                   └─ 그 외          ─▶ EC2 :80
                                          └─ Docker Compose
                                               proxy (nginx)
                                                 ├─ /api/, /health ─▶ api (FastAPI)
                                                 └─ 그 외           ─▶ web (Next.js)
                                               postgres (같은 EC2 디스크에 저장)
                                               cron: 매일 LOST112 수집
```

- 프론트는 Amplify 대신 같은 EC2에서 돈다. 프론트가 Next.js 16인데 Amplify Hosting의 공식 SSR 지원은
  Next.js 15까지이기 때문이다
  ([AWS 문서](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html), 2026-10-01 확인).
- 프론트 이미지는 API 주소를 상대 경로 `/api/v1`로 빌드한다(`NEXT_PUBLIC_API_BASE_URL`).
- 앱 시크릿(LOST112 키, JWT 키, DB 비밀번호 등)은 AWS Secrets Manager에 있고, 배포할 때 서버가 직접 읽는다.
  GitHub에는 AWS 키나 앱 시크릿을 저장하지 않는다.

## 자동 배포

**GitHub의 `main` 브랜치에 push되면 자동으로 배포된다.** PR을 `main`에 merge해도 똑같다.

- 다음 경로의 파일이 바뀌었을 때만 배포가 돈다.
  - `backend/**`, `frontend/**`, `deploy/**`, `.github/workflows/deploy-backend.yml`
  - 그 밖의 파일(예: `docs/`, `README.md`)만 바뀌면 CI만 돈다.
- PR에서는 CI(테스트)만 돌고 배포하지 않는다. PR 없이 다른 브랜치에 push하면 아무것도 돌지 않는다.
- 진행 상황은 GitHub의 **Actions 탭 → "Deploy app"**에서 본다.

| 단계 | 내용 | 걸리는 시간 |
|---|---|---|
| test | 기존 CI(백엔드 테스트, 프론트 린트·빌드) | 약 40초 |
| build | 백엔드·프론트 이미지를 빌드해 GHCR에 push (태그 = 커밋 SHA) | 약 4분 |
| deploy | GitHub OIDC로 AWS 권한을 받아 EC2에 배포 명령 전송, 컨테이너 교체 후 헬스 확인 | 약 1.5분 |

백엔드만 바꿔도 프론트까지 함께 다시 빌드하고 교체한다.

### 주의할 점

- **배포 중 수십 초 정도 접속이 끊길 수 있다.** 서버가 한 대라 컨테이너를 교체하는 동안 생기는 공백이다.
  **시연 직전에는 `main`에 push하지 않는다.**
- **자동 롤백이 없다.** 배포가 실패하면 Actions에 빨간 X가 뜨고 로그가 남지만 이전 버전으로 자동으로
  돌아가지 않는다. 되돌리려면 문제 커밋을 `git revert`해서 push하거나, Actions에서 이전에 성공한
  "Deploy app" 실행을 다시 실행(Re-run)한다(30일 이내 실행만 가능).
- 배포는 동시에 하나만 실행된다. 배포 중에 push가 여러 번 오면 대기 중이던 배포는 취소되고 가장 최근 커밋만 배포된다.
- 코드 변경 없이 다시 배포하려면 Actions → "Deploy app" → **Run workflow**.

## 데이터

- **DB는 EC2 안의 Postgres 컨테이너다.** 재배포해도 데이터는 유지된다.
- **백업은 없다.** 서버(EC2)를 지우면 사용자 계정, 분실물, 매칭, 알림 데이터가 함께 사라진다.
  습득물 데이터는 LOST112에서 다시 수집할 수 있다.
- 매일 04:00(KST)에 서버가 전날 LOST112 습득물을 수집하고 재매칭한다.

## 로컬 프론트를 운영 API에 붙여 보기

운영 API는 CORS로 `http://localhost:3000`을 허용한다(GitHub Actions 변수 `FRONTEND_URL`로 설정).

```bash
cd frontend
NEXT_PUBLIC_API_BASE_URL=https://d29d7xry7tkopu.cloudfront.net/api/v1 npm run dev
```

운영 DB에 데이터가 생기므로 테스트 계정과 데이터는 쓰고 나서 정리한다.

## 관련 파일

| 파일 | 설명 |
|---|---|
| `.github/workflows/deploy-backend.yml` | 자동 배포 워크플로 ("Deploy app") |
| `deploy/docker-compose.prod.yml` | 운영 서버의 컨테이너 구성 |
| `deploy/nginx.conf` | 경로별 라우팅 (`/api/`·`/health`는 API, 나머지는 프론트) |
| `deploy/deploy.sh` | 서버에서 실행되는 배포 스크립트 |
| `frontend/Dockerfile` | 프론트 운영 이미지 |
| `backend/Dockerfile` | 백엔드 운영 이미지 |

AWS 인프라(CloudFormation 템플릿 등)와 계정 권한은 배포 담당자가 따로 관리한다. 인프라 변경이나
배포 문제는 배포 담당자에게 문의한다.
