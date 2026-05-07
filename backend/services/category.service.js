// ============================================================
// category.service.js — 카테고리 관리 비즈니스 로직
//
// 기능:
//   - 카테고리 목록 조회 (정렬 순서)
//   - 카테고리 생성 (slug 유효성 검사)
//   - 카테고리 수정 (name, sort_order만 — slug는 불변)
//   - 카테고리 삭제 (보호된 slug 및 사용 중인 카테고리 거부)
// ============================================================
const pool = require('../db');

const SLUG_RE = /^[a-z0-9-]{2,50}$/;
const PROTECTED_SLUGS = new Set(['python']);

async function list() {
  const [rows] = await pool.query('SELECT * FROM categories ORDER BY sort_order ASC, id ASC');
  return rows;
}

async function create(slug, name, sortOrder) {
  const s = String(slug || '').trim().toLowerCase();
  const n = String(name || '').trim();
  if (!SLUG_RE.test(s)) return { error: 'slug는 영문 소문자/숫자/하이픈 2~50자입니다.', status: 400 };
  if (!n || n.length > 100) return { error: 'name은 1~100자입니다.', status: 400 };

  const order = Number.isInteger(sortOrder) ? sortOrder : 999;
  try {
    const [result] = await pool.query('INSERT INTO categories (slug, name, sort_order) VALUES (?, ?, ?)', [s, n, order]);
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    return { data: rows[0], status: 201 };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return { error: '이미 존재하는 slug입니다.', status: 409 };
    throw err;
  }
}

async function update(id, name, sortOrder) {
  const n = name != null ? String(name).trim() : null;
  if (n !== null && (!n || n.length > 100)) return { error: 'name은 1~100자입니다.', status: 400 };
  const order = Number.isInteger(sortOrder) ? sortOrder : null;

  const sets = [], params = [];
  if (n !== null) { sets.push('name = ?'); params.push(n); }
  if (order !== null) { sets.push('sort_order = ?'); params.push(order); }
  if (sets.length === 0) return { error: '변경할 필드가 없습니다.', status: 400 };
  params.push(id);

  const [result] = await pool.query(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, params);
  if (result.affectedRows === 0) return { error: '카테고리를 찾을 수 없습니다.', status: 404 };
  const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
  return { data: rows[0] };
}

async function remove(id) {
  const [rows] = await pool.query('SELECT slug FROM categories WHERE id = ?', [id]);
  if (rows.length === 0) return { error: '카테고리를 찾을 수 없습니다.', status: 404 };
  const slug = rows[0].slug;
  if (PROTECTED_SLUGS.has(slug)) return { error: `'${slug}' 카테고리는 주문제작 기능에 사용 중이라 삭제할 수 없습니다.`, status: 400 };
  const [used] = await pool.query('SELECT COUNT(*) AS c FROM products WHERE category = ?', [slug]);
  if (used[0].c > 0) return { error: `이 카테고리에 상품이 ${used[0].c}개 있어 삭제할 수 없습니다.`, status: 400 };
  await pool.query('DELETE FROM categories WHERE id = ?', [id]);
  return { success: true };
}

module.exports = { list, create, update, remove };
