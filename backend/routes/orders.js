const express = require('express');
const router = express.Router();
const { requireUser, requireAdmin } = require('../middleware/auth');
const orderService = require('../services/order.service');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.post('/', requireUser, asyncHandler(async (req, res) => {
  const result = await orderService.createOrder(req.session.userId, req.body || {});
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
}));

router.post('/confirm', requireUser, asyncHandler(async (req, res) => {
  const result = await orderService.confirmPayment(req.session.userId, req.body || {});
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
}));

router.get('/mine', requireUser, asyncHandler(async (req, res) => {
  res.json(await orderService.listMine(req.session.userId));
}));

router.get('/', requireAdmin, asyncHandler(async (req, res) => {
  res.json(await orderService.listAll());
}));

router.put('/:id/status', requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const result = await orderService.updateStatus(id, req.body || {});
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
}));

router.post('/:id/cancel', requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const result = await orderService.cancelOrder(id, req.body?.reason);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
}));

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID' });
  res.json(await orderService.removeOrder(id));
}));

module.exports = router;
