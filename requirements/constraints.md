# CROCINI 구현 제약사항

## 현재 기술 스택 (변경 불가)

### 1. 인프라
- **호스팅**: Railway (PaaS)
- **도메인**: https://www.crocini.co.kr
- **DB**: MySQL (Railway 내장)
- **이미지 저장소**: Cloudinary

### 2. 백엔드
- Node.js + Express.js
- express-session + MySQL session store
- Helmet (보안 헤더)
- express-rate-limit (브루트포스 방지)
- node-cron (DB 백업 스케줄링)
- nodemailer (이메일 알림)

### 3. 프론트엔드
- Vanilla HTML/CSS/JS (프레임워크 없음)
- Server-side partial injection (nav, footer)
- Google Fonts (Cormorant Garamond, Inter, Bebas Neue)

## 제외 기능 (구현하지 않음)

### 1. 결제 관련
- 실제 결제 처리 (카드, 현금, 디지털 지갑)
- PG사 연동
- 영수증 발행
- 환불 처리
- 포인트/쿠폰 시스템

### 2. 복잡한 인증
- OAuth / SNS 로그인
- 2FA / OTP

### 3. 고급 기능
- 실시간 채팅
- 푸시 알림
- 다국어 지원
- 데이터 분석 대시보드
- 재고 관리 시스템
- 배달/물류 연동

## 운영 제약

- 관리자 1인 운영 (사장님 직접 관리)
- 이메일 알림은 Gmail SMTP (앱 비밀번호)
- 이미지 업로드 10MB 제한
- 세션 만료: 8시간
- DB 백업: 매일 새벽 3시 KST 자동 발송
