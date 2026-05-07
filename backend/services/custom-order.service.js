// ============================================================
// custom-order.service.js — 주문제작 신청 비즈니스 로직
//
// 기능:
//   - 주문제작 신청 (Python 상품만, 커스텀 옵션 + 관리자 알림)
//   - 주문제작 목록 조회 (관리자)
//   - 주문제작 삭제 (관리자)
// ============================================================
const pool = require('../db');
const { sendCustomOrderNotification } = require('../lib/mailer');

const OPT_FIELDS = ['leather_color', 'hardware', 'lining_color', 'initials', 'desired_lead_time', 'budget_range', 'message'];

async function create(body, userId) {
  const { name, phone, email } = body;
  if (!String(name || '').trim())  return { error: '이름을 입력해주세요.', status: 400 };
  if (!String(phone || '').trim()) return { error: '연락처를 입력해주세요.', status: 400 };
  if (String(name).length > 100)   return { error: '이름은 100자 이내로 입력해주세요.', status: 400 };
  if (String(phone).length > 50)   return { error: '연락처는 50자 이내로 입력해주세요.', status: 400 };
  if (email && String(email).length > 255) return { error: '이메일은 255자 이내로 입력해주세요.', status: 400 };
  if (body.initials && String(body.initials).length > 10) return { error: '이니셜은 10자 이내로 입력해주세요.', status: 400 };

  let productId = null;
  let productCode = body.product_code ? String(body.product_code).trim() : null;

  if (body.product_id != null && body.product_id !== '') {
    const pid = parseInt(body.product_id, 10);
    if (!isNaN(pid)) {
      const [rows] = await pool.query('SELECT id, name, category FROM products WHERE id = ?', [pid]);
      if (rows.length === 0) return { error: '존재하지 않는 상품입니다.', status: 400 };
      if (rows[0].category !== 'python') return { error: '주문제작은 Python 상품에 한해 가능합니다.', status: 400 };
      productId = pid;
      if (!productCode) { const m = String(rows[0].name).match(/^[A-Z]{2,5}\d{2,4}/); if (m) productCode = m[0]; }
    }
  }

  const opts = Object.fromEntries(OPT_FIELDS.map(f => [f, body[f] != null && String(body[f]).trim() !== '' ? String(body[f]).trim() : null]));
  const trimmedName = String(name).trim(), trimmedPhone = String(phone).trim(), trimmedEmail = email ? String(email).trim() : null;

  const [result] = await pool.query(
    `INSERT INTO custom_orders (product_id, product_code, leather_color, hardware, lining_color, initials, desired_lead_time, budget_range, name, phone, email, message, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [productId, productCode, opts.leather_color, opts.hardware, opts.lining_color, opts.initials, opts.desired_lead_time, opts.budget_range, trimmedName, trimmedPhone, trimmedEmail, opts.message, userId ?? null]
  );
  sendCustomOrderNotification({ name: trimmedName, phone: trimmedPhone, email: trimmedEmail, product_code: productCode, ...opts });
  return { id: result.insertId, success: true, status: 201 };
}

async function list() {
  const [rows] = await pool.query(`SELECT co.*, p.name AS product_name FROM custom_orders co LEFT JOIN products p ON co.product_id = p.id ORDER BY co.created_at DESC`);
  return rows;
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM custom_orders WHERE id = ?', [id]);
  if (result.affectedRows === 0) return { error: '해당 주문제작을 찾을 수 없습니다.', status: 404 };
  return { success: true };
}

module.exports = { create, list, remove };
