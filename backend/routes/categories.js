const express = require('express');
const router  = express.Router();
const { requireAdmin } = require('../middleware/auth');
const categoryService = require('../services/category.service');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function parseId(str) { const id = parseInt(str, 10); return isNaN(id) ? null : id; }

router.get('/', asyncHandler(async (req, res) => {
  res.json(await categoryService.list());
}));

router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const { slug, name, sort_order } = req.body || {};
  const result = await categoryService.create(slug, name, sort_order);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.status(201).json(result.data);
}));

router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: '유효하지 않은 ID입니다.' });
  const { name, sort_order } = req.body || {};
  const result = await categoryService.update(id, name, sort_order);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result.data);
}));

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: '유효하지 않은 ID입니다.' });
  const result = await categoryService.remove(id);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
}));

module.exports = router;
