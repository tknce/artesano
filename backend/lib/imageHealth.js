// ============================================================
// imageHealth.js — 모든 상품 이미지 URL을 HEAD로 점검
//
// 매일 1회 cron 실행 — 404 응답을 모아 관리자에게 메일 발송.
// Cloudinary 콘솔에서 누군가 파일을 직접 삭제했을 때 즉시 감지.
// ============================================================
const pool = require('../db');
const { sendBrokenImagesNotification } = require('./mailer');
const logger = require('./logger');

async function head(url) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return r.status;
  } catch {
    return 0;
  }
}

async function scanBrokenImages() {
  const broken = [];

  const [products] = await pool.query("SELECT id, name, image_url FROM products WHERE image_url IS NOT NULL AND image_url <> ''");
  for (const p of products) {
    const status = await head(p.image_url);
    if (status === 404) broken.push({ kind: '상품', id: p.id, name: p.name, url: p.image_url });
  }

  const [details] = await pool.query("SELECT id, product_id, image_url FROM product_detail_images WHERE image_url IS NOT NULL AND image_url <> ''");
  for (const d of details) {
    const status = await head(d.image_url);
    if (status === 404) broken.push({ kind: '상세이미지', id: d.id, name: `상품 #${d.product_id}`, url: d.image_url });
  }

  if (broken.length > 0) {
    logger.warn({ count: broken.length }, '깨진 이미지 발견');
    sendBrokenImagesNotification(broken);
  } else {
    logger.info('이미지 점검 완료 — 모든 이미지 정상');
  }

  return broken;
}

module.exports = { scanBrokenImages };
