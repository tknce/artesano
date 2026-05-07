# Architecture — CROCINI

## 아키텍처 유형

모놀리식 서버 사이드 렌더링 + REST API 혼합 구조

## 시스템 구성도

```
┌─────────────────────────────────────────────────┐
│  Client (Browser)                               │
│  Vanilla HTML/CSS/JS                            │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────┐
│  Railway PaaS (Docker Container)                │
│  ┌────────────────────────────────────────────┐ │
│  │  Express.js Server (server.js)             │ │
│  │  ├─ Static File Serving (Frontend)         │ │
│  │  ├─ Server-side Partial Injection          │ │
│  │  │   (nav.html, footer.html → <!--#NAV#-->)│ │
│  │  ├─ REST API Routes (/products, /api/*)    │ │
│  │  └─ Admin Auth (Session-based)             │ │
│  └────────────────────────────────────────────┘ │
└───────┬──────────────┬──────────────────────────┘
        │              │
        ▼              ▼
┌──────────────┐  ┌──────────────┐
│  MySQL       │  │  Cloudinary  │
│  (Railway)   │  │  (이미지CDN) │
└──────────────┘  └──────────────┘
        │
        ▼
┌──────────────┐  ┌──────────────────┐
│  Gmail SMTP  │  │  토스페이먼츠 API │
│  (알림/백업) │  │  (결제 승인/취소) │
└──────────────┘  └──────────────────┘
```

## 주요 설계 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 렌더링 | Server-side partial injection | SPA 프레임워크 없이 SEO 확보 |
| 세션 저장소 | MySQL (express-mysql-session) | 별도 Redis 불필요, 인프라 단순화 |
| 이미지 | Cloudinary | Railway 디스크 비영속, CDN 자동 최적화 |
| 배포 | Docker on Railway | 단일 서비스로 프론트+백엔드 통합 배포 |
| DB 마이그레이션 | 서버 시작 시 자동 실행 (migrate.js) | 별도 마이그레이션 도구 없이 점진적 스키마 변경 |
| 보안 | Helmet CSP + Rate Limiting + CORS whitelist | 최소 보안 기준 충족 |

## 배포 환경

- **플랫폼**: Railway PaaS
- **컨테이너**: Node 22 Alpine
- **포트**: 8080 (Railway 기본)
- **도메인**: crocini.co.kr / www.crocini.co.kr
- **자동 백업**: node-cron으로 매일 03:00 KST DB 백업 이메일 발송
