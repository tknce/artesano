const express = require('express');
const router = express.Router();
const { requireUser } = require('../middleware/auth');
const pool = require('../db');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/inquiries', requireUser, asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT id, name, email, message, created_at FROM inquiries WHERE user_id = ? ORDER BY created_at DESC', [req.session.userId]);
  res.json(rows);
}));

router.get('/custom-orders', requireUser, asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`SELECT co.id, co.product_code, co.leather_color, co.hardware, co.budget_range, co.message, co.created_at, p.name AS product_name FROM custom_orders co LEFT JOIN products p ON co.product_id = p.id WHERE co.user_id = ? ORDER BY co.created_at DESC`, [req.session.userId]);
  res.json(rows);
}));

module.exports = router;
