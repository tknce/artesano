-- ==============================================
-- custom-orders-schema.sql — 주문제작 테이블 (Python 전용)
--
-- 실행 방법:
--   USE crocini_db;
--   source C:/Users/박규택/Desktop/leather-website/backend/custom-orders-schema.sql
-- ==============================================

USE crocini_db;

CREATE TABLE IF NOT EXISTS custom_orders (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  product_id        INT          DEFAULT NULL,                            -- 선택한 Python 상품 (FK)
  product_code      VARCHAR(50)  DEFAULT NULL,                            -- 상품이 삭제돼도 식별 가능하도록 코드 보존

  leather_color     VARCHAR(100) DEFAULT NULL,                            -- 가죽 컬러
  hardware          VARCHAR(50)  DEFAULT NULL,                            -- 하드웨어 (골드/실버/매트블랙 등)
  lining_color      VARCHAR(100) DEFAULT NULL,                            -- 안감 컬러
  initials          VARCHAR(10)  DEFAULT NULL,                            -- 이니셜 각인 (영문 3자 권장)
  desired_lead_time VARCHAR(100) DEFAULT NULL,                            -- 희망 납기
  budget_range      VARCHAR(50)  DEFAULT NULL,                            -- 예산 범위

  name              VARCHAR(100) NOT NULL,                                -- 이름
  phone             VARCHAR(50)  NOT NULL,                                -- 연락처
  email             VARCHAR(255) DEFAULT NULL,                            -- 이메일
  message           TEXT         DEFAULT NULL,                            -- 추가 요청

  status            ENUM('new','contacted','in_progress','completed','cancelled') DEFAULT 'new',
  created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_custom_orders_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
