const express = require('express');
const router  = express.Router();
const { requireUser, requireAdmin } = require('../middleware/auth');
const purchaseService = require('../services/purchase.service');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/check', requireUser, asyncHandler(async (req, res) => {
  const productId = parseInt(req.query.productId, 10);
  if (isNaN(productId)) return res.status(400).json({ error: '잘못된 상품 ID' });
  res.json({ purchased: await purchaseService.checkPurchased(req.session.userId, productId) });
}));

router.get('/', requireAdmin, asyncHandler(async (req, res) => {
  res.json(await purchaseService.listAll());
}));

router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const { email, productId, note } = req.body || {};
  const pid = parseInt(productId, 10);
  if (isNaN(pid)) return res.status(400).json({ error: '상품을 선택해주세요.' });
  const result = await purchaseService.create(email, pid, note);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.status(201).json({ ok: true });
}));

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID' });
  res.json(await purchaseService.remove(id));
}));

module.exports = router;
