# Build Instructions — CROCINI

## Prerequisites

- Node.js 22+ (Alpine 기반 Docker 이미지 사용)
- npm (Node.js 포함)
- MySQL 8.0+ (로컬 개발 시) 또는 Railway MySQL 인스턴스

## Local Development Build

```bash
# 1. 의존성 설치
cd backend
npm install

# 2. 환경변수 설정
cp .env.example .env
# .env 파일에 DB_HOST, DB_USER, DB_PASSWORD, DB_NAME 등 설정

# 3. 개발 서버 실행 (nodemon 자동 재시작)
npm run dev
```

## Production Build (Docker)

```bash
# 프로젝트 루트에서 실행
docker build -t crocini -f backend/Dockerfile .
docker run -p 8080:8080 --env-file backend/.env crocini
```

### Dockerfile 구조

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN cd backend && npm install --omit=dev
ENV FRONTEND_DIR=/app
EXPOSE 8080
CMD ["node", "backend/server.js"]
```

- `--omit=dev`: 프로덕션에서 jest, nodemon 제외
- `FRONTEND_DIR=/app`: 정적 파일 서빙 루트 (HTML, CSS, JS, images)
- 프론트엔드와 백엔드가 단일 컨테이너에서 서빙됨

## Railway Deployment

Railway는 `backend/Dockerfile`을 자동 감지하여 빌드합니다.

- **빌드 트리거**: main 브랜치 push
- **환경변수**: Railway Variables에서 관리
- **포트**: 8080 (Railway 기본)
- **도메인**: crocini.co.kr / www.crocini.co.kr

## DB Migration

서버 시작 시 `migrate.js`가 자동 실행됩니다:
- 테이블 존재 여부 확인 → 없으면 생성
- 컬럼 존재 여부 확인 → 없으면 ALTER TABLE ADD
- 별도 마이그레이션 명령 불필요

## Build Verification

```bash
# 서버 정상 시작 확인
node backend/server.js
# 출력: "Server running on port 8080"

# Health check
curl http://localhost:8080/products
# 200 OK + JSON 응답 확인
```
