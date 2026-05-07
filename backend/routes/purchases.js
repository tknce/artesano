const express = require('express');
const router  = express.Router();
const pool    = require('../db');

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.status(401).json({ error: '관리자 권한이 필요합니다.' });
}

function requireUser(req, res, next) {
  if (req.session?.userId) return next();
  res.status(401).json({ error: '로그인이 필요합니다.' });
}

// GET /purchases/check?productId=X — 현재 로그인 유저의 구매 여부 확인
router.get('/check', requireUser, asyncHandler(async (req, res) => {
  const productId = parseInt(req.query.productId, 10);
  if (isNaN(productId)) return res.status(400).json({ error: '잘못된 상품 ID' });

  const [rows] = await pool.query(
    'SELECT id FROM purchases WHERE user_id = ? AND product_id = ?',
    [req.session.userId, productId]
  );
  res.json({ purchased: rows.length > 0 });
}));

// GET /purchases — 전체 목록 (관리자)
router.get('/', requireAdmin, asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT pu.id, pu.note, pu.created_at,
           u.email AS user_email, u.name AS user_name,
           p.id AS product_id, p.name AS product_name
    FROM purchases pu
    JOIN users    u ON u.id = pu.user_id
    JOIN products p ON p.id = pu.product_id
    ORDER BY pu.created_at DESC
  `);
  res.json(rows);
}));

// POST /purchases — 구매 등록 (관리자, 이메일로 유저 조회)
router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const { email, productId, note } = req.body || {};
  const pid = parseInt(productId, 10);

  if (!email?.trim()) return res.status(400).json({ error: '이메일을 입력해주세요.' });
  if (isNaN(pid))     return res.status(400).json({ error: '상품을 선택해주세요.' });

  const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  if (users.length === 0) return res.status(404).json({ error: '해당 이메일의 회원이 없습니다.' });

  const [products] = await pool.query('SELECT id FROM products WHERE id = ?', [pid]);
  if (products.length === 0) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });

  try {
    await pool.query(
      'INSERT INTO purchases (user_id, product_id, note) VALUES (?, ?, ?)',
      [users[0].id, pid, (note || '').trim() || null]
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: '이미 구매 확인된 내역입니다.' });
    }
    throw err;
  }

  res.status(201).json({ ok: true });
}));

// DELETE /purchases/:id — 삭제 (관리자)
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID' });

  await pool.query('DELETE FROM purchases WHERE id = ?', [id]);
  res.json({ ok: true });
}));

module.exports = router;
