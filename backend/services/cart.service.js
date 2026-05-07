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

async function add(userId, productId, quantity = 1) {
  await pool.query(`
    INSERT INTO cart_items (user_id, product_id, quantity)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
  `, [userId, productId, quantity]);
  return { ok: true };
}

async function updateQuantity(userId, productId, quantity) {
  if (quantity < 1) return remove(userId, productId);
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
