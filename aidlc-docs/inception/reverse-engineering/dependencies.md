# Dependencies — CROCINI

## Production Dependencies

| Package | Version | 용도 | 라이선스 |
|---------|---------|------|----------|
| express | ^4.19.2 | Web framework | MIT |
| mysql2 | ^3.9.7 | MySQL 드라이버 (Promise pool) | MIT |
| express-session | ^1.19.0 | 세션 관리 | MIT |
| express-mysql-session | ^3.0.3 | MySQL 세션 저장소 | MIT |
| bcryptjs | ^3.0.3 | 비밀번호 해싱 | MIT |
| helmet | ^8.1.0 | 보안 헤더 (CSP, HSTS 등) | MIT |
| express-rate-limit | ^8.4.1 | API rate limiting | MIT |
| cors | ^2.8.5 | CORS 정책 관리 | MIT |
| multer | ^2.1.1 | multipart/form-data 파일 업로드 | MIT |
| multer-storage-cloudinary | ^4.0.0 | Cloudinary 직접 업로드 스토리지 | MIT |
| cloudinary | ^1.41.3 | 이미지 CDN/관리 SDK | MIT |
| nodemailer | ^8.0.7 | SMTP 이메일 발송 | MIT |
| node-cron | ^3.0.3 | 스케줄 작업 (DB 백업) | ISC |
| dotenv | ^16.4.5 | 환경변수 로딩 | BSD-2 |

## Dev Dependencies

| Package | Version | 용도 |
|---------|---------|------|
| jest | ^29.7.0 | 테스트 프레임워크 |
| nodemon | ^3.1.3 | 개발 시 자동 재시작 |

## External Services (API Dependencies)

| Service | 용도 | 연결 방식 |
|---------|------|-----------|
| MySQL (Railway) | 메인 데이터베이스 | TCP (mysql2 pool) |
| Cloudinary | 이미지 업로드/CDN | REST API (SDK) |
| 토스페이먼츠 | 결제 승인/취소 | REST API (fetch) |
| Gmail SMTP | 이메일 알림/백업 | SMTP (nodemailer) |
| 카카오 OAuth | 간편 로그인 | REST API (fetch) |
| 다음 우편번호 | 주소 검색 | Client-side iframe |

## Dependency Graph (레이어별)

```
┌─────────────────────────────────────────────────────┐
│  Routes Layer                                       │
│  express, multer, express-rate-limit                │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  Services Layer                                     │
│  bcryptjs (auth), nodemailer (inquiry, order)       │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  Lib / Infrastructure Layer                         │
│  mysql2, cloudinary, node-cron, dotenv              │
└─────────────────────────────────────────────────────┘
```

## Security-Relevant Dependencies

| Package | 보안 역할 |
|---------|-----------|
| helmet | CSP, X-Frame-Options, HSTS 등 보안 헤더 |
| bcryptjs | 비밀번호 단방향 해싱 (salt rounds: 10) |
| express-rate-limit | 로그인 브루트포스 방지 (15분/100회) |
| express-session | httpOnly, secure, sameSite:strict 쿠키 |
| cors | 허용 도메인 화이트리스트 |

## Known Constraints

- `multer-storage-cloudinary` ^4.0.0은 multer ^2.x 필요
- `express-mysql-session`은 mysql2 pool 직접 전달 필요 (createPool 옵션)
- `cloudinary` ^1.x는 legacy SDK — ^2.x 마이그레이션 가능하나 breaking changes 있음
- Node.js 22 Alpine 기반 Docker 이미지 사용 (Railway)
