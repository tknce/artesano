// ============================================================
// wishlist.service.js — 위시리스트(찜하기) 비즈니스 로직
//
// 기능:
//   - 내 위시리스트 목록 조회 (상품 정보 포함)
//   - 찜한 상품 ID 목록 조회 (shop 페이지 하트 표시용)
//   - 찜 추가 / 해제
// ============================================================
const pool = require('../db');

async function list(userId) {
  const [rows] = await pool.query(`
    SELECT p.id, p.name, p.category, p.price, p.image_url, p.badge, p.option_desc
    FROM wishlists w JOIN products p ON p.id = w.product_id
    WHERE w.user_id = ? ORDER BY w.created_at DESC
  `, [userId]);
  return rows;
}

async function getIds(userId) {
  const [rows] = await pool.query(
    'SELECT product_id FROM wishlists WHERE user_id = ?', [userId]
  );
  return rows.map(r => r.product_id);
}

async function add(userId, productId) {
  const [products] = await pool.query('SELECT id FROM products WHERE id = ?', [productId]);
  if (products.length === 0) return { error: '상품을 찾을 수 없습니다.', status: 404 };
  await pool.query('INSERT IGNORE INTO wishlists (user_id, product_id) VALUES (?, ?)', [userId, productId]);
  return { ok: true, wishlisted: true };
}

async function remove(userId, productId) {
  await pool.query('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?', [userId, productId]);
  return { ok: true, wishlisted: false };
}

module.exports = { list, getIds, add, remove };
