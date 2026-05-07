const express = require('express');
const router  = express.Router();
const { requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const productService = require('../services/product.service');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
function parseId(str) { const id = parseInt(str, 10); return isNaN(id) ? null : id; }

router.get('/', asyncHandler(async (req, res) => {
  const result = await productService.list(req.query.category);
  if (result?.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: '올바른 상품 ID가 아닙니다.' });
  const result = await productService.getById(id);
  if (result?.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
}));

router.post('/', requireAdmin, upload.single('image'), asyncHandler(async (req, res) => {
  const imageUrl = req.file ? req.file.path : req.body.image_url?.trim() || null;
  const result = await productService.create(req.body, imageUrl);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.status(201).json(result.data);
}));

router.put('/:id', requireAdmin, upload.single('image'), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: '올바른 상품 ID가 아닙니다.' });
  const result = await productService.update(id, req.body, req.file?.path || null);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result.data);
}));

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: '올바른 상품 ID가 아닙니다.' });
  const result = await productService.remove(id);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
}));

// 상세 이미지
router.get('/:id/detail-images', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: '올바른 상품 ID가 아닙니다.' });
  res.json(await productService.getDetailImages(id, req.query.type));
}));

router.post('/:id/detail-images', requireAdmin, upload.single('image'), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: '올바른 상품 ID가 아닙니다.' });
  if (!req.file) return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
  const result = await productService.addDetailImage(id, req.file.path, req.body.image_type);
  res.status(201).json(result);
}));

router.delete('/:id/detail-images/:imgId', requireAdmin, asyncHandler(async (req, res) => {
  const id = parseId(req.params.id), imgId = parseId(req.params.imgId);
  if (id === null || imgId === null) return res.status(400).json({ error: '잘못된 ID입니다.' });
  const result = await productService.removeDetailImage(id, imgId);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
}));

router.put('/:id/detail-images/reorder', requireAdmin, asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: '올바른 상품 ID가 아닙니다.' });
  const result = await productService.reorderDetailImages(id, req.body.order);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
}));

module.exports = router;
