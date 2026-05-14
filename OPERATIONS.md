# CROCINI 운영 매뉴얼

> 사장님(또는 관리자)이 사이트를 직접 운영할 때 참고하는 가이드입니다.
> 개발자 호출 없이 일상 업무는 이 문서만으로 처리할 수 있도록 정리했습니다.

---

## 1. 관리자 로그인

- 주소: `https://www.crocini.co.kr/admin-login`
- 아이디·비밀번호는 Railway 환경변수 `ADMIN_USER` / `ADMIN_PASSWORD`에 저장돼 있음
- 로그인 후 `/admin` 페이지에서 모든 관리 작업 수행

> 비밀번호 변경: Railway 대시보드 → `Variables` 탭에서 `ADMIN_PASSWORD` 값 수정 → 자동 재배포됨

---

## 2. 상품 관리

### 2-1. 새 상품 등록

1. `/admin` 접속
2. **「상품 등록」** 폼 작성
   - 상품명 (예: `M905 — Black`)
   - 카테고리 (crocodile / ostrich / python 중 택1)
   - 옵션 설명 (예: `1마리 / 스트랩겸용`)
   - 가격 (정수, 원 단위. 주문제작 전용은 비워둠)
   - 정가 (할인 표시용. 없으면 비워둠)
   - 뱃지 (예: `SIGNATURE`, `MADE TO ORDER`. 없으면 비워둠)
   - 이미지 파일 업로드 (필수)
3. **등록** 버튼

### 2-2. 상품 수정

1. 상품 목록에서 해당 상품 행 클릭
2. 폼이 채워지면 수정 후 **수정** 버튼
3. 이미지 교체하려면 새 파일 선택 (기존 이미지는 자동 삭제)

### 2-3. 상품 삭제

- 상품 목록에서 휴지통 아이콘 클릭 → 확인
- ⚠️ 삭제 시 Cloudinary의 이미지도 같이 지워짐

### 2-4. 상세 이미지 (상품 페이지 하단 갤러리)

1. 상품 행 클릭 → 상세 편집 모드
2. **「상세 이미지」** 섹션에서 파일 업로드 (여러 장 가능)
3. 드래그로 순서 변경 가능
4. 휴지통 아이콘으로 개별 삭제

---

## 3. 문의 / 주문제작 신청 확인

### 자동 알림 (이메일)
- 사이트에서 문의·주문제작이 들어오면 **즉시 `crocini88@gmail.com` 으로 자동 발송**
- 메일 제목: `[CROCINI] 새 문의 — {이름}` 또는 `[CROCINI] 새 주문제작 — {이름}`

### 관리자 페이지에서 확인
- `/admin` 페이지 하단의 **「문의 내역」**, **「주문제작 신청」** 섹션
- 최신순 정렬, 클릭하면 상세 메시지·옵션 확인
- 처리 완료된 항목은 휴지통 아이콘으로 삭제

---

## 4. DB 백업 (매일 자동)

### 자동 백업
- **매일 새벽 3시 (KST)** 에 DB 전체가 SQL 파일로 압축돼 메일로 발송됨
- 받는 메일: `crocini88@gmail.com`
- 메일 제목: `[CROCINI] DB 백업 — YYYY-MM-DD`
- 첨부 파일: `crocini-YYYY-MM-DD.sql.gz`

### 백업 파일 보관
- **메일을 별도 폴더(예: `CROCINI 백업`)로 자동 분류**해두면 관리 편함
- 한 달에 한 번 정도 다운받아 외장하드/클라우드에 추가 보관 권장

### 복구 (필요 시 개발자 호출)
- 백업 파일은 압축된 SQL — 복구는 다음 명령으로 가능 (개발자가 처리):
  ```
  gunzip crocini-YYYY-MM-DD.sql.gz
  mysql -u root -p crocini_db < crocini-YYYY-MM-DD.sql
  ```

---

## 5. 외부 서비스 측정 ID·키 변경

Railway 대시보드 → 프로젝트 → `Variables` 탭에서 변경:

| 환경변수 | 용도 |
|---|---|
| `GMAIL_USER` | 이메일 발송 계정 (현재 crocini88@gmail.com) |
| `GMAIL_APP_PASSWORD` | Gmail 앱 비밀번호 (16자리) |
| `NOTIFY_TO` | 알림 받을 메일 (생략 시 GMAIL_USER로 발송) |
| `ADMIN_USER` / `ADMIN_PASSWORD` | 관리자 로그인 계정 |
| `SESSION_SECRET` | 세션 암호화 키 (변경 시 모든 사용자 로그아웃됨) |
| `CLOUDINARY_*` | 이미지 저장소 (변경 시 기존 이미지 사라짐 — 주의) |
| `DB_*` | MySQL 접속 정보 |
| `SITE_URL` | 사이트 절대 URL (sitemap 등에 사용) |

> 환경변수 변경 시 Railway가 자동 재배포함 (1~2분 소요).

### GA4 측정 ID 변경
- 파일: `analytics.js` (루트 디렉토리)
- 3번째 줄 `const GA4_ID = 'G-LBB6YHX2K3';` 를 새 ID로 교체 후 배포
- 현재 ID: `G-LBB6YHX2K3` (Google Analytics 콘솔에서 확인)

### 카카오 URL 변경
- 사장님이 카카오 채널 URL을 알려주면 다음 위치 모두 교체:
  - `index.html`, `contact.html`, `custom-order.html` 의 `https://pf.kakao.com/_artesano`
  - 모든 페이지 푸터의 `KakaoTalk @artesano` 링크 (현재 `href="#"`)

---

## 6. 사이트 무엇이 자동으로 처리되는가

- **이미지 최적화**: 업로드한 모든 이미지는 자동으로 WebP/AVIF로 변환되어 빠르게 로딩됨
- **검색엔진 노출**: `https://www.crocini.co.kr/sitemap.xml` 이 자동 생성되어 구글에 사이트 구조 안내
- **SEO**: 상품 페이지마다 구조화 데이터(JSON-LD)가 자동 삽입되어 구글 검색 결과에 가격·이미지가 함께 노출 가능
- **모바일 대응**: 모든 페이지가 모바일에서 자동 최적화
- **404 페이지**: 잘못된 주소 접속 시 브랜드 톤의 안내 페이지 자동 표시

---

## 7. 자주 발생하는 상황

### Q. 사이트가 안 열려요
1. Railway 대시보드 접속 → 프로젝트 상태 확인
2. **Deployments** 탭에서 최근 배포 실패 여부 확인
3. **Logs** 탭에서 에러 메시지 확인 (개발자에게 전달)

### Q. 이미지가 안 보여요
- Cloudinary 콘솔(https://cloudinary.com) 접속해서 이미지 존재 확인
- `crocini` 폴더 안에 파일이 있어야 정상

### Q. 이메일 알림이 안 와요
- Gmail 스팸함 확인
- Railway 환경변수 `GMAIL_APP_PASSWORD` 가 만료됐을 수 있음 → Google 계정에서 새 앱 비밀번호 발급 후 갱신
- Logs에서 `[mailer] 발송 실패` 메시지 확인

### Q. 새 글자가 깨져 나와요
- 한글이 `???` 로 보이면 charset 문제 — 개발자 호출
- 보통은 DB charset(`utf8mb4`)로 자동 처리됨

---

## 8. Google Search Console 등록 (1회만)

검색 노출을 시작하려면 한 번 등록:

1. https://search.google.com/search-console 접속
2. **속성 추가** → URL 접두어 → `https://www.crocini.co.kr` 입력
3. 소유권 확인 (HTML 태그 방식 권장)
4. **사이트맵** 메뉴 → `sitemap.xml` 입력 → 제출
5. 며칠 내 색인 시작
