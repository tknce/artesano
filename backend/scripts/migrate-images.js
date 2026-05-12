// ============================================================
// migrate-images.js — 외부(artesano.co.kr 등) 이미지를 Cloudinary로 이전
//
// 실행:
//   cd backend && node scripts/migrate-images.js
//
// 동작:
//   1) products.image_url 중 artesano.co.kr 또는 비-Cloudinary 외부 URL을 수집
//   2) Cloudinary에 업로드 (folder: crocini/migrated)
//   3) DB의 image_url을 새 secure_url로 갱신
//   4) product_detail_images에도 동일 처리
//
// 멱등: 이미 res.cloudinary.com URL이면 건드리지 않음.
// 실패 시 해당 행은 원본 URL을 유지 (이미 1회 실패한 항목은 다음 실행에서 재시도).
// ============================================================
require('dotenv').config();
const pool = require('../db');
const cloudinary = require('../lib/cloudinary');

async function uploadOne(url) {
  const result = await cloudinary.uploader.upload(url, {
    folder: 'crocini/migrated',
    resource_type: 'image',
  });
  return result.secure_url;
}

async function migrateTable(table, idCol = 'id') {
  const [rows] = await pool.query(
    `SELECT ${idCol} AS id, image_url FROM ${table}
     WHERE image_url IS NOT NULL
       AND image_url <> ''
       AND image_url NOT LIKE '%res.cloudinary.com%'
       AND (image_url LIKE 'http://%' OR image_url LIKE 'https://%')`
  );
  console.log(`[${table}] ${rows.length}건 이전 대상`);

  let ok = 0, fail = 0;
  for (const row of rows) {
    try {
      const newUrl = await uploadOne(row.image_url);
      await pool.query(`UPDATE ${table} SET image_url = ? WHERE ${idCol} = ?`, [newUrl, row.id]);
      ok++;
      console.log(`  ✓ ${table}#${row.id}`);
    } catch (err) {
      fail++;
      console.error(`  ✗ ${table}#${row.id} — ${err.message}`);
    }
  }
  console.log(`[${table}] 완료 — 성공 ${ok}, 실패 ${fail}`);
  return { ok, fail };
}

async function main() {
  const start = Date.now();
  console.log('이미지 마이그레이션 시작...');
  const a = await migrateTable('products');
  const b = await migrateTable('product_detail_images');
  console.log(`\n총 ${(Date.now() - start) / 1000}초 — 성공 ${a.ok + b.ok}, 실패 ${a.fail + b.fail}`);
  process.exit(a.fail + b.fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('치명적 오류:', err);
  process.exit(2);
});
