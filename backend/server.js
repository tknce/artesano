// ==============================================
// server.js — Express 서버 진입점
//
// 실행 방법:
//   개발 중 (코드 저장 시 자동 재시작): npm run dev
//   배포 시 (그냥 실행):               npm start
// ==============================================

// 1) dotenv: .env 파일을 읽어 process.env 에 등록
//    반드시 다른 require 보다 먼저 실행해야 함
require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const multer    = require('multer');
const basicAuth = require('express-basic-auth');

// 라우터 파일 불러오기
const productsRouter     = require('./routes/products');
const inquiriesRouter    = require('./routes/inquiries');
const customOrdersRouter = require('./routes/custom-orders');

const app  = express();
const PORT = process.env.PORT || 3000; // .env 에 PORT 없으면 기본값 3000

// -----------------------------------------------
// 미들웨어 등록 (요청이 라우터에 닿기 전에 거치는 처리)
// -----------------------------------------------

// CORS: 브라우저에서 다른 출처(예: index.html)가 이 API를 호출할 수 있도록 허용
app.use(cors());

// JSON 파싱: req.body 를 JSON 으로 자동 파싱 (POST/PUT 요청에 필요)
app.use(express.json());

// -----------------------------------------------
// 라우터 연결
// -----------------------------------------------

// 관리자 페이지 Basic Auth
const adminAuth = basicAuth({
  users: { [process.env.ADMIN_USER || 'admin']: process.env.ADMIN_PASSWORD || 'changeme' },
  challenge: true,
  realm: 'CROCINI Admin',
});
app.use('/admin.html', adminAuth);

// 업로드된 이미지 정적 서빙: /uploads/xxx.jpg → backend/uploads/xxx.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 프론트엔드 정적 파일 서빙 (HTML/CSS/JS/이미지)
const FRONTEND_DIR = process.env.FRONTEND_DIR || path.join(__dirname, '..');
app.use(express.static(FRONTEND_DIR));

// /products 로 들어오는 요청은 products.js 라우터가 처리
app.use('/products',      productsRouter);
app.use('/inquiries',     inquiriesRouter);
app.use('/custom-orders', customOrdersRouter);

// 서버 헬스체크용 루트 엔드포인트
app.get('/', (req, res) => {
  res.json({ message: 'CROCINI API 서버 작동 중 ✓' });
});

// -----------------------------------------------
// 에러 핸들러 — multer 파일 크기/형식 오류를 클라이언트에 친절하게 전달
// -----------------------------------------------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '파일 크기는 10MB 이하여야 합니다.' });
    }
    return res.status(400).json({ error: `업로드 오류: ${err.message}` });
  }
  if (err && err.message && err.message.includes('이미지 파일만')) {
    return res.status(400).json({ error: err.message });
  }
  console.error('[server] 처리되지 않은 오류:', err);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

// -----------------------------------------------
// 서버 시작
// -----------------------------------------------
app.listen(PORT, () => {
  console.log(`✓ CROCINI 서버 실행 중: http://localhost:${PORT}`);
  console.log(`  상품 목록 확인: http://localhost:${PORT}/products`);
  console.log(`  관리자 페이지:   admin.html (브라우저로 직접 열기)`);
});
