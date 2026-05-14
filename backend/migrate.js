const pool = require('./db');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      email         VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name          VARCHAR(100) NOT NULL,
      phone         VARCHAR(50)  NULL,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [iCols] = await pool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inquiries' AND COLUMN_NAME = 'user_id'
  `);
  if (iCols.length === 0) {
    await pool.query('ALTER TABLE inquiries ADD COLUMN user_id INT NULL');
    await pool.query('ALTER TABLE inquiries ADD CONSTRAINT fk_inquiries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL');
  }

  const [oCols] = await pool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'custom_orders' AND COLUMN_NAME = 'user_id'
  `);
  if (oCols.length === 0) {
    await pool.query('ALTER TABLE custom_orders ADD COLUMN user_id INT NULL');
    await pool.query('ALTER TABLE custom_orders ADD CONSTRAINT fk_custom_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL');
  }

  const [dCols] = await pool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'description'
  `);
  if (dCols.length === 0) {
    await pool.query('ALTER TABLE products ADD COLUMN description TEXT NULL');
  }

  const [mCols] = await pool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'material_info'
  `);
  if (mCols.length === 0) {
    await pool.query('ALTER TABLE products ADD COLUMN material_info TEXT NULL');
  }

  // stock: NULL = 무제한 (주문제작 등), 정수 = 남은 수량
  const [stockCols] = await pool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'stock'
  `);
  if (stockCols.length === 0) {
    await pool.query('ALTER TABLE products ADD COLUMN stock INT NULL DEFAULT NULL');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_detail_images (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      product_id  INT NOT NULL,
      image_url   TEXT NOT NULL,
      sort_order  INT NOT NULL DEFAULT 0,
      image_type  ENUM('gallery','detail') NOT NULL DEFAULT 'detail',
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 기존 product_detail_images에 image_type 컬럼 추가
  const [itCols] = await pool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_detail_images' AND COLUMN_NAME = 'image_type'
  `);
  if (itCols.length === 0) {
    await pool.query(`ALTER TABLE product_detail_images ADD COLUMN image_type ENUM('gallery','detail') NOT NULL DEFAULT 'detail'`);
  }

  // categories 테이블
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      slug       VARCHAR(50)  NOT NULL UNIQUE,
      name       VARCHAR(100) NOT NULL,
      sort_order INT          NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 기존 데이터 시드 (한 번만 — 비어있을 때)
  const [catCount] = await pool.query('SELECT COUNT(*) AS c FROM categories');
  if (catCount[0].c === 0) {
    await pool.query(
      'INSERT INTO categories (slug, name, sort_order) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)',
      ['crocodile', 'CROCODILE', 1, 'ostrich', 'OSTRICH', 2, 'python', 'PYTHON', 3]
    );
  }

  // products.category: ENUM → VARCHAR(50) (제약 풀기)
  const [colInfo] = await pool.query(`
    SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'category'
  `);
  if (colInfo.length > 0 && colInfo[0].DATA_TYPE.toLowerCase() === 'enum') {
    await pool.query('ALTER TABLE products MODIFY COLUMN category VARCHAR(50) NOT NULL');
  }

  // 주문 테이블
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      order_id          VARCHAR(64)  NOT NULL UNIQUE,
      user_id           INT          NULL,
      product_id        INT          NULL,
      product_name      VARCHAR(255) NOT NULL,
      product_image_url TEXT         NULL,
      amount            INT          NOT NULL,
      status            ENUM('pending','paid','preparing','shipping','delivered','failed','cancelled') NOT NULL DEFAULT 'pending',
      tracking_number   VARCHAR(100) NULL,
      shipping_carrier  VARCHAR(20)  NULL,
      payment_key       VARCHAR(255) NULL,
      customer_name     VARCHAR(100) NOT NULL,
      customer_phone    VARCHAR(50)  NOT NULL,
      customer_email    VARCHAR(255) NULL,
      shipping_postal   VARCHAR(20)  NULL,
      shipping_address1 VARCHAR(255) NULL,
      shipping_address2 VARCHAR(255) NULL,
      shipping_request  VARCHAR(500) NULL,
      created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      paid_at           TIMESTAMP    NULL,
      FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE SET NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 기존 orders 테이블에 새 status / tracking_number 컬럼 추가
  const [oStatusInfo] = await pool.query(`
    SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'status'
  `);
  if (oStatusInfo.length > 0 && !oStatusInfo[0].COLUMN_TYPE.includes('preparing')) {
    await pool.query(`
      ALTER TABLE orders MODIFY COLUMN status
      ENUM('pending','paid','preparing','shipping','delivered','failed','cancelled')
      NOT NULL DEFAULT 'pending'
    `);
  }
  const [tCols] = await pool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'tracking_number'
  `);
  if (tCols.length === 0) {
    await pool.query('ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(100) NULL');
  }
  const [scCols] = await pool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'shipping_carrier'
  `);
  if (scCols.length === 0) {
    await pool.query('ALTER TABLE orders ADD COLUMN shipping_carrier VARCHAR(20) NULL');
  }

  // 주문 항목 테이블 (카트 결제 시 한 주문에 여러 상품)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      order_id          VARCHAR(64) NOT NULL,
      product_id        INT NULL,
      product_name      VARCHAR(255) NOT NULL,
      product_image_url TEXT NULL,
      unit_price        INT NOT NULL,
      quantity          INT NOT NULL,
      subtotal          INT NOT NULL,
      created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_order_id (order_id),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // orders에 쿠폰/할인 컬럼 추가
  const [couponCols] = await pool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'coupon_code'
  `);
  if (couponCols.length === 0) {
    await pool.query('ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(50) NULL');
    await pool.query('ALTER TABLE orders ADD COLUMN discount_amount INT NOT NULL DEFAULT 0');
  }

  // 구매 확인 테이블 (관리자가 수동 등록 + 결제 완료 시 자동 등록)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS purchases (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      user_id    INT NOT NULL,
      product_id INT NOT NULL,
      note       VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_purchase (user_id, product_id),
      FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 후기 테이블
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      user_id    INT NOT NULL,
      rating     TINYINT NOT NULL,
      comment    TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_review (product_id, user_id),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 위시리스트 테이블
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wishlists (
      user_id    INT NOT NULL,
      product_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, product_id),
      FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 사이트 공통 콘텐츠 (소재정보 / 케어가이드 / 교환환불)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_content (
      content_key VARCHAR(50) NOT NULL PRIMARY KEY,
      content     TEXT,
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 초기 시드 (이미 있으면 건드리지 않음)
  const SEEDS = {
    material_info: '소재\n자연스러운 결을 가진 레더\n\n구조\n안정적인 형태를 위한 구조 설계\n\n마감\n절제된 하드웨어와 정제된 엣지',
    care_guide:    '· 직사광선 및 고온 다습한 환경을 피해 보관하세요.\n· 사용 후 부드러운 천으로 표면을 가볍게 닦아주세요.\n· 가죽 전용 크림으로 주기적으로 유분을 보충해주세요.\n· 비나 물에 젖었을 경우 직사광선을 피해 자연 건조하세요.\n· 장기 보관 시 전용 보관 백에 넣어 통풍이 잘 되는 곳에 보관하세요.',
    refund_policy: '· 상품 수령 후 7일 이내 교환 및 환불이 가능합니다.\n· 단순 변심에 의한 교환·환불은 왕복 배송비를 고객님께서 부담하셔야 합니다.\n· 사용 흔적이 있거나 훼손된 경우 교환·환불이 불가합니다.\n· 주문제작 상품은 환불이 불가합니다.\n· 자세한 문의는 아래 연락처로 부탁드립니다.',
  };
  for (const [key, content] of Object.entries(SEEDS)) {
    await pool.query(
      'INSERT IGNORE INTO site_content (content_key, content) VALUES (?, ?)',
      [key, content]
    );
  }

  // 카카오 로그인 지원 컬럼
  const [kakaoCol] = await pool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'kakao_id'
  `);
  if (kakaoCol.length === 0) {
    await pool.query('ALTER TABLE users ADD COLUMN kakao_id VARCHAR(100) NULL UNIQUE');
    await pool.query(`ALTER TABLE users ADD COLUMN login_type ENUM('email','kakao','naver') NOT NULL DEFAULT 'email'`);
  }

  // naver_id 컬럼 추가
  const [naverCol] = await pool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'naver_id'
  `);
  if (naverCol.length === 0) {
    await pool.query('ALTER TABLE users ADD COLUMN naver_id VARCHAR(100) NULL UNIQUE');
    await pool.query(`ALTER TABLE users MODIFY COLUMN login_type ENUM('email','kakao','naver') NOT NULL DEFAULT 'email'`);
  }

  // 회원 차단 플래그 (관리자가 차단한 회원은 로그인 거부)
  const [blockedCol] = await pool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_blocked'
  `);
  if (blockedCol.length === 0) {
    await pool.query('ALTER TABLE users ADD COLUMN is_blocked TINYINT(1) NOT NULL DEFAULT 0');
  }

  // naver access/refresh token (unlink용)
  const [naverTokenCol] = await pool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'naver_access_token'
  `);
  if (naverTokenCol.length === 0) {
    await pool.query('ALTER TABLE users ADD COLUMN naver_access_token VARCHAR(500) NULL');
    await pool.query('ALTER TABLE users ADD COLUMN naver_refresh_token VARCHAR(500) NULL');
  }

  // cart_items 테이블
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_cart_item (user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  // review_images 테이블
  await pool.query(`
    CREATE TABLE IF NOT EXISTS review_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      review_id INT NOT NULL,
      image_url VARCHAR(500) NOT NULL,
      cloudinary_id VARCHAR(255),
      sort_order INT DEFAULT 0,
      FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
    )
  `);

  // coupons 테이블
  await pool.query(`
    CREATE TABLE IF NOT EXISTS coupons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      discount_type ENUM('percent','fixed') NOT NULL,
      discount_value INT NOT NULL,
      min_order_amount INT DEFAULT 0,
      max_discount INT DEFAULT NULL,
      expires_at DATETIME DEFAULT NULL,
      max_uses INT DEFAULT NULL,
      used_count INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // payment_logs — 결제 시도/성공/실패/웹훅 감사 로그
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_logs (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      order_id    VARCHAR(64)  NOT NULL,
      event_type  VARCHAR(40)  NOT NULL,
      payment_key VARCHAR(255) NULL,
      amount      INT          NULL,
      http_status INT          NULL,
      message     TEXT         NULL,
      raw         JSON         NULL,
      created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_payment_logs_order (order_id),
      INDEX idx_payment_logs_event (event_type, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log('✓ DB 마이그레이션 완료');
}

module.exports = migrate;
