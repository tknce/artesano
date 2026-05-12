// ============================================================
// routes/admin-users.js — 관리자 회원 관리 API
//   GET    /api/admin/users           목록 (?search, ?page, ?limit)
//   GET    /api/admin/users/:id       상세 (주문이력 포함)
//   PATCH  /api/admin/users/:id/block 차단 토글 ({ blocked: boolean })
//   DELETE /api/admin/users/:id       탈퇴 처리
//   POST   /api/admin/users/:id/reset-password  임시 PW 발급
// ※ requireAdmin은 server.js에서 라우터 마운트 시 적용
// ============================================================
const express = require('express');
const router = express.Router();
const svc = require('../services/user-admin.service');

router.get('/', async (req, res, next) => {
  try {
    const result = await svc.list({
      search: req.query.search || '',
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 20,
    });
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await svc.detail(req.params.id);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result);
  } catch (e) { next(e); }
});

router.patch('/:id/block', async (req, res, next) => {
  try {
    const result = await svc.setBlocked(req.params.id, !!req.body.blocked);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await svc.remove(req.params.id);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/:id/reset-password', async (req, res, next) => {
  try {
    const result = await svc.resetPassword(req.params.id);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result);
  } catch (e) { next(e); }
});

module.exports = router;
