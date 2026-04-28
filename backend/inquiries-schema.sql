-- ==============================================
-- inquiries-schema.sql — 문의 테이블 생성
--
-- 실행 방법 (MySQL Command Line 또는 Workbench에서):
--   USE crocini_db;
--   source C:/Users/박규택/Desktop/leather-website/backend/inquiries-schema.sql
-- ==============================================

USE crocini_db;

CREATE TABLE IF NOT EXISTS inquiries (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,                          -- 문의자 이름
  phone       VARCHAR(50)  NOT NULL,                          -- 연락처
  email       VARCHAR(255) DEFAULT NULL,                      -- 이메일 (선택)
  message     TEXT         NOT NULL,                          -- 문의 내용
  status      ENUM('new','contacted','closed') DEFAULT 'new', -- 처리 상태
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
