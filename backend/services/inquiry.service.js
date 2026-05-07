// ============================================================
// inquiry.service.js — 문의 비즈니스 로직
//
// 기능:
//   - 문의 등록 (입력 검증 + 관리자 이메일 알림)
//   - 문의 목록 조회 (관리자)
//   - 문의 삭제 (관리자)
// ============================================================
const pool = require('../db');
const { sendInquiryNotification } = require('../lib/mailer');

async function create(data, userId) {
  const { name, phone, email, message } = data;
  if (!name?.trim())    return { error: '이름을 입력해주세요.', status: 400 };
  if (!phone?.trim())   return { error: '연락처를 입력해주세요.', status: 400 };
  if (!message?.trim()) return { error: '문의 내용을 입력해주세요.', status: 400 };
  if (name.length > 100)   return { error: '이름은 100자 이내로 입력해주세요.', status: 400 };
  if (phone.length > 50)   return { error: '연락처는 50자 이내로 입력해주세요.', status: 400 };
  if (email?.length > 255) return { error: '이메일은 255자 이내로 입력해주세요.', status: 400 };

  const trimmed = { name: name.trim(), phone: phone.trim(), email: email?.trim() ?? null, message: message.trim() };
  const [result] = await pool.query(
    'INSERT INTO inquiries (name, phone, email, message, user_id) VALUES (?, ?, ?, ?, ?)',
    [trimmed.name, trimmed.phone, trimmed.email, trimmed.message, userId ?? null]
  );
  sendInquiryNotification(trimmed);
  return { id: result.insertId, success: true, status: 201 };
}

async function list() {
  const [rows] = await pool.query('SELECT * FROM inquiries ORDER BY created_at DESC');
  return rows;
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM inquiries WHERE id = ?', [id]);
  if (result.affectedRows === 0) return { error: '해당 문의를 찾을 수 없습니다.', status: 404 };
  return { success: true };
}

module.exports = { create, list, remove };
