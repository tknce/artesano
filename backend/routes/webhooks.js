const express = require('express');
const router = express.Router();
const orderService = require('../services/order.service');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// 토스페이먼츠 웹훅 — PAYMENT_STATUS_CHANGED 이벤트 수신.
// 브라우저 redirect로 confirm이 호출되지 않은 경우(사용자 이탈)에도 결제 상태를 동기화한다.
// 토스 웹훅은 기본 서명이 없으므로 멱등 처리로 안전성 확보. 운영 단계에서는 IP 화이트리스트 권장.
router.post('/toss', asyncHandler(async (req, res) => {
  const result = await orderService.handleTossWebhook(req.body || {});
  // 토스 재시도 방지를 위해 4xx는 잘못된 요청에만, 나머지는 항상 200
  if (result.error && result.status === 400) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
}));

module.exports = router;
