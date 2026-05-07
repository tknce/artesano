// middleware/error.js — 글로벌 에러 핸들링
const multer = require('multer');

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

function errorHandler(err, req, res, next) {
  // 업로드 중 에러 시 Cloudinary 파일 정리
  if (req.file?.filename) {
    const cloudinary = require('../lib/cloudinary');
    cloudinary.uploader.destroy(req.file.filename).catch(() => {});
  }

  // Multer 에러
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? '파일 크기는 10MB 이하여야 합니다.'
      : `업로드 오류: ${err.message}`;
    return res.status(400).json({ error: msg });
  }

  // 알려진 운영 에러
  if (err.isOperational) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // 입력 검증 에러 (zod)
  if (err.name === 'ZodError') {
    const messages = err.errors.map(e => e.message);
    return res.status(400).json({ error: messages[0], details: messages });
  }

  // 알려진 메시지 패턴
  if (err?.message?.includes('이미지 파일만')) return res.status(400).json({ error: err.message });
  if (err?.message === '허용되지 않은 출처입니다.') return res.status(403).json({ error: err.message });

  // 예상치 못한 에러
  const logger = require('../lib/logger');
  logger.error({ err, method: req.method, path: req.path }, '처리되지 않은 에러');
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
}

module.exports = { AppError, errorHandler };
