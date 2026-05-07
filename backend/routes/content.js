const express = require('express');
const router  = express.Router();
const pool    = require('../db');

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.status(401).json({ error: '관리자 권한이 필요합니다.' });
}

const ALLOWED_KEYS = new Set(['material_info', 'care_guide', 'refund_policy']);

// GET /api/content — 전체 콘텐츠 (공개)
router.get('/', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT content_key, content FROM site_content');
  const out = {};
  rows.forEach(r => { out[r.content_key] = r.content || ''; });
  res.json(out);
}));

// PUT /api/content/:key — 수정 (관리자)
router.put('/:key', requireAdmin, asyncHandler(async (req, res) => {
  const key = req.params.key;
  if (!ALLOWED_KEYS.has(key)) return res.status(400).json({ error: '잘못된 키입니다.' });

  const { content } = req.body || {};
  await pool.query(
    'INSERT INTO site_content (content_key, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = VALUES(content)',
    [key, content || '']
  );
  res.json({ ok: true });
}));

module.exports = router;
