const express = require('express');
const router  = express.Router();
const pool    = require('../db');

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function requireUser(req, res, next) {
  if (req.session?.userId) return next();
  res.status(401).json({ error: '로그인이 필요합니다.' });
}

// GET /api/wishlist — 내 찜 목록 (상품 정보 포함)
router.get('/', requireUser, asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT p.id, p.name, p.category, p.price, p.image_url, p.badge, p.option_desc
    FROM wishlists w
    JOIN products p ON p.id = w.product_id
    WHERE w.user_id = ?
    ORDER BY w.created_at DESC
  `, [req.session.userId]);
  res.json(rows);
}));

// GET /api/wishlist/ids — 찜한 상품 ID 목록
router.get('/ids', requireUser, asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT product_id FROM wishlists WHERE user_id = ?',
    [req.session.userId]
  );
  res.json(rows.map(r => r.product_id));
}));

// POST /api/wishlist/:productId — 추가
router.post('/:productId', requireUser, asyncHandler(async (req, res) => {
  const productId = parseInt(req.params.productId, 10);
  if (isNaN(productId)) return res.status(400).json({ error: '잘못된 상품 ID' });

  const [products] = await pool.query('SELECT id FROM products WHERE id = ?', [productId]);
  if (products.length === 0) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });

  await pool.query(
    'INSERT IGNORE INTO wishlists (user_id, product_id) VALUES (?, ?)',
    [req.session.userId, productId]
  );
  res.json({ ok: true, wishlisted: true });
}));

// DELETE /api/wishlist/:productId — 제거
router.delete('/:productId', requireUser, asyncHandler(async (req, res) => {
  const productId = parseInt(req.params.productId, 10);
  if (isNaN(productId)) return res.status(400).json({ error: '잘못된 상품 ID' });

  await pool.query(
    'DELETE FROM wishlists WHERE user_id = ? AND product_id = ?',
    [req.session.userId, productId]
  );
  res.json({ ok: true, wishlisted: false });
}));

module.exports = router;
