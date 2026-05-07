# Code Structure — CROCINI

## 디렉토리 구조

```
artesano/
├── backend/
│   ├── server.js              # Express 앱 진입점 (라우팅, 미들웨어, 정적 서빙)
│   ├── db.js                  # MySQL 커넥션 풀 설정
│   ├── migrate.js             # 서버 시작 시 자동 스키마 마이그레이션
│   ├── seed.js                # 초기 데이터 시드
│   ├── schema.sql             # 초기 DB 스키마 + 상품 INSERT
│   ├── package.json           # Backend 의존성
│   ├── Dockerfile             # 배포용 Docker 이미지
│   ├── .env.example           # 환경변수 템플릿
│   ├── routes/
│   │   ├── products.js        # 상품 CRUD + 상세 이미지 관리
│   │   ├── orders.js          # 주문 생성/결제 승인/상태 관리/취소
│   │   ├── auth.js            # 회원 가입/로그인/로그아웃
│   │   ├── user.js            # 마이페이지 (내 문의/주문제작 조회)
│   │   ├── wishlist.js        # 찜 추가/제거/목록
│   │   ├── reviews.js         # 후기 작성/조회/삭제
│   │   ├── purchases.js       # 구매 확인 (관리자 등록 + 자동)
│   │   ├── categories.js      # 카테고리 CRUD
│   │   ├── content.js         # 사이트 콘텐츠 (소재정보 등)
│   │   ├── inquiries.js       # 일반 문의
│   │   └── custom-orders.js   # 주문제작 신청
│   ├── lib/
│   │   ├── cloudinary.js      # Cloudinary 설정 + optimize 헬퍼
│   │   ├── mailer.js          # Nodemailer (문의/주문제작 알림)
│   │   └── backup.js          # DB 백업 → 이메일 발송
│   ├── middleware/
│   │   └── upload.js          # Multer + Cloudinary storage 설정
│   └── uploads/               # (로컬 개발용, 프로덕션은 Cloudinary)
├── partials/
│   ├── nav.html               # 공통 네비게이션
│   └── footer.html            # 공통 푸터
├── index.html                 # 메인 페이지
├── shop.html                  # 상품 목록
├── product.html               # 상품 상세
├── story.html                 # 브랜드 스토리
├── contact.html               # 문의 페이지
├── custom-order.html          # 주문제작 신청
├── checkout.html              # 결제 페이지
├── payment-success.html       # 결제 성공
├── payment-fail.html          # 결제 실패
├── login.html                 # 로그인
├── register.html              # 회원가입
├── mypage.html                # 마이페이지
├── admin.html                 # 관리자 대시보드
├── admin-login.html           # 관리자 로그인
├── 404.html                   # 404 페이지
├── style.css                  # 전체 스타일시트
├── script.js                  # 프론트엔드 공통 JS
├── admin.js                   # 관리자 페이지 JS
├── admin.css                  # 관리자 스타일
├── analytics.js               # 분석 스크립트
├── images/                    # 정적 이미지 (히어로, 카테고리 등)
├── railway.json               # Railway 배포 설정
├── package.json               # 루트 (프론트엔드 start script)
└── .gitignore
```

## 핵심 모듈 역할

| 모듈 | 책임 |
|------|------|
| `server.js` | 앱 초기화, 미들웨어 체인, 라우트 마운트, 클린 URL, SEO sitemap, 에러 핸들링 |
| `migrate.js` | 서버 시작 시 테이블 생성/컬럼 추가 (점진적 마이그레이션) |
| `db.js` | MySQL 커넥션 풀 (10개 연결, utf8mb4, KST timezone) |
| `routes/*` | 도메인별 REST API 핸들러 |
| `lib/cloudinary.js` | Cloudinary SDK 초기화 + URL 최적화 변환 |
| `lib/mailer.js` | Gmail SMTP 알림 (문의/주문제작 접수 시) |
| `lib/backup.js` | mysqldump → 이메일 첨부 발송 (cron 03:00 KST) |

## DB 테이블 관계

```
users ─┬─< wishlists >─── products
       ├─< purchases >─── products
       ├─< reviews >───── products
       ├─< orders >────── products
       ├─< inquiries
       └─< custom_orders ─ products

products ─< product_detail_images
categories (slug = products.category)
site_content (독립)
```

## 인증 구조

- **회원 인증**: bcryptjs 해싱 + express-session (MySQL 저장)
- **관리자 인증**: 환경변수 기반 단일 계정 (`ADMIN_USER` / `ADMIN_PASSWORD`)
- 세션 만료: 8시간, httpOnly + secure + sameSite:strict
