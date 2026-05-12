// ============================================================
// user-admin.service.js — 관리자 회원 관리
//   - 회원 목록 (검색·페이지)
//   - 회원 상세 (주문 이력 + 누적 결제액)
//   - 차단 토글
//   - 회원 삭제 (auth.service.deleteAccount 재사용)
//   - 임시 비밀번호 발급
// ============================================================
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { deleteAccount } = require('./auth.service');

const PAID_STATUSES = ['paid', 'preparing', 'shipping', 'delivered'];

async function list({ search = '', page = 1, limit = 20 }) {
  const offset = Math.max(0, (parseInt(page, 10) - 1) * limit);
  const pageSize = Math.min(100, parseInt(limit, 10) || 20);

  const params = [];
  let where = '';
  if (search && search.trim()) {
    where = 'WHERE u.email LIKE ? OR u.name LIKE ?';
    const like = `%${search.trim()}%`;
    params.push(like, like);
  }

  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM users u ${where}`, params);
  const total = countRows[0].total;

  const [rows] = await pool.query(
    `SELECT u.id, u.email, u.name, u.phone, u.login_type, u.is_blocked, u.created_at,
            COALESCE(SUM(CASE WHEN o.status IN (?, ?, ?, ?) THEN o.amount ELSE 0 END), 0) AS total_spent,
            SUM(CASE WHEN o.status IN (?, ?, ?, ?) THEN 1 ELSE 0 END) AS order_count
     FROM users u
     LEFT JOIN orders o ON o.user_id = u.id
     ${where}
     GROUP BY u.id
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [...PAID_STATUSES, ...PAID_STATUSES, ...params, pageSize, offset]
  );

  return { rows, total, page: parseInt(page, 10), limit: pageSize };
}

async function detail(id) {
  const userId = parseInt(id, 10);
  if (isNaN(userId)) return { error: '잘못된 ID', status: 400 };

  const [users] = await pool.query(
    'SELECT id, email, name, phone, login_type, is_blocked, created_at FROM users WHERE id = ?',
    [userId]
  );
  if (users.length === 0) return { error: '회원을 찾을 수 없습니다.', status: 404 };

  const [orders] = await pool.query(
    `SELECT order_id, product_name, amount, status, created_at, paid_at
     FROM orders
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );

  const totalSpent = orders
    .filter(o => PAID_STATUSES.includes(o.status))
    .reduce((sum, o) => sum + o.amount, 0);

  return { user: users[0], orders, totalSpent };
}

async function setBlocked(id, blocked) {
  const userId = parseInt(id, 10);
  if (isNaN(userId)) return { error: '잘못된 ID', status: 400 };
  const [result] = await pool.query(
    'UPDATE users SET is_blocked = ? WHERE id = ?',
    [blocked ? 1 : 0, userId]
  );
  if (result.affectedRows === 0) return { error: '회원을 찾을 수 없습니다.', status: 404 };
  return { ok: true, is_blocked: blocked ? 1 : 0 };
}

async function remove(id) {
  const userId = parseInt(id, 10);
  if (isNaN(userId)) return { error: '잘못된 ID', status: 400 };
  const ok = await deleteAccount(userId);
  if (!ok) return { error: '회원을 찾을 수 없습니다.', status: 404 };
  return { ok: true };
}

async function resetPassword(id) {
  const userId = parseInt(id, 10);
  if (isNaN(userId)) return { error: '잘못된 ID', status: 400 };

  const [users] = await pool.query('SELECT login_type FROM users WHERE id = ?', [userId]);
  if (users.length === 0) return { error: '회원을 찾을 수 없습니다.', status: 404 };
  if (users[0].login_type !== 'email') {
    return { error: '소셜 로그인 회원은 비밀번호 초기화 대상이 아닙니다.', status: 400 };
  }

  const tempPassword = crypto.randomBytes(6).toString('base64').replace(/[+/=]/g, '').slice(0, 10);
  const hash = await bcrypt.hash(tempPassword, 12);
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
  return { ok: true, tempPassword };
}

module.exports = { list, detail, setBlocked, remove, resetPassword };
