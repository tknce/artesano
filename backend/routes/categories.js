const express = require('express');
const router  = express.Router();
const pool    = require('../db');

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const SLUG_RE = /^[a-z0-9-]{2,50}$/;
const PROTECTED_SLUGS = new Set(['python']); // 비즈니스 룰: custom-order 의존

function parseId(str) {
  const id = parseInt(str, 10);
  return isNaN(id) ? null : id;
}

// GET /categories — 모든 카테고리 (정렬 순서)
router.get('/', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM categories ORDER BY sort_order ASC, id ASC'
  );
  res.json(rows);
}));

// POST /categories — 등록 (관리자)
router.post('/', asyncHandler(async (req, res) => {
  const { slug, name, sort_order } = req.body || {};
  const s = String(slug || '').trim().toLowerCase();
  const n = String(name || '').trim();
  if (!SLUG_RE.test(s)) return res.status(400).json({ error: 'slug는 영문 소문자/숫자/하이픈 2~50자입니다.' });
  if (!n || n.length > 100) return res.status(400).json({ error: 'name은 1~100자입니다.' });

  const order = Number.isInteger(sort_order) ? sort_order : 999;
  try {
    const [result] = await pool.query(
      'INSERT INTO categories (slug, name, sort_order) VALUES (?, ?, ?)',
      [s, n, order]
    );
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: '이미 존재하는 slug입니다.' });
    throw err;
  }
}));

// PUT /categories/:id — name / sort_order 수정 (slug는 immutable)
router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: '유효하지 않은 ID입니다.' });
  const { name, sort_order } = req.body || {};
  const n = name != null ? String(name).trim() : null;
  if (n !== null && (!n || n.length > 100)) {
    return res.status(400).json({ error: 'name은 1~100자입니다.' });
  }
  const order = Number.isInteger(sort_order) ? sort_order : null;

  const sets = [];
  const params = [];
  if (n !== null)     { sets.push('name = ?');       params.push(n); }
  if (order !== null) { sets.push('sort_order = ?'); params.push(order); }
  if (sets.length === 0) return res.status(400).json({ error: '변경할 필드가 없습니다.' });
  params.push(id);

  const [result] = await pool.query(
    `UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, params
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: '카테고리를 찾을 수 없습니다.' });
  const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
  res.json(rows[0]);
}));

// DELETE /categories/:id — 사용 중이거나 보호된 slug면 거부
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: '유효하지 않은 ID입니다.' });
  const [rows] = await pool.query('SELECT slug FROM categories WHERE id = ?', [id]);
  if (rows.length === 0) return res.status(404).json({ error: '카테고리를 찾을 수 없습니다.' });
  const slug = rows[0].slug;
  if (PROTECTED_SLUGS.has(slug)) {
    return res.status(400).json({ error: `'${slug}' 카테고리는 주문제작 기능에 사용 중이라 삭제할 수 없습니다.` });
  }
  const [used] = await pool.query('SELECT COUNT(*) AS c FROM products WHERE category = ?', [slug]);
  if (used[0].c > 0) {
    return res.status(400).json({ error: `이 카테고리에 상품이 ${used[0].c}개 있어 삭제할 수 없습니다. 먼저 상품을 삭제하거나 다른 카테고리로 옮기세요.` });
  }
  await pool.query('DELETE FROM categories WHERE id = ?', [id]);
  res.json({ success: true });
}));

module.exports = router;
