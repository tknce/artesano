const pool = require('../db');

async function list(userId) {
  const [rows] = await pool.query(`
    SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price, p.image_url, p.option_desc
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.user_id = ?
    ORDER BY ci.created_at DESC
  `, [userId]);
  return rows;
}

// 요청 수량이 현재 재고를 넘는지 확인 (NULL = 무제한이므로 통과)
async function checkStock(productId, requestedQty) {
  const [rows] = await pool.query('SELECT stock FROM products WHERE id = ?', [productId]);
  if (rows.length === 0) return { error: '상품을 찾을 수 없습니다.', status: 404 };
  const stock = rows[0].stock;
  if (stock === null) return { ok: true };
  if (stock <= 0) return { error: '품절된 상품입니다.', status: 409 };
  if (requestedQty > stock) return { error: `재고가 ${stock}개 남았습니다.`, status: 409 };
  return { ok: true };
}

async function add(userId, productId, quantity = 1) {
  const [existing] = await pool.query('SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, productId]);
  const totalQty = (existing[0]?.quantity || 0) + quantity;
  const check = await checkStock(productId, totalQty);
  if (check.error) return check;
  await pool.query(`
    INSERT INTO cart_items (user_id, product_id, quantity)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
  `, [userId, productId, quantity]);
  return { ok: true };
}

async function updateQuantity(userId, productId, quantity) {
  if (quantity < 1) return remove(userId, productId);
  const check = await checkStock(productId, quantity);
  if (check.error) return check;
  await pool.query('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?', [quantity, userId, productId]);
  return { ok: true };
}

async function remove(userId, productId) {
  await pool.query('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, productId]);
  return { ok: true };
}

async function clear(userId) {
  await pool.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);
  return { ok: true };
}

async function count(userId) {
  const [rows] = await pool.query('SELECT COALESCE(SUM(quantity), 0) AS cnt FROM cart_items WHERE user_id = ?', [userId]);
  return rows[0].cnt;
}

module.exports = { list, add, updateQuantity, remove, clear, count };
