const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { requireUser, requireAdmin } = require('../middleware/auth');
const orderService = require('../services/order.service');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// 결제 confirm 무차별 호출 방지 (사용자/IP별 1분 10회)
const confirmLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: '결제 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', requireUser, asyncHandler(async (req, res) => {
  const result = await orderService.createOrder(req.session.userId, req.body || {});
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
}));

router.post('/confirm', confirmLimiter, requireUser, asyncHandler(async (req, res) => {
  const result = await orderService.confirmPayment(req.session.userId, req.body || {});
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
}));

router.post('/abandon', requireUser, asyncHandler(async (req, res) => {
  const { orderId } = req.body || {};
  if (!orderId) return res.status(400).json({ error: 'orderId가 필요합니다.' });
  const result = await orderService.abandonOrder(req.session.userId, orderId);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
}));

router.get('/mine', requireUser, asyncHandler(async (req, res) => {
  res.json(await orderService.listMine(req.session.userId));
}));

// 사용자 본인 주문의 배송정보 수정 (출고 전까지)
router.put('/mine/:orderId/shipping', requireUser, asyncHandler(async (req, res) => {
  const result = await orderService.updateShippingInfo(req.session.userId, req.params.orderId, req.body || {});
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
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
