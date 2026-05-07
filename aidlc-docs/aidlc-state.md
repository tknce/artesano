# AI-DLC State Tracking

## Project Information
- **Project Name**: CROCINI (아르테사노)
- **Project Type**: Brownfield
- **Start Date**: 2026-05-06T18:19:00+09:00
- **Restart Date**: 2026-05-07T22:59:00+09:00
- **Current Stage**: CONSTRUCTION COMPLETE — Operations 대기

## Workspace State
- **Existing Code**: Yes (Express.js + Vanilla HTML/CSS/JS + 토스페이먼츠 결제)
- **Reverse Engineering Needed**: Yes (완료)
- **Workspace Root**: /Users/psystar99/work_PSY/ggue/artesano

## Tech Stack (Current)
- **Frontend**: Vanilla HTML/CSS/JS, server-side partial injection
- **Backend**: Node.js + Express.js
- **Database**: MySQL (Railway hosted)
- **Payment**: 토스페이먼츠 (TossPayments)
- **Image Storage**: Cloudinary
- **Auth**: Session-based (express-session + MySQL store)
- **Deployment**: Railway PaaS
- **Domain**: https://www.crocini.co.kr

## Code Location Rules
- **Application Code**: Workspace root (NEVER in aidlc-docs/)
- **Documentation**: aidlc-docs/ only

## Extension Configuration
- **Security Baseline**: Disabled
- **Property-Based Testing**: Disabled

## Stage Progress
- [x] INCEPTION - Workspace Detection (Brownfield, 코드 대폭 변경 확인)
- [x] INCEPTION - Reverse Engineering (2026-05-07 재실행 완료)
- [x] INCEPTION - Requirements Analysis (구조 개선 우선, 간단한 것부터, 테스트 함께)
- [x] INCEPTION - User Stories (4 Epics, 7 Stories, 4 Personas)
- [x] INCEPTION - Workflow Planning (COMPLETED)
- [x] INCEPTION - Application Design (3계층 서비스 레이어, 11개 모듈)
- [x] INCEPTION - Units Generation (10 Units, 3 Phases, ~11.5일)
- [x] CONSTRUCTION - Unit 0~6: 서비스 레이어 전체 리팩토링 완료 (42 tests)
- [x] CONSTRUCTION - Unit 7: 주문 상태 알림 (이메일)
- [x] CONSTRUCTION - Unit 8: 카카오 간편 로그인
- [x] CONSTRUCTION - Unit 9: Vite 빌드 도구 + CSS/JS 미니파이 + 이미지 lazy loading
- [x] CONSTRUCTION - Build and Test (지침서 생성 완료: build, unit-test, integration-test, summary)

## Post-Construction 추가 기능 (2026-05-08)
- [x] 장바구니 (cart_items, /api/cart, cart.html, nav 뱃지)
- [x] 사진 리뷰 (review_images, multer 업로드, 최대 3장)
- [x] 이미지 줌/스와이프 (라이트박스, 터치 스와이프, 키보드)
- [x] 쿠폰 시스템 (coupons 테이블, validate/apply, checkout 적용)
- [x] 다중 필터 (가격대 체크박스, 복수 선택 OR 조건)

## Key Decisions (이전 세션에서 결정됨)
- 전체 서비스 레이어 도입 (Routes → Services → Lib 3계층)
- 기존 코드 포함 리팩토링 (서비스 시작 전이므로 가능)
- 고객 경험 우선, 중장년 여성 타겟
- 소규모 시작 + 확장성 있는 구조
