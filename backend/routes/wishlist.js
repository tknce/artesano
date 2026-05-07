const express = require('express');
const router  = express.Router();
const { requireUser } = require('../middleware/auth');
const wishlistService = require('../services/wishlist.service');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', requireUser, asyncHandler(async (req, res) => {
  res.json(await wishlistService.list(req.session.userId));
}));

router.get('/ids', requireUser, asyncHandler(async (req, res) => {
  res.json(await wishlistService.getIds(req.session.userId));
}));

router.post('/:productId', requireUser, asyncHandler(async (req, res) => {
  const productId = parseInt(req.params.productId, 10);
  if (isNaN(productId)) return res.status(400).json({ error: '잘못된 상품 ID' });
  const result = await wishlistService.add(req.session.userId, productId);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
}));

router.delete('/:productId', requireUser, asyncHandler(async (req, res) => {
  const productId = parseInt(req.params.productId, 10);
  if (isNaN(productId)) return res.status(400).json({ error: '잘못된 상품 ID' });
  res.json(await wishlistService.remove(req.session.userId, productId));
}));

module.exports = router;
