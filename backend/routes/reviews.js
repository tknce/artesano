const express = require('express');
const router  = express.Router();
const pool    = require('../db');

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function requireUser(req, res, next) {
  if (req.session?.userId || req.session?.isAdmin) return next();
  res.status(401).json({ error: '로그인이 필요합니다.' });
}

// GET /reviews?productId=X
router.get('/', asyncHandler(async (req, res) => {
  const productId = parseInt(req.query.productId, 10);
  if (isNaN(productId)) return res.status(400).json({ error: '잘못된 상품 ID' });

  const [rows] = await pool.query(`
    SELECT r.id, r.rating, r.comment, r.created_at, r.user_id,
           u.name AS user_name
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    WHERE r.product_id = ?
    ORDER BY r.created_at DESC
  `, [productId]);
  res.json(rows);
}));

// POST /reviews
router.post('/', requireUser, asyncHandler(async (req, res) => {
  const { productId, rating, comment } = req.body || {};
  const pid = parseInt(productId, 10);
  const rat = parseInt(rating, 10);

  if (isNaN(pid)) return res.status(400).json({ error: '상품 ID가 필요합니다.' });
  if (!rat || rat < 1 || rat > 5) return res.status(400).json({ error: '별점은 1~5 사이여야 합니다.' });

  const [products] = await pool.query('SELECT id FROM products WHERE id = ?', [pid]);
  if (products.length === 0) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });

  const [purch] = await pool.query(
    'SELECT id FROM purchases WHERE user_id = ? AND product_id = ?',
    [req.session.userId, pid]
  );
  if (purch.length === 0) {
    return res.status(403).json({ error: '구매 후 후기를 작성하실 수 있습니다.' });
  }

  try {
    await pool.query(
      'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
      [pid, req.session.userId, rat, (comment || '').trim() || null]
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: '이미 후기를 작성하셨습니다.' });
    }
    throw err;
  }

  res.status(201).json({ ok: true });
}));

// DELETE /reviews/:id
router.delete('/:id', requireUser, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID' });

  if (req.session?.isAdmin) {
    await pool.query('DELETE FROM reviews WHERE id = ?', [id]);
  } else {
    const [result] = await pool.query(
      'DELETE FROM reviews WHERE id = ? AND user_id = ?',
      [id, req.session.userId]
    );
    if (result.affectedRows === 0) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }
  }

  res.json({ ok: true });
}));

module.exports = router;
