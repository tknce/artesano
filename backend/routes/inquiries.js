const express = require('express');
const router  = express.Router();
const pool    = require('../db');

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function parseId(str) {
  const id = parseInt(str, 10);
  return isNaN(id) ? null : id;
}

// POST /inquiries — 문의 등록 (공개)
router.post('/', asyncHandler(async (req, res) => {
  const { name, phone, email, message } = req.body || {};

  if (!name?.trim())    return res.status(400).json({ error: '이름을 입력해주세요.' });
  if (!phone?.trim())   return res.status(400).json({ error: '연락처를 입력해주세요.' });
  if (!message?.trim()) return res.status(400).json({ error: '문의 내용을 입력해주세요.' });
  if (name.length    > 100) return res.status(400).json({ error: '이름은 100자 이내로 입력해주세요.' });
  if (phone.length   > 50)  return res.status(400).json({ error: '연락처는 50자 이내로 입력해주세요.' });
  if (email?.length  > 255) return res.status(400).json({ error: '이메일은 255자 이내로 입력해주세요.' });

  const userId = req.session?.userId ?? null;
  const [result] = await pool.query(
    'INSERT INTO inquiries (name, phone, email, message, user_id) VALUES (?, ?, ?, ?, ?)',
    [name.trim(), phone.trim(), email?.trim() ?? null, message.trim(), userId]
  );
  res.status(201).json({ id: result.insertId, success: true });
}));

// GET /inquiries — 문의 목록 (관리자 전용)
router.get('/', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM inquiries ORDER BY created_at DESC');
  res.json(rows);
}));

// DELETE /inquiries/:id — 문의 삭제 (관리자 전용)
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: '유효하지 않은 ID입니다.' });
  const [result] = await pool.query('DELETE FROM inquiries WHERE id = ?', [id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: '해당 문의를 찾을 수 없습니다.' });
  res.json({ success: true });
}));

module.exports = router;
