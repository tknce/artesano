// ==============================================
// routes/products.js — 상품 관련 API 라우터
//
// 공개 엔드포인트:
//   GET    /products                전체 상품 목록 (?category= 필터)
//   GET    /products/:id            상품 1개 상세 조회
//
// 관리자 엔드포인트 (지금은 인증 없음, 배포 시 JWT 추가 예정):
//   POST   /products                상품 등록 (multipart/form-data, 이미지 첨부)
//   PUT    /products/:id            상품 수정 (이미지 변경 시 multipart, 아니면 JSON)
//   DELETE /products/:id            상품 삭제
// ==============================================

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const router  = express.Router();
const pool    = require('../db');
const upload  = require('../middleware/upload');

const ALLOWED_CATEGORIES = ['crocodile', 'ostrich', 'python'];

// 업로드된 파일을 외부에서 접근 가능한 URL 경로로 변환
function fileToUrl(file) {
  return `/uploads/${file.filename}`;
}

// 로컬 업로드 파일이면 디스크에서 삭제 (외부 URL은 건드리지 않음)
function deleteUploadedFile(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;
  const fullPath = path.join(__dirname, '..', imageUrl);
  fs.unlink(fullPath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error('[unlink] 파일 삭제 실패:', err.message);
    }
  });
}

// 상품 입력값 검증 + 정규화 (POST/PUT 공용)
function parseProductBody(body) {
  const errors = [];
  const out    = {};

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    errors.push('name은 필수입니다.');
  } else {
    out.name = body.name.trim();
  }

  if (!body.category || !ALLOWED_CATEGORIES.includes(body.category)) {
    errors.push('category는 crocodile / ostrich / python 중 하나여야 합니다.');
  } else {
    out.category = body.category;
  }

  out.option_desc     = body.option_desc ? String(body.option_desc).trim() : null;
  out.badge           = body.badge       ? String(body.badge).trim()       : null;

  // price / original_price: 빈 문자열이거나 'null'이면 null, 아니면 정수 변환
  function parseIntField(value, label) {
    if (value === undefined || value === null || value === '' || value === 'null') return null;
    const n = parseInt(value, 10);
    if (isNaN(n) || n < 0) {
      errors.push(`${label}는 0 이상의 정수여야 합니다.`);
      return null;
    }
    return n;
  }
  out.price           = parseIntField(body.price,           'price');
  out.original_price  = parseIntField(body.original_price,  'original_price');
  out.is_custom_order = body.is_custom_order === '1' || body.is_custom_order === 1 || body.is_custom_order === true ? 1 : 0;

  return { errors, data: out };
}

// -----------------------------------------------
// GET /products — 전체 목록 (?category= 필터)
// -----------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;

    let sql    = 'SELECT * FROM products';
    let params = [];

    if (category) {
      if (!ALLOWED_CATEGORIES.includes(category)) {
        return res.status(400).json({
          error: 'category는 crocodile / ostrich / python 중 하나여야 합니다.',
        });
      }
      sql += ' WHERE category = ?';
      params.push(category);
    }

    sql += ' ORDER BY id ASC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('[GET /products] 오류:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// -----------------------------------------------
// GET /products/:id — 상품 1개 상세 조회
// -----------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: '올바른 상품 ID가 아닙니다.' });
    }

    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('[GET /products/:id] 오류:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// -----------------------------------------------
// POST /products — 상품 등록 (이미지 첨부 가능)
// 요청: multipart/form-data
//   필드: name, category, option_desc?, price?, original_price?, badge?, is_custom_order?
//   파일: image (선택 — 외부 URL 쓰려면 image_url 필드 사용)
// -----------------------------------------------
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { errors, data } = parseProductBody(req.body);

    // image_url 결정: 업로드 파일이 있으면 그걸로, 없으면 body.image_url 사용
    let imageUrl = null;
    if (req.file) {
      imageUrl = fileToUrl(req.file);
    } else if (req.body.image_url && typeof req.body.image_url === 'string') {
      imageUrl = req.body.image_url.trim() || null;
    }

    if (!imageUrl) {
      errors.push('이미지 파일 또는 image_url 중 하나는 필수입니다.');
    }

    if (errors.length > 0) {
      if (req.file) deleteUploadedFile(fileToUrl(req.file));
      return res.status(400).json({ error: errors.join(' ') });
    }

    const [result] = await pool.query(
      `INSERT INTO products
       (name, category, option_desc, price, original_price, image_url, is_custom_order, badge)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.name, data.category, data.option_desc, data.price, data.original_price,
       imageUrl, data.is_custom_order, data.badge]
    );

    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /products] 오류:', err.message);
    if (req.file) deleteUploadedFile(fileToUrl(req.file));
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// -----------------------------------------------
// PUT /products/:id — 상품 수정
// 새 이미지 첨부 시 기존 로컬 파일 자동 삭제
// -----------------------------------------------
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      if (req.file) deleteUploadedFile(fileToUrl(req.file));
      return res.status(400).json({ error: '올바른 상품 ID가 아닙니다.' });
    }

    const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (existing.length === 0) {
      if (req.file) deleteUploadedFile(fileToUrl(req.file));
      return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    }
    const old = existing[0];

    const { errors, data } = parseProductBody(req.body);

    // image_url 결정 우선순위:
    //   1) 파일 업로드 → 새 파일
    //   2) image_url 필드가 들어옴 → 그 값으로 교체
    //   3) 둘 다 없음 → 기존 값 유지
    let imageUrl = old.image_url;
    let oldFileToDelete = null;

    if (req.file) {
      imageUrl = fileToUrl(req.file);
      oldFileToDelete = old.image_url;
    } else if (req.body.image_url !== undefined) {
      const v = String(req.body.image_url).trim();
      if (v) {
        imageUrl = v;
        if (v !== old.image_url) oldFileToDelete = old.image_url;
      }
    }

    if (errors.length > 0) {
      if (req.file) deleteUploadedFile(fileToUrl(req.file));
      return res.status(400).json({ error: errors.join(' ') });
    }

    await pool.query(
      `UPDATE products
       SET name=?, category=?, option_desc=?, price=?, original_price=?,
           image_url=?, is_custom_order=?, badge=?
       WHERE id=?`,
      [data.name, data.category, data.option_desc, data.price, data.original_price,
       imageUrl, data.is_custom_order, data.badge, id]
    );

    if (oldFileToDelete) deleteUploadedFile(oldFileToDelete);

    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('[PUT /products/:id] 오류:', err.message);
    if (req.file) deleteUploadedFile(fileToUrl(req.file));
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// -----------------------------------------------
// DELETE /products/:id — 상품 삭제 (이미지 파일도 같이 삭제)
// -----------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: '올바른 상품 ID가 아닙니다.' });
    }

    const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    }

    await pool.query('DELETE FROM products WHERE id = ?', [id]);
    deleteUploadedFile(existing[0].image_url);

    res.json({ success: true, id });
  } catch (err) {
    console.error('[DELETE /products/:id] 오류:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
