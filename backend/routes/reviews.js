const express = require('express');
const router  = express.Router();
const { requireUser } = require('../middleware/auth');
const reviewService = require('../services/review.service');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', asyncHandler(async (req, res) => {
  const productId = parseInt(req.query.productId, 10);
  if (!isNaN(productId)) return res.json(await reviewService.listByProduct(productId));
  if (!req.session?.isAdmin) return res.status(401).json({ error: '관리자 권한이 필요합니다.' });
  res.json(await reviewService.listAll());
}));

router.post('/', requireUser, asyncHandler(async (req, res) => {
  const { productId, rating, comment } = req.body || {};
  const pid = parseInt(productId, 10);
  if (isNaN(pid)) return res.status(400).json({ error: '상품 ID가 필요합니다.' });
  const result = await reviewService.create(req.session.userId, pid, parseInt(rating, 10), comment);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.status(201).json({ ok: true });
}));

router.delete('/:id', requireUser, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID' });
  const result = await reviewService.remove(id, req.session.userId, !!req.session?.isAdmin);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
}));

module.exports = router;
