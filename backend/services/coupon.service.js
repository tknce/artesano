const pool = require('../db');

async function validate(code, orderAmount) {
  const [rows] = await pool.query('SELECT * FROM coupons WHERE code = ? AND is_active = TRUE', [code]);
  if (rows.length === 0) return { error: '유효하지 않은 쿠폰 코드입니다.', status: 400 };
  const coupon = rows[0];
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return { error: '만료된 쿠폰입니다.', status: 400 };
  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) return { error: '사용 횟수가 초과된 쿠폰입니다.', status: 400 };
  if (orderAmount < coupon.min_order_amount) return { error: `최소 주문 금액은 ${coupon.min_order_amount.toLocaleString()}원입니다.`, status: 400 };

  let discount = coupon.discount_type === 'percent'
    ? Math.floor(orderAmount * coupon.discount_value / 100)
    : coupon.discount_value;
  if (coupon.max_discount) discount = Math.min(discount, coupon.max_discount);

  return { ok: true, discount, coupon: { code: coupon.code, discount_type: coupon.discount_type, discount_value: coupon.discount_value } };
}

async function apply(code) {
  await pool.query('UPDATE coupons SET used_count = used_count + 1 WHERE code = ?', [code]);
}

async function create({ code, discount_type, discount_value, min_order_amount, max_discount, expires_at, max_uses }) {
  await pool.query(
    'INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_discount, expires_at, max_uses) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [code, discount_type, discount_value, min_order_amount || 0, max_discount || null, expires_at || null, max_uses || null]
  );
  return { ok: true };
}

async function list() {
  const [rows] = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
  return rows;
}

module.exports = { validate, apply, create, list };
