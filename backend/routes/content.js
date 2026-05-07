const express = require('express');
const router  = express.Router();
const { requireAdmin } = require('../middleware/auth');
const contentService = require('../services/content.service');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', asyncHandler(async (req, res) => {
  res.json(await contentService.getAll());
}));

router.put('/:key', requireAdmin, asyncHandler(async (req, res) => {
  const result = await contentService.update(req.params.key, req.body?.content);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
}));

module.exports = router;
