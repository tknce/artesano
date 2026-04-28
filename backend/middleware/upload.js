// ==============================================
// middleware/upload.js — multer 이미지 업로드 설정
//
// - 저장 위치: backend/uploads/
// - 파일명: 타임스탬프 + 랜덤 + 원본 확장자 (충돌 방지)
// - 허용 확장자: jpg, jpeg, png, webp
// - 최대 크기: 10MB
// ==============================================

const multer = require('multer');
const path   = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext   = path.extname(file.originalname).toLowerCase();
    const stamp = Date.now();
    const rand  = crypto.randomBytes(6).toString('hex');
    cb(null, `${stamp}-${rand}${ext}`);
  },
});

const ALLOWED_EXT  = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.includes(ext) || !ALLOWED_MIME.includes(file.mimetype)) {
    return cb(new Error('이미지 파일만 업로드 가능합니다 (jpg, png, webp)'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = upload;
