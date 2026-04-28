// seed.js — 상품 데이터를 DB에 올바른 인코딩으로 삽입
// 실행: node seed.js
require('dotenv').config();
const pool = require('./db');

const products = [
  // CROCODILE
  { name: 'M905 — Black', category: 'crocodile', option_desc: '1마리/스트랩겸용', price: 513000,  original_price: 855000,  image_url: 'https://artesano.co.kr/web/product/medium/20191220/efb92fa1d8d73b6310b7f87ba35ffc5c.jpg', is_custom_order: 0, badge: null },
  { name: 'M905 — Pink',  category: 'crocodile', option_desc: '1마리/스트랩겸용', price: 513000,  original_price: 855000,  image_url: 'https://artesano.co.kr/web/product/medium/20191220/cfa3b31138a23e2c509da2c29188c91d.jpg', is_custom_order: 0, badge: null },
  { name: 'M907 — Black', category: 'crocodile', option_desc: '1마리/주문제작',   price: 750000,  original_price: 1250000, image_url: 'https://artesano.co.kr/web/product/medium/20191220/d23558304b8bf6b67f2b4d467c7959d2.jpg', is_custom_order: 1, badge: '주문제작' },
  { name: 'M907 — Red',   category: 'crocodile', option_desc: '1마리/주문제작',   price: 750000,  original_price: 1250000, image_url: 'https://artesano.co.kr/web/product/medium/20191220/f8ce64913435fecbfd6e5473138b0e69.jpg', is_custom_order: 1, badge: '주문제작' },
  { name: 'M157 — Black', category: 'crocodile', option_desc: '악어+소가죽',      price: 174000,  original_price: 500000,  image_url: 'https://artesano.co.kr/web/product/medium/20191220/447df906538dfc0813e5208c097809d1.jpg', is_custom_order: 0, badge: null },
  { name: 'M157 — Beige', category: 'crocodile', option_desc: '악어+소가죽',      price: 174000,  original_price: 500000,  image_url: 'https://artesano.co.kr/web/product/medium/20191220/088638905d5bd5812f0838a457f8a4d7.jpg', is_custom_order: 0, badge: null },
  { name: 'M127 — 2마리/34cm', category: 'crocodile', option_desc: '주문제작',   price: 1440000, original_price: 2900000, image_url: 'https://artesano.co.kr/web/product/medium/20191220/39dcbad3690d42e9933134a6f616fea9.jpg', is_custom_order: 1, badge: '주문제작' },
  { name: 'M126 — 2마리/31cm', category: 'crocodile', option_desc: '스트랩겸용/주문제작', price: 1440000, original_price: 2700000, image_url: 'https://artesano.co.kr/web/product/medium/202406/b1d6e5bc7e9b9c901bcd3d37a14341ea.jpg', is_custom_order: 1, badge: '주문제작' },
  { name: 'M128 — 3마리반/40cm', category: 'crocodile', option_desc: '주문제작', price: 2280000, original_price: 4300000, image_url: 'https://artesano.co.kr/web/product/medium/20191216/72b2a55fd3456f1616c9046c643b7514.jpg', is_custom_order: 1, badge: '주문제작' },
  { name: 'CR127 — Black', category: 'crocodile', option_desc: '35cm/시그니처',  price: 4500000, original_price: null,    image_url: 'https://artesano.co.kr/web/product/medium/20191216/1333b307a304a130ead1e22af13425b9.jpg', is_custom_order: 0, badge: 'SIGNATURE' },
  // OSTRICH
  { name: 'OR127 — Red',   category: 'ostrich', option_desc: '타조가죽',         price: 1740000, original_price: null, image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80', is_custom_order: 0, badge: null },
  { name: 'OR127 — Blue',  category: 'ostrich', option_desc: '타조가죽',         price: 1740000, original_price: null, image_url: 'https://images.unsplash.com/photo-1591348122449-02525d70379b?auto=format&fit=crop&w=900&q=80', is_custom_order: 0, badge: null },
  { name: 'OR128 — Green', category: 'ostrich', option_desc: '타조가죽/주문제작', price: 2400000, original_price: null, image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=80', is_custom_order: 1, badge: '주문제작' },
  // PYTHON
  { name: 'PT001 — 파이톤 클러치',   category: 'python', option_desc: '파이톤/주문제작', price: null, original_price: null, image_url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=80', is_custom_order: 1, badge: 'MADE TO ORDER' },
  { name: 'PT002 — 파이톤 미디엄 백', category: 'python', option_desc: '파이톤/주문제작', price: null, original_price: null, image_url: 'https://images.unsplash.com/photo-1473221326025-9183b464bb7e?auto=format&fit=crop&w=900&q=80', is_custom_order: 1, badge: 'MADE TO ORDER' },
  { name: 'PT003 — 파이톤 미니 백',  category: 'python', option_desc: '파이톤/주문제작', price: null, original_price: null, image_url: 'https://images.unsplash.com/photo-1591348122449-02525d70379b?auto=format&fit=crop&w=900&q=80', is_custom_order: 1, badge: 'MADE TO ORDER' },
];

async function seed() {
  const conn = await pool.getConnection();
  try {
    await conn.query('SET NAMES utf8mb4');
    await conn.query('TRUNCATE TABLE products');
    for (const p of products) {
      await conn.query(
        'INSERT INTO products (name,category,option_desc,price,original_price,image_url,is_custom_order,badge) VALUES (?,?,?,?,?,?,?,?)',
        [p.name, p.category, p.option_desc, p.price, p.original_price, p.image_url, p.is_custom_order, p.badge]
      );
    }
    console.log(`✓ ${products.length}개 상품 삽입 완료`);
  } finally {
    conn.release();
    process.exit(0);
  }
}

seed().catch(err => { console.error(err); process.exit(1); });
