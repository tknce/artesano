# Requirements — CROCINI 구조 개선 + 전체 설계 체계 수립

## Intent Analysis
- **User Request**: 전부 다 하되, 전체 설계 체계 수립 → 구조 개선 → UX → 기능 추가 순서
- **Request Type**: Refactoring + Enhancement (구조 개선 후 점진적 기능 추가)
- **Scope**: 소규모 (1~2일 단위 실행)
- **Urgency**: 코드 구조 개선이 가장 급함
- **Complexity**: Moderate (기존 동작 유지하면서 구조 변경)

## Key Decisions
- 서비스 레이어 리팩토링 순서: **간단한 것부터** (wishlist, content → products → orders)
  - 이유: 간단한 모듈로 패턴을 확립한 뒤, 복잡한 모듈에 동일 패턴 적용
- 테스트: **서비스 레이어 분리하면서 단위 테스트 함께 작성**
  - 이유: 서비스 함수는 req/res 없이 테스트 가능 — 분리 시점이 테스트 도입 최적 타이밍

---

## Phase 1: 구조 개선 (서비스 레이어 도입)

### FR-1: 서비스 레이어 분리
- 모든 라우트의 비즈니스 로직을 `services/` 디렉토리로 분리
- Route는 HTTP 요청/응답만 처리 (5~15줄/핸들러)
- Service는 비즈니스 로직 집중 (DB 호출, 검증, 외부 서비스)

### FR-2: 인증 미들웨어 분리
- server.js의 requireAdmin을 `middleware/auth.middleware.js`로 분리
- requireUser도 각 라우트에서 중복 정의 → 공통 미들웨어로 통합

### FR-3: 단위 테스트 기반 구축
- 테스트 프레임워크 설정 (Jest 또는 Vitest)
- 각 서비스 파일에 대응하는 테스트 파일 작성

---

## Phase 2: UX 개선 (Phase 1 완료 후)
- TBD (User Stories 단계에서 구체화)

## Phase 3: 기능 추가 (Phase 2 완료 후)
- 카카오 간편 로그인
- 주문 상태 알림 (이메일/카카오)
- 기타 TBD

---

## Non-Functional Requirements

### NFR-1: 무중단 리팩토링
- 기존 API 동작 100% 유지 (입출력 변경 없음)
- 리팩토링 전후 동일한 HTTP 응답 보장

### NFR-2: 테스트 커버리지
- 서비스 레이어 함수 최소 80% 커버리지 목표

### NFR-3: 실행 단위
- 각 Unit은 1~2일 내 완료 가능한 크기
- Unit 단위로 독립 배포 가능

---

## Extension Configuration
| Extension | Enabled | Decided At |
|---|---|---|
| Security Baseline | No | Requirements Analysis |
| Property-Based Testing | No | Requirements Analysis |
