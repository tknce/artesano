// ============================================================
// content.service.js — 사이트 공통 콘텐츠 관리
//
// 기능:
//   - 소재정보 / 케어가이드 / 교환환불 정책 조회
//   - 관리자가 콘텐츠 수정
// ============================================================
const pool = require('../db');

const ALLOWED_KEYS = new Set(['material_info', 'care_guide', 'refund_policy']);

async function getAll() {
  const [rows] = await pool.query('SELECT content_key, content FROM site_content');
  const out = {};
  rows.forEach(r => { out[r.content_key] = r.content || ''; });
  return out;
}

async function update(key, content) {
  if (!ALLOWED_KEYS.has(key)) return { error: '잘못된 키입니다.', status: 400 };
  await pool.query(
    'INSERT INTO site_content (content_key, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = VALUES(content)',
    [key, content || '']
  );
  return { ok: true };
}

module.exports = { getAll, update };
