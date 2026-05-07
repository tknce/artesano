// ============================================================
// purchase.service.js — 구매 확인 비즈니스 로직
//
// 기능:
//   - 구매 여부 확인 (리뷰 작성 권한 체크용)
//   - 전체 구매 목록 (관리자)
//   - 구매 등록 (관리자 수동 / 결제 완료 시 자동)
//   - 구매 삭제 (관리자)
// ============================================================
const pool = require('../db');

async function checkPurchased(userId, productId) {
  const [rows] = await pool.query('SELECT id FROM purchases WHERE user_id = ? AND product_id = ?', [userId, productId]);
  return rows.length > 0;
}

async function listAll() {
  const [rows] = await pool.query(`
    SELECT pu.id, pu.note, pu.created_at,
           u.email AS user_email, u.name AS user_name,
           p.id AS product_id, p.name AS product_name
    FROM purchases pu JOIN users u ON u.id = pu.user_id JOIN products p ON p.id = pu.product_id
    ORDER BY pu.created_at DESC
  `);
  return rows;
}

async function create(email, productId, note) {
  if (!email?.trim()) return { error: '이메일을 입력해주세요.', status: 400 };
  const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  if (users.length === 0) return { error: '해당 이메일의 회원이 없습니다.', status: 404 };
  const [products] = await pool.query('SELECT id FROM products WHERE id = ?', [productId]);
  if (products.length === 0) return { error: '상품을 찾을 수 없습니다.', status: 404 };

  try {
    await pool.query('INSERT INTO purchases (user_id, product_id, note) VALUES (?, ?, ?)',
      [users[0].id, productId, (note || '').trim() || null]);
    return { ok: true, status: 201 };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return { error: '이미 구매 확인된 내역입니다.', status: 409 };
    throw err;
  }
}

async function remove(id) {
  await pool.query('DELETE FROM purchases WHERE id = ?', [id]);
  return { ok: true };
}

module.exports = { checkPurchased, listAll, create, remove };
