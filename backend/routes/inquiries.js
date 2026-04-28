// ==============================================
// routes/inquiries.js — 문의 관련 API 라우터
//
// 구현된 엔드포인트:
//   POST /inquiries      문의 등록 (프론트 폼에서 호출)
//   GET  /inquiries      문의 목록 (관리자 페이지용 — 추후 인증 추가 예정)
// ==============================================

const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// -----------------------------------------------
// POST /inquiries — 문의 등록
// 요청 본문(JSON): { name, phone, email?, message }
// -----------------------------------------------
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, message } = req.body || {};

    // 필수값 검증
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: '이름을 입력해주세요.' });
    }
    if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
      return res.status(400).json({ error: '연락처를 입력해주세요.' });
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: '문의 내용을 입력해주세요.' });
    }

    // 길이 제한 (DB 컬럼 한도)
    if (name.length > 100)  return res.status(400).json({ error: '이름은 100자 이내로 입력해주세요.' });
    if (phone.length > 50)  return res.status(400).json({ error: '연락처는 50자 이내로 입력해주세요.' });
    if (email && email.length > 255) return res.status(400).json({ error: '이메일은 255자 이내로 입력해주세요.' });

    const [result] = await pool.query(
      'INSERT INTO inquiries (name, phone, email, message) VALUES (?, ?, ?, ?)',
      [name.trim(), phone.trim(), email ? email.trim() : null, message.trim()]
    );

    res.status(201).json({ id: result.insertId, success: true });
  } catch (err) {
    console.error('[POST /inquiries] 오류:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// -----------------------------------------------
// GET /inquiries — 전체 문의 목록 (최신순)
// 추후 관리자 페이지에서 사용
// -----------------------------------------------
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM inquiries ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /inquiries] 오류:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
