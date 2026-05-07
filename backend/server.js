require('dotenv').config();

if (!process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const multer     = require('multer');
const cloudinary = require('./lib/cloudinary');
const session    = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');

const cron       = require('node-cron');
const logger     = require('./lib/logger');

const productsRouter     = require('./routes/products');
const inquiriesRouter    = require('./routes/inquiries');
const customOrdersRouter = require('./routes/custom-orders');
const categoriesRouter   = require('./routes/categories');
const wishlistRouter     = require('./routes/wishlist');
const reviewsRouter      = require('./routes/reviews');
const purchasesRouter    = require('./routes/purchases');
const ordersRouter       = require('./routes/orders');
const contentRouter      = require('./routes/content');
const authRouter         = require('./routes/auth');
const userRouter         = require('./routes/user');
const cartRouter         = require('./routes/cart');
const couponsRouter      = require('./routes/coupons');
const migrate            = require('./migrate');
const { sendBackup }     = require('./lib/backup');

const app  = express();
const PORT = process.env.PORT || 3000;

// Railway 등 리버스 프록시 뒤에서 클라이언트 IP를 올바르게 인식
app.set('trust proxy', 1);

// -----------------------------------------------
// 보안 헤더 (helmet)
// -----------------------------------------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", 'https://js.tosspayments.com', 'https://cdn.jsdelivr.net', 'https://t1.daumcdn.net'],
      styleSrc:   ["'self'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net', 'data:'],
      imgSrc:     ["'self'", 'data:', 'blob:', 'https:', 'http:'],
      connectSrc: [
        "'self'",
        'https://*.tosspayments.com',
        'https://api.tosspayments.com',
        'https://event.tosspayments.com',
        'https://log.tosspayments.com',
        'https://payment-widget.tosspayments.com',
      ],
      frameSrc:   [
        'https://*.tosspayments.com',
        'https://toss.im',
        'https://*.toss.im',
        'https://postcode.map.daum.net',
        'https://postcode.map.kakao.com',
      ],
      objectSrc:  ["'none'"],
      baseUri:    ["'self'"],
      formAction: ["'self'"],
    },
  },
}));

// -----------------------------------------------
// CORS — 허용된 출처만 API 접근 가능
// -----------------------------------------------
const ALLOWED_ORIGINS = new Set([
  'https://www.crocini.co.kr',
  'https://crocini.co.kr',
  'http://localhost:3000',
]);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.has(origin)) return cb(null, true);
    cb(new Error('허용되지 않은 출처입니다.'));
  },
  credentials: true,
}));

app.use(express.json());

// -----------------------------------------------
// 세션
// -----------------------------------------------
const sessionStore = new MySQLStore({
  host:                    process.env.DB_HOST,
  port:                    parseInt(process.env.DB_PORT || '3306', 10),
  user:                    process.env.DB_USER,
  password:                process.env.DB_PASSWORD,
  database:                process.env.DB_NAME,
  clearExpired:            true,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration:              8 * 60 * 60 * 1000,
  createDatabaseTable:     true,
});

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production',
  },
}));

// -----------------------------------------------
// 관리자 인증 미들웨어
// -----------------------------------------------
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.status(401).json({ error: '로그인이 필요합니다.' });
}

// -----------------------------------------------
// 로그인 브루트포스 방지 (15분에 최대 10회)
// -----------------------------------------------
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: '너무 많은 로그인 시도입니다. 15분 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// -----------------------------------------------
// 관리자 인증 API
// -----------------------------------------------
app.post('/api/admin/login', loginLimiter, (req, res) => {
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
const FRONTEND_DIR = process.env.FRONTEND_DIR || path.join(__dirname, '..', 'frontend');

// -----------------------------------------------
// 페이지 렌더 — partials/nav.html, partials/footer.html 토큰 치환
// 시작 시 partials와 페이지를 메모리에 캐시. 페이지 변경 시 서버 재시작 필요.
// -----------------------------------------------
const NAV    = fs.readFileSync(path.join(FRONTEND_DIR, 'partials/nav.html'),    'utf8');
const FOOTER = fs.readFileSync(path.join(FRONTEND_DIR, 'partials/footer.html'), 'utf8');
const pageCache = {};
function renderPage(file) {
  return (req, res) => {
    let html = pageCache[file];
    if (!html) {
      html = fs.readFileSync(path.join(FRONTEND_DIR, file), 'utf8')
        .replace('<!--#NAV#-->',    NAV)
        .replace('<!--#FOOTER#-->', FOOTER);
      pageCache[file] = html;
    }
    res.type('html').send(html);
  };
}

// -----------------------------------------------
// SEO — sitemap.xml (정적 페이지 + DB 상품)
// -----------------------------------------------
const SITE_URL = process.env.SITE_URL || 'https://www.crocini.co.kr';
const STATIC_PATHS = ['/', '/shop', '/story', '/contact', '/custom-order'];

app.get('/sitemap.xml', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  let productUrls = '';
  try {
    const pool = require('./db');
    const [rows] = await pool.query('SELECT id FROM products');
    productUrls = rows.map(r =>
      `  <url><loc>${SITE_URL}/product?id=${r.id}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq></url>`
    ).join('\n');
  } catch (err) {
    console.error('[sitemap] DB 조회 실패:', err.message);
  }
  const staticUrls = STATIC_PATHS.map(p =>
    `  <url><loc>${SITE_URL}${p}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${p === '/' ? '1.0' : '0.8'}</priority></url>`
  ).join('\n');
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticUrls}\n${productUrls}\n</urlset>`
  );
});

// -----------------------------------------------
// .html → 클린 URL 301 리다이렉트
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
app.get('/contact.html',      redirectTo('/contact'));
app.get('/custom-order.html', redirectTo('/custom-order'));
app.get('/product.html',      redirectTo('/product'));
app.get('/admin.html',        redirectTo('/admin'));
app.get('/admin-login.html',  redirectTo('/admin-login'));
app.get('/login.html',        redirectTo('/login'));
app.get('/register.html',     redirectTo('/register'));
app.get('/mypage.html',       redirectTo('/mypage'));
app.get('/checkout.html',         redirectTo('/checkout'));
app.get('/payment-success.html',  redirectTo('/payment-success'));
app.get('/payment-fail.html',     redirectTo('/payment-fail'));

// 사라진 카테고리 페이지 — /shop으로 301 (외부 색인 보존)
['/crocodile', '/ostrich', '/python', '/crocodile.html', '/ostrich.html', '/python.html']
  .forEach(p => app.get(p, (req, res) => res.redirect(301, '/shop')));

// 클린 URL → HTML 파일 렌더 (nav/footer 토큰 치환)
const PAGES = {
  '/':             'index.html',
  '/shop':         'shop.html',
  '/story':        'story.html',
  '/contact':      'contact.html',
  '/custom-order': 'custom-order.html',
  '/product':      'product.html',
  '/admin':        'admin.html',
  '/admin-login':  'admin-login.html',
  '/login':        'login.html',
  '/register':     'register.html',
  '/mypage':           'mypage.html',
  '/cart':             'cart.html',
  '/checkout':         'checkout.html',
  '/payment-success':  'payment-success.html',
  '/payment-fail':     'payment-fail.html',
};
Object.entries(PAGES).forEach(([url, file]) => {
  app.get(url, renderPage(file));
});

// 프론트엔드 정적 파일 서빙
app.use(express.static(FRONTEND_DIR));

// -----------------------------------------------
// API 라우터 (인증 적용)
// -----------------------------------------------
app.use('/products', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) return requireAdmin(req, res, next);
  next();
}, productsRouter);

app.use('/inquiries', (req, res, next) => {
  if (req.method === 'GET' || req.method === 'DELETE') return requireAdmin(req, res, next);
  next();
}, inquiriesRouter);

app.use('/custom-orders', (req, res, next) => {
  if (req.method === 'GET' || req.method === 'DELETE') return requireAdmin(req, res, next);
  next();
}, customOrdersRouter);

app.use('/categories', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) return requireAdmin(req, res, next);
  next();
}, categoriesRouter);

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/cart', cartRouter);
app.use('/api/coupons', couponsRouter);
app.use('/reviews', reviewsRouter);
app.use('/purchases', purchasesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/content', contentRouter);

// -----------------------------------------------
// 404 — 매칭되지 않은 경로 (API는 JSON, 그 외는 HTML)
// -----------------------------------------------
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') ||
      req.path.startsWith('/products') ||
      req.path.startsWith('/inquiries') ||
      req.path.startsWith('/custom-orders') ||
      req.path.startsWith('/categories') ||
      req.path.startsWith('/reviews') ||
      req.path.startsWith('/purchases') ||
      req.path.startsWith('/api/orders')) {
    return res.status(404).json({ error: '요청하신 리소스를 찾을 수 없습니다.' });
  }
  res.status(404).sendFile(path.join(FRONTEND_DIR, '404.html'));
});

// -----------------------------------------------
// 글로벌 에러 핸들러
// -----------------------------------------------
const { errorHandler } = require('./middleware/error');
app.use(errorHandler);

// -----------------------------------------------
// 서버 시작 (마이그레이션 후)
// -----------------------------------------------
// -----------------------------------------------
// 서버 시작 (마이그레이션 후) — 테스트 시에는 listen 안 함
// -----------------------------------------------
if (require.main === module) {
  migrate()
    .then(() => {
      app.listen(PORT, () => {
        logger.info({ port: PORT }, 'CROCINI 서버 실행 중');
      });
      cron.schedule('0 3 * * *', () => {
        sendBackup().catch(err => logger.error({ err }, 'DB 백업 실패'));
      }, { timezone: 'Asia/Seoul' });
      logger.info('DB 백업: 매일 03:00 KST 자동 발송');
    })
    .catch(err => {
      logger.fatal({ err }, 'DB 마이그레이션 실패');
      process.exit(1);
    });
}

module.exports = app;
