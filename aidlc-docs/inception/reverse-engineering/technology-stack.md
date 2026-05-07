# Technology Stack — CROCINI

## Backend

| 기술 | 버전 | 용도 |
|------|------|------|
| Node.js | 22 (Alpine) | Runtime |
| Express.js | ^4.19.2 | Web Framework |
| mysql2 | ^3.9.7 | MySQL 드라이버 (Promise 기반) |
| express-session | ^1.19.0 | 세션 관리 |
| express-mysql-session | ^3.0.3 | MySQL 세션 저장소 |
| bcryptjs | ^3.0.3 | 비밀번호 해싱 |
| helmet | ^8.1.0 | 보안 헤더 (CSP 포함) |
| express-rate-limit | ^8.4.1 | 브루트포스 방지 |
| cors | ^2.8.5 | CORS 정책 |
| multer | ^2.1.1 | 파일 업로드 처리 |
| multer-storage-cloudinary | ^4.0.0 | Cloudinary 직접 업로드 |
| cloudinary | ^1.41.3 | 이미지 CDN/관리 |
| nodemailer | ^8.0.7 | 이메일 발송 (Gmail SMTP) |
| node-cron | ^3.0.3 | 스케줄링 (DB 백업) |
| dotenv | ^16.4.5 | 환경변수 관리 |

## Frontend

| 기술 | 용도 |
|------|------|
| Vanilla HTML5 | 페이지 구조 |
| Vanilla CSS3 | 스타일링 (단일 style.css, 71KB) |
| Vanilla JavaScript | 클라이언트 로직 (script.js + admin.js) |
| Server-side Partial Injection | nav/footer 공통 컴포넌트 |

## Database

| 기술 | 용도 |
|------|------|
| MySQL | 메인 데이터베이스 (Railway 호스팅) |
| utf8mb4 | 문자셋 (한글/이모지 지원) |

## 외부 서비스

| 서비스 | 용도 |
|--------|------|
| Railway | PaaS 배포 (Docker) |
| Cloudinary | 이미지 업로드/CDN/최적화 |
| 토스페이먼츠 | 결제 승인/취소 API |
| Gmail SMTP | 문의 알림, 백업 발송 |
| 다음 우편번호 | 배송지 주소 검색 (iframe) |

## 개발 도구

| 도구 | 용도 |
|------|------|
| nodemon | ^3.1.3 | 개발 시 자동 재시작 |
| Docker | 배포 컨테이너화 |
