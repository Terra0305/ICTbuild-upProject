# ReFind

공공 유실물 데이터를 활용한 AI 분실물 매칭·알림 웹 서비스.

전체 기능 명세는 [REFIND_DEVELOPMENT_SPEC.md](./REFIND_DEVELOPMENT_SPEC.md)를 참고한다. 현재는 인증·분실물
등록·LOST112 습득물 수집·텍스트 기반 매칭을 로컬에서 개발할 수 있다.

## 구조

```text
backend/    FastAPI + SQLAlchemy + Alembic
frontend/   Next.js + TypeScript + Tailwind CSS
docker-compose.yml   로컬 PostgreSQL
```

## 사전 준비

- Python 3.11+
- Node.js 20+
- Docker (PostgreSQL 실행용)

## 실행 방법

### 1. PostgreSQL 실행

```bash
docker compose up -d postgres
```

### 2. 백엔드

```bash
cd backend
cp .env.example .env   # 값 채워넣기
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[ai,dev]"
alembic upgrade head    # 마이그레이션이 추가된 이후부터 사용
uvicorn app.main:app --reload
```

`GET http://localhost:8000/health` 로 기동 여부를 확인한다.

### 3. 프론트엔드

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

`http://localhost:3000` 에서 확인한다.

## 테스트 · 린트

```bash
cd backend && pytest && ruff check .
cd frontend && npm run lint && npm run build
```

GitHub Actions(`.github/workflows/ci.yml`)가 push/PR마다 동일한 검사를 수행한다.

## 환경변수

`backend/.env.example`, `frontend/.env.local.example` 참고. API Key와 비밀번호 등 민감한 값은
프론트엔드 환경변수에 넣지 않는다(명세서 13절).

## LOST112 실제 습득물 수집

`backend/.env`에 발급받은 키와 Endpoint를 넣는다. 키는 절대로 프론트엔드 환경변수나 Git에 넣지 않는다.

```env
LOST112_SERVICE_KEY=발급받은_일반_인증키
LOST112_BASE_URL=https://apis.data.go.kr/1320000/LosfundInfoInqireService
FAISS_INDEX_DIR=./data/faiss
```

분실물을 등록하면 해당 분실일 기준으로 `-2일 ~ +30일`만 백그라운드에서 조회한다. 분실일이 오늘보다
180일 이전이면 공공데이터 조회는 건너뛴다. 매일 최근 데이터만 갱신하려면 아래 명령을 스케줄러(Cron,
GitHub Actions, Railway Cron 등)에서 하루 한 번 실행한다.

```bash
cd backend
source .venv/bin/activate
python -m scripts.sync_lost112_recent --days 1
```

초기 데이터 적재가 필요하다면 먼저 범위를 작게 확인한 뒤 최대 30일까지만 실행한다.

```bash
python -m scripts.sync_lost112_recent --days 7
```
