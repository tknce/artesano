const express = require('express');
const router  = express.Router();
const { requireAdmin } = require('../middleware/auth');
const customOrderService = require('../services/custom-order.service');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.post('/', asyncHandler(async (req, res) => {
  const result = await customOrderService.create(req.body, req.session?.userId);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.status(201).json({ id: result.id, success: true });
}));

router.get('/', requireAdmin, asyncHandler(async (req, res) => {
  res.json(await customOrderService.list());
}));

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: '유효하지 않은 ID입니다.' });
  const result = await customOrderService.remove(id);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
}));

module.exports = router;
