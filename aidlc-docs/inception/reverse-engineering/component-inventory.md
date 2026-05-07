# Component Inventory — CROCINI

## Backend Components

| Component | Path | Type | 책임 |
|-----------|------|------|------|
| Server | `backend/server.js` | Entry Point | Express 앱 초기화, 미들웨어, 라우트 마운트, 정적 파일 서빙 |
| DB Pool | `backend/db.js` | Infrastructure | MySQL 커넥션 풀 (10 connections, utf8mb4) |
| Migrator | `backend/migrate.js` | Infrastructure | 서버 시작 시 점진적 스키마 마이그레이션 |
| Seeder | `backend/seed.js` | Utility | 초기 데이터 시드 |

## Routes (API Layer)

| Component | Path | Endpoints | 인증 |
|-----------|------|-----------|------|
| Products | `backend/routes/products.js` | GET/POST/PUT/DELETE /products | Admin (CUD) |
| Orders | `backend/routes/orders.js` | POST/GET/PUT /orders | User + Admin |
| Auth | `backend/routes/auth.js` | POST /register, /login, /logout | Public |
| User | `backend/routes/user.js` | GET /user/* | User |
| Wishlist | `backend/routes/wishlist.js` | GET/POST/DELETE /wishlist | User |
| Reviews | `backend/routes/reviews.js` | GET/POST/DELETE /reviews | User (CUD) |
| Purchases | `backend/routes/purchases.js` | GET/POST /purchases | Admin + Auto |
| Categories | `backend/routes/categories.js` | GET/POST/PUT/DELETE /categories | Admin (CUD) |
| Content | `backend/routes/content.js` | GET/PUT /content | Admin (U) |
| Inquiries | `backend/routes/inquiries.js` | POST /inquiries | Public |
| Custom Orders | `backend/routes/custom-orders.js` | POST /custom-orders | Public |

## Services (Business Logic Layer)

| Component | Path | 의존성 |
|-----------|------|--------|
| product.service | `backend/services/product.service.js` | db, cloudinary |
| order.service | `backend/services/order.service.js` | db, mailer |
| auth.service | `backend/services/auth.service.js` | db, bcryptjs |
| wishlist.service | `backend/services/wishlist.service.js` | db |
| review.service | `backend/services/review.service.js` | db |
| purchase.service | `backend/services/purchase.service.js` | db |
| category.service | `backend/services/category.service.js` | db |
| content.service | `backend/services/content.service.js` | db |
| inquiry.service | `backend/services/inquiry.service.js` | db, mailer |
| custom-order.service | `backend/services/custom-order.service.js` | db, mailer |

## Middleware

| Component | Path | 책임 |
|-----------|------|------|
| Auth | `backend/middleware/auth.js` | requireUser, requireAdmin 인증 검증 |
| Upload | `backend/middleware/upload.js` | Multer + Cloudinary storage 설정 |

## Lib (Infrastructure Layer)

| Component | Path | 책임 |
|-----------|------|------|
| Cloudinary | `backend/lib/cloudinary.js` | SDK 초기화, URL 최적화 변환 |
| Mailer | `backend/lib/mailer.js` | Gmail SMTP 이메일 발송 (문의/주문 알림) |
| Backup | `backend/lib/backup.js` | mysqldump → 이메일 첨부 (cron 03:00 KST) |

## Frontend Components

| Component | Path | 책임 |
|-----------|------|------|
| Main Page | `index.html` | 히어로, 카테고리, 추천 상품 |
| Shop | `shop.html` | 상품 목록 (카테고리 필터) |
| Product Detail | `product.html` | 상품 상세, 갤러리, 후기 |
| Checkout | `checkout.html` | 주문서 작성, 토스페이먼츠 결제 |
| Payment Success | `payment-success.html` | 결제 완료 확인 |
| Payment Fail | `payment-fail.html` | 결제 실패 안내 |
| Login/Register | `login.html`, `register.html` | 회원 인증 |
| My Page | `mypage.html` | 주문내역, 찜, 문의 |
| Admin | `admin.html` | 관리자 대시보드 |
| Custom Order | `custom-order.html` | 주문제작 신청 폼 |
| Contact | `contact.html` | 일반 문의 |
| Shared Partials | `partials/nav.html`, `partials/footer.html` | 공통 헤더/푸터 |
| Global Style | `style.css` | 전체 스타일 |
| Global Script | `script.js` | 프론트엔드 공통 로직 |
| Admin Script | `admin.js` | 관리자 페이지 로직 |

## Test Components

| Component | Path | 대상 |
|-----------|------|------|
| Test Setup | `backend/tests/setup.js` | Jest 환경 설정 |
| Service Tests | `backend/tests/services/*.test.js` | 각 서비스 단위 테스트 (10개) |
