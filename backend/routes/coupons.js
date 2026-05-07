const express = require('express');
const router = express.Router();
const { requireUser, requireAdmin } = require('../middleware/auth');
const couponService = require('../services/coupon.service');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// 고객: 쿠폰 유효성 검증
router.post('/validate', requireUser, asyncHandler(async (req, res) => {
  const { code, orderAmount } = req.body;
  if (!code) return res.status(400).json({ error: '쿠폰 코드를 입력해주세요' });
  const result = await couponService.validate(code.trim().toUpperCase(), orderAmount || 0);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
}));

// 관리자: 쿠폰 생성
router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const result = await couponService.create(req.body);
  res.status(201).json(result);
}));

// 관리자: 쿠폰 목록
router.get('/', requireAdmin, asyncHandler(async (req, res) => {
  res.json(await couponService.list());
}));

module.exports = router;
