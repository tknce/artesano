const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { requireUser } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const authService = require('../services/auth.service');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: '너무 많은 로그인 시도입니다. 15분 후 다시 시도해주세요.' }, standardHeaders: true, legacyHeaders: false });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: { error: '너무 많은 가입 시도입니다. 1시간 후 다시 시도해주세요.' }, standardHeaders: true, legacyHeaders: false });

router.post('/register', registerLimiter, validate(schemas.register), asyncHandler(async (req, res) => {
  const result = await authService.register(req.validated);
  if (result.error) return res.status(result.status).json({ error: result.error });
  req.session.userId = result.id;
  req.session.userName = result.name;
  req.session.userEmail = result.email;
  req.session.userPhone = result.phone;
  res.status(201).json({ ok: true, name: result.name });
}));

router.post('/login', loginLimiter, validate(schemas.login), asyncHandler(async (req, res) => {
  const result = await authService.login(req.validated);
  if (result.error) return res.status(result.status).json({ error: result.error });
  const { user } = result;
  req.session.userId = user.id;
  req.session.userName = user.name;
  req.session.userEmail = user.email;
  req.session.userPhone = user.phone ?? null;
  res.json({ ok: true, name: user.name });
}));

router.post('/logout', (req, res) => { req.session.destroy(() => res.json({ ok: true })); });

router.delete('/me', requireUser, asyncHandler(async (req, res) => {
  const ok = await authService.deleteAccount(req.session.userId);
  if (!ok) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  req.session.destroy(() => res.json({ ok: true }));
}));

router.get('/me', requireUser, asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(user);
}));

router.patch('/me', requireUser, asyncHandler(async (req, res) => {
  const result = await authService.updateMe(req.session.userId, req.body || {});
  if (result.error) return res.status(result.status).json({ error: result.error });
  req.session.userName = result.user.name;
  req.session.userEmail = result.user.email;
  req.session.userPhone = result.user.phone;
  res.json(result.user);
}));

// --- 카카오 간편 로그인 ---

// GET /api/auth/kakao — 카카오 로그인 페이지로 리다이렉트
router.get('/kakao', (req, res) => {
  res.redirect(authService.getKakaoAuthUrl());
});

// GET /api/auth/kakao/callback — 카카오 인가 코드 처리
router.get('/kakao/callback', asyncHandler(async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect('/login?error=kakao_failed');
  const result = await authService.kakaoCallback(code);
  if (result.error) return res.redirect('/login?error=kakao_failed');
  const { user } = result;
  req.session.userId = user.id;
  req.session.userName = user.name;
  req.session.userEmail = user.email;
  req.session.userPhone = user.phone ?? null;
  res.redirect('/');
}));

// --- 네이버 간편 로그인 ---

router.get('/naver', (req, res) => {
  res.redirect(authService.getNaverAuthUrl());
});

router.get('/naver/callback', asyncHandler(async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.redirect('/login?error=naver_failed');
  const result = await authService.naverCallback(code, state);
  if (result.error) return res.redirect('/login?error=naver_failed');
  const { user } = result;
  req.session.userId = user.id;
  req.session.userName = user.name;
  req.session.userEmail = user.email;
  req.session.userPhone = user.phone ?? null;
  res.redirect('/');
}));

module.exports = router;
