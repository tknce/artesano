const express = require('express');
const router = express.Router();
const { requireUser } = require('../middleware/auth');
const cartService = require('../services/cart.service');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', requireUser, asyncHandler(async (req, res) => {
  res.json(await cartService.list(req.session.userId));
}));

router.get('/count', requireUser, asyncHandler(async (req, res) => {
  res.json({ count: await cartService.count(req.session.userId) });
}));

router.post('/', requireUser, asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId) return res.status(400).json({ error: '상품 ID가 필요합니다' });
  res.json(await cartService.add(req.session.userId, productId, quantity || 1));
}));

router.put('/:productId', requireUser, asyncHandler(async (req, res) => {
  const productId = parseInt(req.params.productId, 10);
  const { quantity } = req.body;
  if (isNaN(productId) || !quantity) return res.status(400).json({ error: '잘못된 요청' });
  res.json(await cartService.updateQuantity(req.session.userId, productId, quantity));
}));

router.delete('/:productId', requireUser, asyncHandler(async (req, res) => {
  const productId = parseInt(req.params.productId, 10);
  if (isNaN(productId)) return res.status(400).json({ error: '잘못된 상품 ID' });
  res.json(await cartService.remove(req.session.userId, productId));
}));

router.delete('/', requireUser, asyncHandler(async (req, res) => {
  res.json(await cartService.clear(req.session.userId));
}));

module.exports = router;
