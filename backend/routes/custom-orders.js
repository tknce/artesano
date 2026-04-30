// ==============================================
// routes/custom-orders.js — 주문제작 (Python 전용) API
//
// 엔드포인트:
//   POST /custom-orders     주문제작 신청 (프론트 폼에서 호출)
//   GET  /custom-orders     전체 신청 목록 (관리자 페이지용)
// ==============================================

const express = require('express');
const router  = express.Router();
const pool    = require('../db');

const FIELDS = [
  'leather_color', 'hardware', 'lining_color', 'initials',
  'desired_lead_time', 'budget_range', 'message',
];

// -----------------------------------------------
// POST /custom-orders
// 요청 본문(JSON):
//   { product_id?, product_code?, leather_color?, hardware?, lining_color?,
//     initials?, desired_lead_time?, budget_range?,
//     name, phone, email?, message? }
// -----------------------------------------------
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};

    // 필수값 검증
    if (!body.name    || !String(body.name).trim())    return res.status(400).json({ error: '이름을 입력해주세요.' });
    if (!body.phone   || !String(body.phone).trim())   return res.status(400).json({ error: '연락처를 입력해주세요.' });

    // 길이 검증
    if (String(body.name).length > 100)  return res.status(400).json({ error: '이름은 100자 이내로 입력해주세요.' });
    if (String(body.phone).length > 50)  return res.status(400).json({ error: '연락처는 50자 이내로 입력해주세요.' });
    if (body.email && String(body.email).length > 255) return res.status(400).json({ error: '이메일은 255자 이내로 입력해주세요.' });
    if (body.initials && String(body.initials).length > 10) return res.status(400).json({ error: '이니셜은 10자 이내로 입력해주세요.' });

    // product_id 가 들어오면 실존 + Python 카테고리인지 확인
    let productId   = null;
    let productCode = body.product_code ? String(body.product_code).trim() : null;

    if (body.product_id !== undefined && body.product_id !== null && body.product_id !== '') {
      const id = parseInt(body.product_id, 10);
      if (!isNaN(id)) {
        const [rows] = await pool.query('SELECT id, name, category FROM products WHERE id = ?', [id]);
        if (rows.length === 0) {
          return res.status(400).json({ error: '존재하지 않는 상품입니다.' });
        }
        if (rows[0].category !== 'python') {
          return res.status(400).json({ error: '주문제작은 Python 상품에 한해 가능합니다.' });
        }
        productId = id;
        // product_code 가 안 왔으면 상품명에서 코드 추출 (예: "PT001 — 파이톤 클러치" → "PT001")
        if (!productCode) {
          const m = String(rows[0].name).match(/^[A-Z]{2,5}\d{2,4}/);
          if (m) productCode = m[0];
        }
      }
    }

    // 선택 필드들 정규화
    const opts = {};
    FIELDS.forEach(f => {
      const v = body[f];
      opts[f] = (v !== undefined && v !== null && String(v).trim() !== '') ? String(v).trim() : null;
    });

    const [result] = await pool.query(
      `INSERT INTO custom_orders
       (product_id, product_code, leather_color, hardware, lining_color, initials,
        desired_lead_time, budget_range, name, phone, email, message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId, productCode,
        opts.leather_color, opts.hardware, opts.lining_color, opts.initials,
        opts.desired_lead_time, opts.budget_range,
        String(body.name).trim(), String(body.phone).trim(),
        body.email ? String(body.email).trim() : null,
        opts.message,
      ]
    );

    res.status(201).json({ id: result.insertId, success: true });
  } catch (err) {
    console.error('[POST /custom-orders] 오류:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// -----------------------------------------------
// GET /custom-orders — 전체 목록 (최신순, 관리자용)
// product_id 로 products 테이블 조인해 상품명도 같이 반환
// -----------------------------------------------
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT co.*, p.name AS product_name
       FROM custom_orders co
       LEFT JOIN products p ON co.product_id = p.id
       ORDER BY co.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /custom-orders] 오류:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// -----------------------------------------------
// DELETE /custom-orders/:id — 주문제작 삭제 (관리자용)
// -----------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: '유효하지 않은 ID입니다.' });

    const [result] = await pool.query('DELETE FROM custom_orders WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: '해당 주문제작을 찾을 수 없습니다.' });

    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /custom-orders/:id] 오류:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
