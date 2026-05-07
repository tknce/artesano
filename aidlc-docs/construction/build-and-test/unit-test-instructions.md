# Unit Test Instructions — CROCINI

## Test Framework

- **Framework**: Jest ^29.7.0
- **Environment**: Node.js
- **DB Mocking**: `tests/setup.js`에서 `db.query` 자동 mock

## Running Tests

```bash
cd backend

# 전체 테스트 실행
npm test

# 특정 서비스 테스트만 실행
npx jest tests/services/wishlist.service.test.js

# 커버리지 리포트
npx jest --coverage

# Watch 모드 (개발 중)
npx jest --watch
```

## Test Structure

```
backend/tests/
├── setup.js                          # Jest 글로벌 설정 (DB mock)
└── services/
    ├── wishlist.service.test.js       # 위시리스트 CRUD
    ├── content.service.test.js        # 사이트 콘텐츠 조회/수정
    ├── category.service.test.js       # 카테고리 CRUD + 보호 로직
    ├── review.service.test.js         # 후기 작성/조회 + 구매 확인
    ├── purchase.service.test.js       # 구매 확인 등록/조회
    ├── inquiry.service.test.js        # 문의 접수 + 이메일 알림
    ├── custom-order.service.test.js   # 주문제작 신청 + 이메일
    ├── product.service.test.js        # 상품 CRUD + 이미지 관리
    ├── auth.service.test.js           # 회원가입/로그인/카카오
    └── order.service.test.js          # 주문/결제/상태변경/알림
```

## Test Configuration (package.json)

```json
{
  "scripts": {
    "test": "jest --forceExit --detectOpenHandles"
  },
  "jest": {
    "testEnvironment": "node",
    "setupFiles": ["./tests/setup.js"]
  }
}
```

## Mocking Strategy

- **DB**: `jest.mock('../db')` — 모든 `pool.query()` 호출을 mock
- **External Services**: 각 테스트에서 필요 시 개별 mock
  - Cloudinary: `jest.mock('../lib/cloudinary')`
  - Mailer: `jest.mock('../lib/mailer')`
  - bcryptjs: `jest.mock('bcryptjs')`

## Expected Results

- 전체 테스트: 10개 파일, ~42개 테스트 케이스
- 실행 시간: < 5초 (DB mock으로 네트워크 호출 없음)
- 커버리지 목표: 서비스 레이어 80%+

## Troubleshooting

| 문제 | 해결 |
|------|------|
| "Cannot find module '../db'" | `cd backend`에서 실행 확인 |
| Open handles warning | `--forceExit --detectOpenHandles` 플래그 사용 |
| Mock 초기화 안됨 | `beforeEach(() => jest.clearAllMocks())` 추가 |
