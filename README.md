# ReFind

공공 유실물 데이터를 활용한 AI 분실물 매칭·알림 웹 서비스.

전체 기능 명세는 [REFIND_DEVELOPMENT_SPEC.md](./REFIND_DEVELOPMENT_SPEC.md)를 참고한다. 현재 저장소는
**Sprint 0 (프로젝트 기반 구축)** 단계로, `backend`/`frontend` 기본 골격과 로컬 실행 환경만 갖춘 상태다.

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
python3.11 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
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

## 다음 단계 (Sprint 1)

사용자 인증, 분실물 CRUD API/화면, 경찰청 습득물 Provider·Upsert, 카테고리·색상·지역 정규화.
`REFIND_DEVELOPMENT_SPEC.md` 18절 개발 순서를 따른다.
