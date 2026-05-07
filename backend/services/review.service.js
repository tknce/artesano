// ============================================================
// review.service.js — 상품 후기(리뷰) 비즈니스 로직
//
// 기능:
//   - 상품별 리뷰 목록 조회 (공개)
//   - 전체 리뷰 목록 (관리자)
//   - 리뷰 작성 (구매 확인 필수, 1인 1리뷰)
//   - 리뷰 삭제 (본인 또는 관리자)
// ============================================================
const pool = require('../db');

async function listByProduct(productId) {
  const [rows] = await pool.query(`
    SELECT r.id, r.rating, r.comment, r.created_at, r.user_id, u.name AS user_name
    FROM reviews r JOIN users u ON u.id = r.user_id
    WHERE r.product_id = ? ORDER BY r.created_at DESC
  `, [productId]);
  return rows;
}

async function listAll() {
  const [rows] = await pool.query(`
    SELECT r.id, r.rating, r.comment, r.created_at,
           u.name AS user_name, u.email AS user_email,
           p.id AS product_id, p.name AS product_name
    FROM reviews r JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id
    ORDER BY r.created_at DESC
  `);
  return rows;
}

async function create(userId, productId, rating, comment) {
  if (!rating || rating < 1 || rating > 5) return { error: '별점은 1~5 사이여야 합니다.', status: 400 };
  const [products] = await pool.query('SELECT id FROM products WHERE id = ?', [productId]);
  if (products.length === 0) return { error: '상품을 찾을 수 없습니다.', status: 404 };
  const [purch] = await pool.query('SELECT id FROM purchases WHERE user_id = ? AND product_id = ?', [userId, productId]);
  if (purch.length === 0) return { error: '구매 후 후기를 작성하실 수 있습니다.', status: 403 };

  try {
    await pool.query('INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
      [productId, userId, rating, (comment || '').trim() || null]);
    return { ok: true, status: 201 };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return { error: '이미 후기를 작성하셨습니다.', status: 409 };
    throw err;
  }
}

async function remove(id, userId, isAdmin) {
  if (isAdmin) {
    await pool.query('DELETE FROM reviews WHERE id = ?', [id]);
    return { ok: true };
  }
  const [result] = await pool.query('DELETE FROM reviews WHERE id = ? AND user_id = ?', [id, userId]);
  if (result.affectedRows === 0) return { error: '삭제 권한이 없습니다.', status: 403 };
  return { ok: true };
}

module.exports = { listByProduct, listAll, create, remove };
