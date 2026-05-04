const express = require('express');
const router  = express.Router();
const pool    = require('../db');

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function parseId(str) {
  const id = parseInt(str, 10);
  return isNaN(id) ? null : id;
}

const OPT_FIELDS = [
  'leather_color', 'hardware', 'lining_color', 'initials',
  'desired_lead_time', 'budget_range', 'message',
];

// POST /custom-orders — 주문제작 신청 (공개)
router.post('/', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const { name, phone, email } = body;

  if (!String(name  || '').trim()) return res.status(400).json({ error: '이름을 입력해주세요.' });
  if (!String(phone || '').trim()) return res.status(400).json({ error: '연락처를 입력해주세요.' });
  if (String(name).length    > 100) return res.status(400).json({ error: '이름은 100자 이내로 입력해주세요.' });
  if (String(phone).length   > 50)  return res.status(400).json({ error: '연락처는 50자 이내로 입력해주세요.' });
  if (email && String(email).length > 255) return res.status(400).json({ error: '이메일은 255자 이내로 입력해주세요.' });
  if (body.initials && String(body.initials).length > 10) return res.status(400).json({ error: '이니셜은 10자 이내로 입력해주세요.' });

  let productId   = null;
  let productCode = body.product_code ? String(body.product_code).trim() : null;

  if (body.product_id != null && body.product_id !== '') {
    const pid = parseInt(body.product_id, 10);
    if (!isNaN(pid)) {
      const [rows] = await pool.query('SELECT id, name, category FROM products WHERE id = ?', [pid]);
      if (rows.length === 0) return res.status(400).json({ error: '존재하지 않는 상품입니다.' });
      if (rows[0].category !== 'python') return res.status(400).json({ error: '주문제작은 Python 상품에 한해 가능합니다.' });
      productId = pid;
      if (!productCode) {
        const m = String(rows[0].name).match(/^[A-Z]{2,5}\d{2,4}/);
        if (m) productCode = m[0];
      }
    }
  }

  const opts = Object.fromEntries(
    OPT_FIELDS.map(f => {
      const v = body[f];
      return [f, v != null && String(v).trim() !== '' ? String(v).trim() : null];
    })
  );

  const [result] = await pool.query(
    `INSERT INTO custom_orders
     (product_id, product_code, leather_color, hardware, lining_color, initials,
      desired_lead_time, budget_range, name, phone, email, message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      productId, productCode,
      opts.leather_color, opts.hardware, opts.lining_color, opts.initials,
      opts.desired_lead_time, opts.budget_range,
      String(name).trim(), String(phone).trim(),
      email ? String(email).trim() : null,
      opts.message,
    ]
  );
  res.status(201).json({ id: result.insertId, success: true });
}));

// GET /custom-orders — 전체 목록 (관리자 전용, 최신순)
router.get('/', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT co.*, p.name AS product_name
     FROM custom_orders co
     LEFT JOIN products p ON co.product_id = p.id
     ORDER BY co.created_at DESC`
  );
  res.json(rows);
}));

// DELETE /custom-orders/:id — 삭제 (관리자 전용)
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: '유효하지 않은 ID입니다.' });
  const [result] = await pool.query('DELETE FROM custom_orders WHERE id = ?', [id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: '해당 주문제작을 찾을 수 없습니다.' });
  res.json({ success: true });
}));

module.exports = router;
