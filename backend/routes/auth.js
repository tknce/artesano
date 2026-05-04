const express    = require('express');
const bcrypt     = require('bcryptjs');
const rateLimit  = require('express-rate-limit');
const router     = express.Router();
const pool       = require('../db');

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: '너무 많은 로그인 시도입니다. 15분 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: '너무 많은 가입 시도입니다. 1시간 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/register
router.post('/register', registerLimiter, asyncHandler(async (req, res) => {
  const { email, password, name, phone } = req.body || {};

  if (!email?.trim())    return res.status(400).json({ error: '이메일을 입력해주세요.' });
  if (!password)         return res.status(400).json({ error: '비밀번호를 입력해주세요.' });
  if (!name?.trim())     return res.status(400).json({ error: '이름을 입력해주세요.' });
  if (!EMAIL_RE.test(email.trim())) return res.status(400).json({ error: '올바른 이메일 형식이 아닙니다.' });
  if (password.length < 8)          return res.status(400).json({ error: '비밀번호는 8자 이상이어야 합니다.' });
  if (name.trim().length > 100)     return res.status(400).json({ error: '이름은 100자 이내로 입력해주세요.' });

  const normalizedEmail = email.trim().toLowerCase();
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
  if (existing.length > 0) return res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });

  const hash = await bcrypt.hash(password, 12);
  const trimmedPhone = phone?.trim() || null;
  const [result] = await pool.query(
    'INSERT INTO users (email, password_hash, name, phone) VALUES (?, ?, ?, ?)',
    [normalizedEmail, hash, name.trim(), trimmedPhone]
  );

  req.session.userId    = result.insertId;
  req.session.userName  = name.trim();
  req.session.userEmail = normalizedEmail;
  req.session.userPhone = trimmedPhone;
  res.status(201).json({ ok: true, name: name.trim() });
}));

// POST /api/auth/login
router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  if (!email?.trim() || !password)
    return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  if (rows.length === 0)
    return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });

  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });

  req.session.userId    = user.id;
  req.session.userName  = user.name;
  req.session.userEmail = user.email;
  req.session.userPhone = user.phone ?? null;
  res.json({ ok: true, name: user.name });
}));

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /api/auth/me
router.get('/me', asyncHandler(async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Unauthorized' });

  // 이전 세션에 email/phone이 없으면 DB에서 보완
  if (!req.session.userEmail) {
    const [rows] = await pool.query('SELECT email, phone FROM users WHERE id = ?', [req.session.userId]);
    if (rows.length > 0) {
      req.session.userEmail = rows[0].email;
      req.session.userPhone = rows[0].phone ?? null;
    }
  }

  res.json({
    id:    req.session.userId,
    name:  req.session.userName,
    email: req.session.userEmail ?? null,
    phone: req.session.userPhone ?? null,
  });
}));

module.exports = router;
