// ============================================================
// product.service.js — 상품 관리 비즈니스 로직
//
// 기능:
//   - 상품 목록 조회 (카테고리 필터)
//   - 상품 상세 조회
//   - 상품 등록/수정/삭제 (Cloudinary 이미지 관리 포함)
//   - 상세 이미지 CRUD (갤러리/디테일 타입, 순서 변경)
// ============================================================
const pool = require('../db');
const cloudinary = require('../lib/cloudinary');
const { optimize } = require('../lib/cloudinary');

function withOptimized(row) {
  return row && row.image_url ? { ...row, image_url: optimize(row.image_url) } : row;
}

function getPublicId(imageUrl) {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) return null;
  const match = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
  return match ? match[1] : null;
}

async function deleteImage(imageUrl) {
  const publicId = getPublicId(imageUrl);
  if (!publicId) return;
  try { await cloudinary.uploader.destroy(publicId); } catch (err) { console.error('[cloudinary] 삭제 실패:', err.message); }
}

async function categoryExists(slug) {
  if (!slug) return false;
  const [rows] = await pool.query('SELECT id FROM categories WHERE slug = ?', [slug.trim()]);
  return rows.length > 0;
}

function parseIntField(value) {
  if (value == null || value === '' || value === 'null') return null;
  const n = parseInt(value, 10);
  return isNaN(n) || n < 0 ? undefined : n;
}

function parseBody(body) {
  const errors = [];
  const out = {};
  if (!body.name?.trim()) errors.push('name은 필수입니다.'); else out.name = body.name.trim();
  if (!body.category?.trim()) errors.push('category는 필수입니다.'); else out.category = body.category.trim();
  out.option_desc = body.option_desc ? String(body.option_desc).trim() : null;
  out.description = body.description ? String(body.description).trim() : null;
  out.material_info = body.material_info ? String(body.material_info).trim() : null;
  out.badge = body.badge ? String(body.badge).trim() : null;
  const p = parseIntField(body.price); if (p === undefined) errors.push('price는 0 이상의 정수여야 합니다.'); else out.price = p;
  const op = parseIntField(body.original_price); if (op === undefined) errors.push('original_price는 0 이상의 정수여야 합니다.'); else out.original_price = op;
  out.is_custom_order = [true, 1, '1'].includes(body.is_custom_order) ? 1 : 0;
  return { errors, data: out };
}

async function list(category) {
  if (category && !(await categoryExists(category))) return { error: '존재하지 않는 카테고리입니다.', status: 400 };
  const [sql, params] = category ? ['SELECT * FROM products WHERE category = ? ORDER BY id ASC', [category]] : ['SELECT * FROM products ORDER BY id ASC', []];
  const [rows] = await pool.query(sql, params);
  return rows.map(withOptimized);
}

async function getById(id) {
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  if (rows.length === 0) return { error: '상품을 찾을 수 없습니다.', status: 404 };
  return withOptimized(rows[0]);
}

async function create(body, imageUrl) {
  const { errors, data } = parseBody(body);
  if (!imageUrl) errors.push('이미지 파일 또는 image_url 중 하나는 필수입니다.');
  if (errors.length > 0) return { error: errors.join(' '), status: 400 };
  if (!(await categoryExists(data.category))) return { error: '존재하지 않는 카테고리입니다.', status: 400 };
  const [result] = await pool.query(
    'INSERT INTO products (name, category, option_desc, description, material_info, price, original_price, image_url, is_custom_order, badge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [data.name, data.category, data.option_desc, data.description, data.material_info, data.price, data.original_price, imageUrl, data.is_custom_order, data.badge]
  );
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
  return { data: withOptimized(rows[0]), status: 201 };
}

async function update(id, body, newFile) {
  const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  if (existing.length === 0) return { error: '상품을 찾을 수 없습니다.', status: 404 };
  const old = existing[0];
  const { errors, data } = parseBody(body);
  if (errors.length > 0) return { error: errors.join(' '), status: 400 };
  if (!(await categoryExists(data.category))) return { error: '존재하지 않는 카테고리입니다.', status: 400 };

  let imageUrl = old.image_url, oldUrlToDelete = null;
  if (newFile) { imageUrl = newFile; oldUrlToDelete = old.image_url; }
  else if (body.image_url !== undefined) { const v = String(body.image_url).trim(); if (v && v !== old.image_url) { imageUrl = v; oldUrlToDelete = old.image_url; } }

  await pool.query('UPDATE products SET name=?, category=?, option_desc=?, description=?, material_info=?, price=?, original_price=?, image_url=?, is_custom_order=?, badge=? WHERE id=?',
    [data.name, data.category, data.option_desc, data.description, data.material_info, data.price, data.original_price, imageUrl, data.is_custom_order, data.badge, id]);
  if (oldUrlToDelete) await deleteImage(oldUrlToDelete);
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  return { data: withOptimized(rows[0]) };
}

async function remove(id) {
  const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  if (existing.length === 0) return { error: '상품을 찾을 수 없습니다.', status: 404 };
  await pool.query('DELETE FROM products WHERE id = ?', [id]);
  await deleteImage(existing[0].image_url);
  return { success: true, id };
}

// 상세 이미지
async function getDetailImages(productId, type) {
  let sql, params;
  if (type === 'gallery' || type === 'detail') { sql = 'SELECT * FROM product_detail_images WHERE product_id = ? AND image_type = ? ORDER BY sort_order ASC, id ASC'; params = [productId, type]; }
  else { sql = 'SELECT * FROM product_detail_images WHERE product_id = ? ORDER BY image_type ASC, sort_order ASC, id ASC'; params = [productId]; }
  const [rows] = await pool.query(sql, params);
  return rows.map(withOptimized);
}

async function addDetailImage(productId, imageUrl, imageType) {
  const type = imageType === 'gallery' ? 'gallery' : 'detail';
  const [result] = await pool.query('INSERT INTO product_detail_images (product_id, image_url, sort_order, image_type) VALUES (?, ?, ?, ?)', [productId, imageUrl, 0, type]);
  return { id: result.insertId, product_id: productId, image_url: optimize(imageUrl), image_type: type, status: 201 };
}

async function removeDetailImage(productId, imgId) {
  const [rows] = await pool.query('SELECT * FROM product_detail_images WHERE id = ? AND product_id = ?', [imgId, productId]);
  if (rows.length === 0) return { error: '이미지를 찾을 수 없습니다.', status: 404 };
  await pool.query('DELETE FROM product_detail_images WHERE id = ?', [imgId]);
  await deleteImage(rows[0].image_url);
  return { success: true };
}

async function reorderDetailImages(productId, order) {
  if (!Array.isArray(order)) return { error: 'order 배열이 필요합니다.', status: 400 };
  for (const item of order) { await pool.query('UPDATE product_detail_images SET sort_order = ? WHERE id = ? AND product_id = ?', [item.sort_order, item.id, productId]); }
  return { success: true };
}

module.exports = { list, getById, create, update, remove, getDetailImages, addDetailImage, removeDetailImage, reorderDetailImages };
