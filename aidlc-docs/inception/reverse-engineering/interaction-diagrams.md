# Interaction Diagrams — CROCINI

## 1. 상품 구매 (결제) 플로우

```
Browser          Routes/orders     order.service     토스페이먼츠API    DB         Mailer
  │                   │                │                  │            │            │
  │─POST /orders─────>│                │                  │            │            │
  │                   │─createOrder()─>│                  │            │            │
  │                   │                │─INSERT orders────────────────>│            │
  │                   │                │<─orderId─────────────────────│            │
  │                   │<─{orderId}─────│                  │            │            │
  │<─orderId──────────│                │                  │            │            │
  │                   │                │                  │            │            │
  │─POST /orders/confirm──────────────>│                  │            │            │
  │                   │                │─POST /confirm────>│            │            │
  │                   │                │<─{paymentKey}─────│            │            │
  │                   │                │─UPDATE orders (paid)─────────>│            │
  │                   │                │─sendOrderEmail()──────────────────────────>│
  │                   │<─{success}─────│                  │            │            │
  │<─redirect success─│                │                  │            │            │
```

## 2. 회원가입 + 로그인 플로우

```
Browser          Routes/auth       auth.service       DB
  │                   │                │              │
  │─POST /register───>│                │              │
  │                   │─register()────>│              │
  │                   │                │─bcrypt.hash()│
  │                   │                │─INSERT users─>│
  │                   │<─{userId}──────│              │
  │<─{success}────────│                │              │
  │                   │                │              │
  │─POST /login──────>│                │              │
  │                   │─login()───────>│              │
  │                   │                │─SELECT user──>│
  │                   │                │─bcrypt.compare()
  │                   │<─{user}────────│              │
  │                   │─req.session.user = user       │
  │<─{success}────────│                │              │
```

## 3. 상품 관리 (관리자) 플로우

```
Browser          Routes/products   product.service    Cloudinary     DB
  │                   │                │                │            │
  │─POST /products───>│                │                │            │
  │  (multipart)      │─create()──────>│                │            │
  │                   │                │─upload image───>│            │
  │                   │                │<─{url, id}──────│            │
  │                   │                │─INSERT product──────────────>│
  │                   │                │─INSERT detail_images────────>│
  │                   │<─{product}─────│                │            │
  │<─{success}────────│                │                │            │
  │                   │                │                │            │
  │─DELETE /products/:id──────────────>│                │            │
  │                   │                │─SELECT images──────────────>│
  │                   │                │─destroy(publicId)>│          │
  │                   │                │─DELETE product─────────────>│
  │                   │<─{success}─────│                │            │
  │<─{success}────────│                │                │            │
```

## 4. 위시리스트 플로우

```
Browser          Routes/wishlist   wishlist.service   DB
  │                   │                │              │
  │─POST /wishlist───>│                │              │
  │  {productId}      │─add()─────────>│              │
  │                   │                │─INSERT───────>│
  │                   │<─{success}─────│              │
  │<─{success}────────│                │              │
  │                   │                │              │
  │─GET /wishlist────>│                │              │
  │                   │─list()────────>│              │
  │                   │                │─SELECT JOIN──>│
  │                   │<─[items]───────│              │
  │<─[items]──────────│                │              │
```

## 5. 문의 접수 플로우

```
Browser          Routes/inquiries  inquiry.service    DB         Mailer
  │                   │                │              │            │
  │─POST /inquiries──>│                │              │            │
  │  {name,email,msg} │─create()──────>│              │            │
  │                   │                │─INSERT───────>│            │
  │                   │                │─sendEmail()──────────────>│
  │                   │                │              │            │─>관리자 이메일
  │                   │<─{success}─────│              │            │
  │<─{success}────────│                │              │            │
```

## 6. 주문 상태 변경 + 알림 플로우

```
Admin Browser    Routes/orders     order.service      DB         Mailer
  │                   │                │              │            │
  │─PUT /orders/:id──>│                │              │            │
  │  {status,tracking}│─updateStatus()>│              │            │
  │                   │                │─UPDATE order──>│            │
  │                   │                │─SELECT user email>│        │
  │                   │                │─sendStatusEmail()────────>│
  │                   │                │              │            │─>고객 이메일
  │                   │<─{success}─────│              │            │
  │<─{success}────────│                │              │            │
```

## 7. 후기 작성 플로우

```
Browser          Routes/reviews    review.service     DB
  │                   │                │              │
  │─POST /reviews────>│                │              │
  │  {productId,      │─create()──────>│              │
  │   rating,comment} │                │─SELECT purchase>│ (구매 확인)
  │                   │                │─SELECT existing>│ (중복 확인)
  │                   │                │─INSERT review──>│
  │                   │<─{review}──────│              │
  │<─{success}────────│                │              │
```

## 8. 카카오 로그인 플로우

```
Browser          Routes/auth       auth.service       카카오 OAuth    DB
  │                   │                │                  │            │
  │─GET /auth/kakao──>│                │                  │            │
  │<─redirect kakao───│                │                  │            │
  │─(사용자 동의)─────────────────────────────────────────>│            │
  │<─callback + code──│                │                  │            │
  │─GET /auth/kakao/callback──────────>│                  │            │
  │                   │                │─POST /token──────>│            │
  │                   │                │<─{access_token}───│            │
  │                   │                │─GET /user/me─────>│            │
  │                   │                │<─{kakao_id,email}─│            │
  │                   │                │─findOrCreate()────────────────>│
  │                   │<─{user}────────│                  │            │
  │                   │─req.session.user = user           │            │
  │<─redirect /───────│                │                  │            │
```
