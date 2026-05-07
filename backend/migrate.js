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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_detail_images (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      product_id  INT NOT NULL,
      image_url   TEXT NOT NULL,
      sort_order  INT NOT NULL DEFAULT 0,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

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

  console.log('✓ DB 마이그레이션 완료');
}

module.exports = migrate;
