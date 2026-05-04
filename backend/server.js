require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const session = require('express-session');

const productsRouter     = require('./routes/products');
const inquiriesRouter    = require('./routes/inquiries');
const customOrdersRouter = require('./routes/custom-orders');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'crocini-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'strict', maxAge: 8 * 60 * 60 * 1000 },
}));

// -----------------------------------------------
// 관리자 인증 미들웨어
// -----------------------------------------------
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.status(401).json({ error: '로그인이 필요합니다.' });
}

// -----------------------------------------------
// 관리자 인증 API
// -----------------------------------------------
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (
    username === (process.env.ADMIN_USER || 'admin') &&
    password === process.env.ADMIN_PASSWORD
  ) {
    req.session.isAdmin = true;
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: '아이디 또는 비밀번호가 틀렸습니다.' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/admin/check', (req, res) => {
  if (req.session && req.session.isAdmin) res.json({ ok: true });
  else res.status(401).json({ error: 'Unauthorized' });
});

// -----------------------------------------------
// 업로드 이미지 정적 서빙
// -----------------------------------------------
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const FRONTEND_DIR = process.env.FRONTEND_DIR || path.join(__dirname, '..');

// -----------------------------------------------
// .html → 클린 URL 301 리다이렉트 (express.static 보다 먼저 등록)
// -----------------------------------------------
function redirectTo(cleanUrl) {
  return (req, res) => {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.redirect(301, cleanUrl + qs);
  };
}
app.get('/index.html',        redirectTo('/'));
app.get('/shop.html',         redirectTo('/shop'));
app.get('/story.html',        redirectTo('/story'));
app.get('/custom-order.html', redirectTo('/custom-order'));
app.get('/product.html',      redirectTo('/product'));
app.get('/crocodile.html',    redirectTo('/crocodile'));
app.get('/ostrich.html',      redirectTo('/ostrich'));
app.get('/python.html',       redirectTo('/python'));
app.get('/admin.html',        redirectTo('/admin'));
app.get('/admin-login.html',  redirectTo('/admin-login'));

// 클린 URL → HTML 파일 서빙
const PAGES = {
  '/shop':         'shop.html',
  '/story':        'story.html',
  '/custom-order': 'custom-order.html',
  '/product':      'product.html',
  '/crocodile':    'crocodile.html',
  '/ostrich':      'ostrich.html',
  '/python':       'python.html',
  '/admin':        'admin.html',
  '/admin-login':  'admin-login.html',
};
Object.entries(PAGES).forEach(([url, file]) => {
  app.get(url, (req, res) => res.sendFile(path.join(FRONTEND_DIR, file)));
});

// 프론트엔드 정적 파일 서빙 (CSS, JS, 이미지 등)
app.use(express.static(FRONTEND_DIR));

// -----------------------------------------------
// API 라우터 (인증 적용)
// -----------------------------------------------

// 상품 — GET은 공개, POST/PUT/DELETE는 관리자 전용
app.use('/products', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) return requireAdmin(req, res, next);
  next();
}, productsRouter);

// 문의 — POST(접수)는 공개, GET(목록)/DELETE는 관리자 전용
app.use('/inquiries', (req, res, next) => {
  if (req.method === 'GET' || req.method === 'DELETE') return requireAdmin(req, res, next);
  next();
}, inquiriesRouter);

// 주문제작 — POST(접수)는 공개, GET(목록)/DELETE는 관리자 전용
app.use('/custom-orders', (req, res, next) => {
  if (req.method === 'GET' || req.method === 'DELETE') return requireAdmin(req, res, next);
  next();
}, customOrdersRouter);

// -----------------------------------------------
// 에러 핸들러
// -----------------------------------------------
app.use((err, req, res, next) => {
  if (req.file) fs.unlink(req.file.path, () => {});
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: '파일 크기는 10MB 이하여야 합니다.' });
    return res.status(400).json({ error: `업로드 오류: ${err.message}` });
  }
  if (err?.message?.includes('이미지 파일만')) {
    return res.status(400).json({ error: err.message });
  }
  console.error(`[${req.method} ${req.path}] 오류:`, err.message);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

// -----------------------------------------------
// 서버 시작
// -----------------------------------------------
app.listen(PORT, () => {
  console.log(`✓ CROCINI 서버 실행 중: http://localhost:${PORT}`);
  console.log(`  관리자 로그인: http://localhost:${PORT}/admin-login`);
});
