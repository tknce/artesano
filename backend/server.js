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
const bcrypt     = require('bcryptjs');

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
const webhooksRouter     = require('./routes/webhooks');
const contentRouter      = require('./routes/content');
const authRouter         = require('./routes/auth');
const userRouter         = require('./routes/user');
const cartRouter         = require('./routes/cart');
const couponsRouter      = require('./routes/coupons');
const adminUsersRouter   = require('./routes/admin-users');
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
      scriptSrc:  ["'self'", "'unsafe-inline'", 'https://js.tosspayments.com', 'https://cdn.jsdelivr.net', 'https://t1.daumcdn.net', 'https://www.googletagmanager.com'],
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
        'https://www.google-analytics.com',
        'https://*.google-analytics.com',
        'https://*.analytics.google.com',
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
// CSRF 보호 — mutating 요청은 같은 출처에서만 허용
// SameSite=lax 쿠키 + Origin/Referer 검증으로 cross-site form/fetch 차단
// -----------------------------------------------
function csrfGuard(req, res, next) {
  if (process.env.NODE_ENV === 'test') return next();
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  // 토스 등 외부에서 호출하는 callback은 webhook이 따로 없으므로 모두 자체 출처로 간주
  const raw = req.get('Origin') || req.get('Referer');
  if (!raw) return res.status(403).json({ error: 'Origin/Referer 누락 — 외부 출처에서 호출되었습니다.' });
  let originHost;
  try { originHost = new URL(raw).origin; } catch { return res.status(403).json({ error: 'Origin 형식 오류' }); }
  if (!ALLOWED_ORIGINS.has(originHost)) return res.status(403).json({ error: '허용되지 않은 출처입니다.' });
  next();
}
app.use(csrfGuard);

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
    sameSite: 'lax',
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
// 관리자 비밀번호 검증 — ADMIN_PASSWORD_HASH 우선, 없으면 평문 ADMIN_PASSWORD (legacy, 경고)
async function verifyAdminPassword(password) {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash) return bcrypt.compare(password, hash);
  const plain = process.env.ADMIN_PASSWORD;
  if (plain) return password === plain;
  return false;
}
if (!process.env.ADMIN_PASSWORD_HASH && process.env.ADMIN_PASSWORD) {
  console.warn('[admin] ADMIN_PASSWORD가 평문으로 저장되어 있습니다. ADMIN_PASSWORD_HASH(bcrypt)로 마이그레이션하세요.');
}

app.post('/api/admin/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  const userOk = username === (process.env.ADMIN_USER || 'admin');
  const passOk = password && await verifyAdminPassword(password);
  if (userOk && passOk) {
    req.session.isAdmin = true;
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: '아이디 또는 비밀번호가 틀렸습니다.' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// 이미지 마이그레이션 — 외부(artesano 등) URL → Cloudinary
// 멱등: 이미 res.cloudinary.com URL이면 건너뜀. 안전하게 여러 번 호출 가능.
app.post('/api/admin/migrate-images', requireAdmin, async (req, res, next) => {
  try {
    const pool = require('./db');
    const cloudinary = require('./lib/cloudinary');

    async function migrateTable(table) {
      const [rows] = await pool.query(
        `SELECT id, image_url FROM ${table}
         WHERE image_url IS NOT NULL AND image_url <> ''
           AND image_url NOT LIKE '%res.cloudinary.com%'
           AND (image_url LIKE 'http://%' OR image_url LIKE 'https://%')`
      );
      let ok = 0, fail = 0;
      const errors = [];
      for (const row of rows) {
        try {
          const result = await cloudinary.uploader.upload(row.image_url, {
            folder: 'crocini/migrated', resource_type: 'image',
          });
          await pool.query(`UPDATE ${table} SET image_url = ? WHERE id = ?`, [result.secure_url, row.id]);
          ok++;
        } catch (err) {
          fail++;
          errors.push({ id: row.id, error: err.message });
        }
      }
      return { total: rows.length, ok, fail, errors };
    }

    const products = await migrateTable('products');
    const details = await migrateTable('product_detail_images');
    res.json({ products, product_detail_images: details });
  } catch (e) { next(e); }
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

// 브라우저가 link 태그를 무시하고 자동 요청하는 /favicon.ico는 빈 204로 응답
// (catch-all로 404.html(HTML)이 내려가는 것 방지)
app.get('/favicon.ico', (req, res) => res.status(204).end());

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
const STATIC_PATHS = ['/', '/shop', '/story', '/contact', '/custom-order', '/privacy', '/terms'];

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
app.get('/admin-users.html',  redirectTo('/admin-users'));
app.get('/login.html',        redirectTo('/login'));
app.get('/register.html',     redirectTo('/register'));
app.get('/mypage.html',       redirectTo('/mypage'));
app.get('/checkout.html',         redirectTo('/checkout'));
app.get('/payment-success.html',  redirectTo('/payment-success'));
app.get('/payment-fail.html',     redirectTo('/payment-fail'));
app.get('/privacy.html',          redirectTo('/privacy'));
app.get('/terms.html',            redirectTo('/terms'));

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
  '/admin-users':  'admin-users.html',
  '/login':        'login.html',
  '/register':     'register.html',
  '/mypage':           'mypage.html',
  '/cart':             'cart.html',
  '/checkout':         'checkout.html',
  '/payment-success':  'payment-success.html',
  '/payment-fail':     'payment-fail.html',
  '/privacy':          'privacy.html',
  '/terms':            'terms.html',
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
app.use('/api/webhooks', webhooksRouter);
app.use('/api/content', contentRouter);
app.use('/api/admin/users', requireAdmin, adminUsersRouter);

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
      req.path.startsWith('/api/orders') ||
      req.path.startsWith('/api/admin/')) {
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

      const { cleanupAbandonedOrders } = require('./services/order.service');
      cron.schedule('*/10 * * * *', () => {
        cleanupAbandonedOrders()
          .then(n => { if (n > 0) logger.info({ cleaned: n }, '버려진 pending 주문 정리'); })
          .catch(err => logger.error({ err }, 'pending 주문 정리 실패'));
      });
      logger.info('Pending 주문 정리: 매 10분마다 (30분 초과분 삭제 + 재고 복구)');

      const { scanBrokenImages } = require('./lib/imageHealth');
      cron.schedule('0 9 * * *', () => {
        scanBrokenImages().catch(err => logger.error({ err }, '이미지 점검 실패'));
      }, { timezone: 'Asia/Seoul' });
      logger.info('이미지 점검: 매일 09:00 KST (404 발견 시 메일 알림)');
    })
    .catch(err => {
      logger.fatal({ err }, 'DB 마이그레이션 실패');
      process.exit(1);
    });
}

module.exports = app;
