# API Documentation — CROCINI

## 인증 방식

- **회원**: Session 기반 (`req.session.userId`)
- **관리자**: Session 기반 (`req.session.isAdmin`)
- Rate Limiting: 로그인 15분/10회, 회원가입 1시간/10회

---

## Auth (`/api/auth`)

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| POST | /register | - | 회원가입 |
| POST | /login | - | 로그인 |
| POST | /logout | - | 로그아웃 |
| GET | /me | 회원 | 현재 로그인 정보 |

## Admin Auth

| Method | Path | 설명 |
|--------|------|------|
| POST | /api/admin/login | 관리자 로그인 |
| POST | /api/admin/logout | 관리자 로그아웃 |
| GET | /api/admin/check | 관리자 세션 확인 |

---

## Products (`/products`)

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| GET | / | - | 상품 목록 (`?category=` 필터) |
| GET | /:id | - | 상품 상세 |
| POST | / | 관리자 | 상품 등록 (multipart) |
| PUT | /:id | 관리자 | 상품 수정 |
| DELETE | /:id | 관리자 | 상품 삭제 |
| GET | /:id/detail-images | - | 상세 이미지 목록 (`?type=gallery\|detail`) |
| POST | /:id/detail-images | 관리자 | 상세 이미지 업로드 |
| DELETE | /:id/detail-images/:imgId | 관리자 | 상세 이미지 삭제 |
| PUT | /:id/detail-images/reorder | 관리자 | 이미지 순서 변경 |

---

## Orders (`/api/orders`)

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| POST | / | 회원 | 주문 생성 (pending) |
| POST | /confirm | 회원 | 토스 결제 승인 |
| GET | /mine | 회원 | 내 주문 목록 |
| GET | / | 관리자 | 전체 주문 목록 |
| PUT | /:id/status | 관리자 | 상태/송장 변경 |
| POST | /:id/cancel | 관리자 | 결제 취소 (환불) |
| DELETE | /:id | 관리자 | 주문 삭제 |

### 주문 상태 흐름

```
pending → paid → preparing → shipping → delivered
                                      → cancelled
       → failed
```

---

## Wishlist (`/api/wishlist`)

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| GET | / | 회원 | 찜 목록 (상품 정보 포함) |
| GET | /ids | 회원 | 찜한 상품 ID 배열 |
| POST | /:productId | 회원 | 찜 추가 |
| DELETE | /:productId | 회원 | 찜 제거 |

---

## Reviews (`/reviews`)

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| GET | / | - | 상품별 후기 (`?productId=`) / 관리자: 전체 |
| POST | / | 회원 | 후기 작성 (구매 확인 필수, 상품당 1회) |
| DELETE | /:id | 회원/관리자 | 후기 삭제 |

---

## Purchases (`/purchases`)

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| GET | /check | 회원 | 구매 여부 확인 (`?productId=`) |
| GET | / | 관리자 | 전체 구매 목록 |
| POST | / | 관리자 | 구매 수동 등록 (이메일 기반) |
| DELETE | /:id | 관리자 | 구매 삭제 |

---

## Categories (`/categories`)

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| GET | / | - | 카테고리 목록 |
| POST | / | 관리자 | 카테고리 등록 |
| PUT | /:id | 관리자 | 카테고리 수정 (slug 불변) |
| DELETE | /:id | 관리자 | 카테고리 삭제 (사용 중이면 거부) |

---

## Content (`/api/content`)

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| GET | / | - | 사이트 콘텐츠 전체 조회 |
| PUT | /:key | 관리자 | 콘텐츠 수정 (material_info, care_guide, refund_policy) |

---

## Inquiries (`/inquiries`)

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| POST | / | - | 문의 등록 → 이메일 알림 |
| GET | / | 관리자 | 문의 목록 |
| DELETE | /:id | 관리자 | 문의 삭제 |

---

## Custom Orders (`/custom-orders`)

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| POST | / | - | 주문제작 신청 → 이메일 알림 |
| GET | / | 관리자 | 주문제작 목록 |
| DELETE | /:id | 관리자 | 주문제작 삭제 |

---

## User (`/api/user`)

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| GET | /inquiries | 회원 | 내 문의 내역 |
| GET | /custom-orders | 회원 | 내 주문제작 내역 |
