const multer              = require('multer');
const path                = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary          = require('../lib/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          'crocini',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    resource_type:   'image',
    backup:          true, // 콘솔에서 실수로 삭제돼도 Backup 탭에서 복구 가능
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
