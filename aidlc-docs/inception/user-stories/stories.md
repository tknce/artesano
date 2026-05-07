# User Stories — CROCINI

## Epic 1: 코드 구조 개선 (서비스 레이어)

### US-1.1: 서비스 레이어 분리
**As a** 개발자  
**I want to** 모든 라우트의 비즈니스 로직이 services/ 디렉토리에 분리되어 있길  
**So that** 로직 수정 시 HTTP 레이어를 건드리지 않고 안전하게 변경할 수 있다

**Acceptance Criteria:**
- [ ] backend/services/ 디렉토리에 각 도메인별 서비스 파일 존재
- [ ] 라우트 핸들러는 req 파싱 → 서비스 호출 → res 응답만 수행 (5~15줄)
- [ ] 기존 API 입출력 100% 동일 유지

### US-1.2: 인증 미들웨어 통합
**As a** 개발자  
**I want to** requireUser/requireAdmin이 하나의 파일에서 관리되길  
**So that** 인증 로직 변경 시 한 곳만 수정하면 된다

**Acceptance Criteria:**
- [ ] middleware/auth.js에 requireUser, requireAdmin 통합
- [ ] 모든 라우트가 공통 미들웨어 사용

### US-1.3: 단위 테스트 기반
**As a** 개발자  
**I want to** 서비스 함수마다 단위 테스트가 있길  
**So that** 리팩토링 시 회귀 버그를 즉시 발견할 수 있다

**Acceptance Criteria:**
- [ ] 테스트 프레임워크 설정 (Jest)
- [ ] 각 서비스 파일에 대응하는 .test.js 파일
- [ ] npm test로 전체 테스트 실행 가능

---

## Epic 2: 주문 상태 알림

### US-2.1: 주문 상태 변경 시 이메일 알림
**As a** 주문한 고객  
**I want to** 주문 상태가 변경되면 이메일로 알림을 받길  
**So that** 사이트에 접속하지 않아도 배송 진행을 알 수 있다

**Acceptance Criteria:**
- [ ] 관리자가 상태 변경 시 고객 이메일로 자동 발송
- [ ] 상태별 다른 메시지 (준비중/배송중/배송완료)
- [ ] 송장번호 포함 (배송중일 때)

---

## Epic 3: 카카오 간편 로그인

### US-3.1: 카카오 로그인
**As a** 비회원 방문자  
**I want to** 카카오 계정으로 간편하게 로그인  
**So that** 복잡한 회원가입 없이 위시리스트/구매를 이용할 수 있다

**Acceptance Criteria:**
- [ ] 로그인 페이지에 "카카오로 시작하기" 버튼
- [ ] OAuth 인증 후 자동 회원가입/로그인
- [ ] 기존 이메일 회원과 연동 가능

---

## Epic 4: UX 개선

### US-4.1: 모바일 최적화
**As a** 모바일 고객 (중장년 여성)  
**I want to** 큰 버튼, 읽기 쉬운 텍스트, 간단한 네비게이션  
**So that** 스마트폰에서도 편하게 쇼핑할 수 있다

**Acceptance Criteria:**
- [ ] 터치 영역 최소 44px
- [ ] 폰트 크기 최소 16px (본문)
- [ ] 핵심 동선 3탭 이내 도달

### US-4.2: 페이지 로딩 속도 개선
**As a** 방문자  
**I want to** 페이지가 빠르게 로드되길  
**So that** 기다리지 않고 상품을 볼 수 있다

**Acceptance Criteria:**
- [ ] CSS/JS 미니파이
- [ ] 이미지 lazy loading
- [ ] LCP < 2.5초

---

## 우선순위

| 순위 | Epic | 이유 |
|------|------|------|
| 1 | 코드 구조 개선 | 다른 모든 작업의 기반, 가장 급함 |
| 2 | 주문 상태 알림 | 고객 경험 직접 개선, 구조 개선 후 쉽게 구현 |
| 3 | 카카오 로그인 | 중장년 타겟 진입 장벽 낮춤 |
| 4 | UX 개선 | 전체 경험 향상 |
