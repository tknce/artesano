-- ==============================================
-- schema.sql — DB 테이블 생성 + 상품 데이터 INSERT
--
-- 실행 방법 (MySQL Command Line에서):
--   1) MySQL 에 접속: mysql -u root -p
--   2) 이 파일 실행: source C:/Users/박규택/Desktop/leather-website/backend/schema.sql
--   또는 MySQL Workbench에서 파일 열고 전체 실행
-- ==============================================


-- 1) 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS crocini_db
  CHARACTER SET utf8mb4       -- 한글, 이모지 모두 지원
  COLLATE utf8mb4_unicode_ci;

USE crocini_db;


-- 2) 상품 테이블 생성
CREATE TABLE IF NOT EXISTS products (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,              -- 상품명 (예: M905 — Black)
  category       ENUM('crocodile','ostrich','python') NOT NULL, -- 가죽 종류
  option_desc    VARCHAR(255),                        -- 옵션 설명 (예: 1마리/스트랩겸용)
  price          INT,                                 -- 판매가 (NULL = 주문제작 문의)
  original_price INT DEFAULT NULL,                   -- 정가 (NULL = 할인 없음)
  image_url      TEXT,                               -- 상품 이미지 URL
  is_custom_order TINYINT(1) DEFAULT 0,              -- 주문제작 여부 (0=일반, 1=주문제작)
  badge          VARCHAR(100) DEFAULT NULL,           -- 뱃지 텍스트 (NULL=없음)
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 등록 시각
);


-- 3) 상품 데이터 INSERT
--    기존 shop.html 에 있는 16개 상품과 동일한 데이터

INSERT INTO products
  (name, category, option_desc, price, original_price, image_url, is_custom_order, badge)
VALUES

-- ── CROCODILE (악어가죽) 10개 ─────────────────────────────────

('M905 — Black',
 'crocodile', '1마리 / 스트랩겸용',
 513000, 855000,
 'https://artesano.co.kr/web/product/medium/20191220/efb92fa1d8d73b6310b7f87ba35ffc5c.jpg',
 0, NULL),

('M905 — Pink',
 'crocodile', '1마리 / 스트랩겸용',
 513000, 855000,
 'https://artesano.co.kr/web/product/medium/20191220/cfa3b31138a23e2c509da2c29188c91d.jpg',
 0, NULL),

('M907 — Black',
 'crocodile', '1마리 / 주문제작',
 750000, 1250000,
 'https://artesano.co.kr/web/product/medium/20191220/d23558304b8bf6b67f2b4d467c7959d2.jpg',
 1, '주문제작'),

('M907 — Red',
 'crocodile', '1마리 / 주문제작',
 750000, 1250000,
 'https://artesano.co.kr/web/product/medium/20191220/f8ce64913435fecbfd6e5473138b0e69.jpg',
 1, '주문제작'),

('M157 — Black',
 'crocodile', '악어 + 소가죽',
 174000, 500000,
 'https://artesano.co.kr/web/product/medium/20191220/447df906538dfc0813e5208c097809d1.jpg',
 0, NULL),

('M157 — Beige',
 'crocodile', '악어 + 소가죽',
 174000, 500000,
 'https://artesano.co.kr/web/product/medium/20191220/088638905d5bd5812f0838a457f8a4d7.jpg',
 0, NULL),

('M127 — 2마리 / 34cm',
 'crocodile', '주문제작',
 1440000, 2900000,
 'https://artesano.co.kr/web/product/medium/20191220/39dcbad3690d42e9933134a6f616fea9.jpg',
 1, '주문제작'),

('M126 — 2마리 / 31cm',
 'crocodile', '스트랩겸용 / 주문제작',
 1440000, 2700000,
 'https://artesano.co.kr/web/product/medium/202406/b1d6e5bc7e9b9c901bcd3d37a14341ea.jpg',
 1, '주문제작'),

('M128 — 3마리반 / 40cm',
 'crocodile', '주문제작',
 2280000, 4300000,
 'https://artesano.co.kr/web/product/medium/20191216/72b2a55fd3456f1616c9046c643b7514.jpg',
 1, '주문제작'),

('CR127 — Black',
 'crocodile', '35cm / 시그니처',
 4500000, NULL,
 'https://artesano.co.kr/web/product/medium/20191216/1333b307a304a130ead1e22af13425b9.jpg',
 0, 'SIGNATURE'),


-- ── OSTRICH (타조가죽) 3개 ────────────────────────────────────

('OR127 — Red',
 'ostrich', '타조가죽',
 1740000, NULL,
 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80',
 0, NULL),

('OR127 — Blue',
 'ostrich', '타조가죽',
 1740000, NULL,
 'https://images.unsplash.com/photo-1591348122449-02525d70379b?auto=format&fit=crop&w=900&q=80',
 0, NULL),

('OR128 — Green',
 'ostrich', '타조가죽 / 주문제작',
 2400000, NULL,
 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=80',
 1, '주문제작'),


-- ── PYTHON (파이톤) 3개 — 주문제작 placeholder ──────────────────

('PT001 — 파이톤 클러치',
 'python', '파이톤 / 주문제작',
 NULL, NULL,
 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=80',
 1, 'MADE TO ORDER'),

('PT002 — 파이톤 미디엄 백',
 'python', '파이톤 / 주문제작',
 NULL, NULL,
 'https://images.unsplash.com/photo-1473221326025-9183b464bb7e?auto=format&fit=crop&w=900&q=80',
 1, 'MADE TO ORDER'),

('PT003 — 파이톤 미니 백',
 'python', '파이톤 / 주문제작',
 NULL, NULL,
 'https://images.unsplash.com/photo-1591348122449-02525d70379b?auto=format&fit=crop&w=900&q=80',
 1, 'MADE TO ORDER');
