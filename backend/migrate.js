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

  console.log('✓ DB 마이그레이션 완료');
}

module.exports = migrate;
