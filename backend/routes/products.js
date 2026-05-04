const express = require('express');
const fs      = require('fs');
const path    = require('path');
const router  = express.Router();
const pool    = require('../db');
const upload  = require('../middleware/upload');

const ALLOWED_CATEGORIES = ['crocodile', 'ostrich', 'python'];

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function parseId(str) {
  const id = parseInt(str, 10);
  return isNaN(id) ? null : id;
}

function fileToUrl(file) {
  return `/uploads/${file.filename}`;
}

function deleteUploadedFile(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;
  fs.unlink(path.join(__dirname, '..', imageUrl), err => {
    if (err && err.code !== 'ENOENT') console.error('[unlink] 삭제 실패:', err.message);
  });
}

function parseIntField(value, label, errors) {
  if (value == null || value === '' || value === 'null') return null;
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 0) { errors.push(`${label}는 0 이상의 정수여야 합니다.`); return null; }
  return n;
}

function parseProductBody(body) {
  const errors = [];
  const out    = {};

  if (!body.name?.trim()) {
    errors.push('name은 필수입니다.');
  } else {
    out.name = body.name.trim();
  }

  if (!ALLOWED_CATEGORIES.includes(body.category)) {
    errors.push('category는 crocodile / ostrich / python 중 하나여야 합니다.');
  } else {
    out.category = body.category;
  }

  out.option_desc    = body.option_desc ? String(body.option_desc).trim() : null;
  out.badge          = body.badge       ? String(body.badge).trim()       : null;
  out.price          = parseIntField(body.price,          'price',          errors);
  out.original_price = parseIntField(body.original_price, 'original_price', errors);
  out.is_custom_order = [true, 1, '1'].includes(body.is_custom_order) ? 1 : 0;

  return { errors, data: out };
}

// GET /products — 전체 목록 (?category= 필터)
router.get('/', asyncHandler(async (req, res) => {
  const { category } = req.query;
  if (category && !ALLOWED_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'category는 crocodile / ostrich / python 중 하나여야 합니다.' });
  }
  const [sql, params] = category
    ? ['SELECT * FROM products WHERE category = ? ORDER BY id ASC', [category]]
    : ['SELECT * FROM products ORDER BY id ASC', []];
  const [rows] = await pool.query(sql, params);
  res.json(rows);
}));

// GET /products/:id — 상품 1개
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: '올바른 상품 ID가 아닙니다.' });
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  if (rows.length === 0) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
  res.json(rows[0]);
}));

// POST /products — 상품 등록 (multipart/form-data)
router.post('/', upload.single('image'), asyncHandler(async (req, res) => {
  const { errors, data } = parseProductBody(req.body);

  let imageUrl = req.file
    ? fileToUrl(req.file)
    : req.body.image_url?.trim() || null;
  if (!imageUrl) errors.push('이미지 파일 또는 image_url 중 하나는 필수입니다.');

  if (errors.length > 0) return res.status(400).json({ error: errors.join(' ') });

  const [result] = await pool.query(
    'INSERT INTO products (name, category, option_desc, price, original_price, image_url, is_custom_order, badge) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [data.name, data.category, data.option_desc, data.price, data.original_price, imageUrl, data.is_custom_order, data.badge]
  );
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
}));

// PUT /products/:id — 상품 수정
router.put('/:id', upload.single('image'), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: '올바른 상품 ID가 아닙니다.' });

  const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  if (existing.length === 0) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });

  const old = existing[0];
  const { errors, data } = parseProductBody(req.body);
  if (errors.length > 0) return res.status(400).json({ error: errors.join(' ') });

  let imageUrl      = old.image_url;
  let oldFileToDelete = null;

  if (req.file) {
    imageUrl        = fileToUrl(req.file);
    oldFileToDelete = old.image_url;
  } else if (req.body.image_url !== undefined) {
    const v = String(req.body.image_url).trim();
    if (v && v !== old.image_url) { imageUrl = v; oldFileToDelete = old.image_url; }
  }

  await pool.query(
    'UPDATE products SET name=?, category=?, option_desc=?, price=?, original_price=?, image_url=?, is_custom_order=?, badge=? WHERE id=?',
    [data.name, data.category, data.option_desc, data.price, data.original_price, imageUrl, data.is_custom_order, data.badge, id]
  );
  if (oldFileToDelete) deleteUploadedFile(oldFileToDelete);

  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  res.json(rows[0]);
}));

// DELETE /products/:id — 상품 삭제
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: '올바른 상품 ID가 아닙니다.' });

  const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  if (existing.length === 0) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });

  await pool.query('DELETE FROM products WHERE id = ?', [id]);
  deleteUploadedFile(existing[0].image_url);
  res.json({ success: true, id });
}));

module.exports = router;
