# Integration Test Instructions — CROCINI

## 현재 상태

통합 테스트는 아직 자동화되지 않았습니다. 아래는 수동 통합 테스트 절차입니다.

## Prerequisites

- 로컬 MySQL 인스턴스 또는 Railway 개발 DB
- 서버 실행 중 (`npm run dev`)
- 환경변수 설정 완료 (.env)

## 수동 통합 테스트 체크리스트

### 1. 서버 시작 + DB 마이그레이션

```bash
cd backend && npm run dev
```

- [ ] 서버 정상 시작 (포트 8080)
- [ ] migrate.js 실행 로그 확인 (테이블 생성/업데이트)
- [ ] 세션 테이블 자동 생성 확인

### 2. 인증 플로우

```bash
# 회원가입
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"테스트","email":"test@test.com","password":"test1234","phone":"010-1234-5678"}'

# 로그인 (쿠키 저장)
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234"}' \
  -c cookies.txt

# 세션 확인
curl http://localhost:8080/auth/me -b cookies.txt
```

- [ ] 회원가입 성공 (201)
- [ ] 로그인 성공 + 세션 쿠키 발급
- [ ] /auth/me에서 사용자 정보 반환

### 3. 상품 조회

```bash
curl http://localhost:8080/products
curl http://localhost:8080/products/1
```

- [ ] 상품 목록 JSON 반환
- [ ] 상품 상세 + detail_images 포함

### 4. 위시리스트 (인증 필요)

```bash
curl -X POST http://localhost:8080/wishlist \
  -H "Content-Type: application/json" \
  -d '{"productId":1}' -b cookies.txt

curl http://localhost:8080/wishlist -b cookies.txt
```

- [ ] 찜 추가 성공
- [ ] 찜 목록에 상품 포함

### 5. 주문/결제 (토스페이먼츠 테스트 키 필요)

```bash
curl -X POST http://localhost:8080/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":1,"quantity":1}],"address":"서울시...","phone":"010-1234-5678"}' \
  -b cookies.txt
```

- [ ] 주문 생성 성공 (orderId 반환)
- [ ] 토스페이먼츠 테스트 결제 승인 (별도 프론트엔드 필요)

### 6. 정적 파일 서빙

```bash
curl -I http://localhost:8080/
curl -I http://localhost:8080/shop
curl -I http://localhost:8080/style.css
```

- [ ] HTML 페이지 200 OK
- [ ] Clean URL 동작 (/shop → shop.html)
- [ ] CSS/JS/이미지 정상 서빙

## 향후 자동화 계획

통합 테스트 자동화 시 고려사항:
- supertest 라이브러리로 HTTP 레벨 테스트
- 테스트 전용 DB (별도 스키마 또는 트랜잭션 롤백)
- 토스페이먼츠 mock 서버 또는 테스트 키 사용
