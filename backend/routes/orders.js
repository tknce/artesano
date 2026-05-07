const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();
const pool    = require('../db');

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function requireUser(req, res, next) {
  if (req.session?.userId) return next();
  res.status(401).json({ error: '로그인이 필요합니다.' });
}

function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.status(401).json({ error: '관리자 권한이 필요합니다.' });
}

// 토스 시크릿 키 (없으면 공식 docs 테스트 키 사용)
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || 'test_sk_docs_OaPz8L5KdmQXkzRz3y47BMw6';
const TOSS_API_BASE   = 'https://api.tosspayments.com/v1';

// POST /api/orders — 결제 전 pending 주문 생성
router.post('/', requireUser, asyncHandler(async (req, res) => {
  const {
    productId,
    customerName, customerPhone, customerEmail,
    shippingPostal, shippingAddress1, shippingAddress2, shippingRequest,
  } = req.body || {};

  const pid = parseInt(productId, 10);
  if (isNaN(pid))               return res.status(400).json({ error: '상품 ID가 필요합니다.' });
  if (!customerName?.trim())    return res.status(400).json({ error: '이름을 입력해주세요.' });
  if (!customerPhone?.trim())   return res.status(400).json({ error: '연락처를 입력해주세요.' });
  if (!shippingAddress1?.trim()) return res.status(400).json({ error: '배송 주소를 입력해주세요.' });

  const [products] = await pool.query(
    'SELECT id, name, price, image_url FROM products WHERE id = ?',
    [pid]
  );
  if (products.length === 0) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });

  const product = products[0];
  if (product.price === null) {
    return res.status(400).json({ error: '주문제작 상품은 직접 구매할 수 없습니다.' });
  }

  // 토스 주문 ID 생성 (영문/숫자/하이픈/언더스코어, 6~64자)
  const orderId = `ORD-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;

  await pool.query(`
    INSERT INTO orders (
      order_id, user_id, product_id, product_name, product_image_url, amount,
      customer_name, customer_phone, customer_email,
      shipping_postal, shipping_address1, shipping_address2, shipping_request
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    orderId, req.session.userId, product.id, product.name, product.image_url, product.price,
    customerName.trim(), customerPhone.trim(), customerEmail?.trim() || null,
    shippingPostal?.trim() || null, shippingAddress1.trim(),
    shippingAddress2?.trim() || null, shippingRequest?.trim() || null,
  ]);

  res.json({
    orderId,
    amount: product.price,
    productName: product.name,
  });
}));

// POST /api/orders/confirm — 결제 승인 (토스 서버에 확정 요청)
router.post('/confirm', requireUser, asyncHandler(async (req, res) => {
  const { orderId, paymentKey, amount } = req.body || {};
  if (!orderId || !paymentKey || !amount) {
    return res.status(400).json({ error: '필수 결제 정보가 누락되었습니다.' });
  }

  // 우리 DB에서 주문 검증
  const [orders] = await pool.query(
    'SELECT * FROM orders WHERE order_id = ? AND user_id = ?',
    [orderId, req.session.userId]
  );
  if (orders.length === 0) return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });

  const order = orders[0];
  if (order.status === 'paid') return res.json({ ok: true, alreadyPaid: true });
  if (Number(order.amount) !== Number(amount)) {
    return res.status(400).json({ error: '결제 금액이 일치하지 않습니다.' });
  }

  // 토스 서버에 결제 승인 요청
  const auth = Buffer.from(TOSS_SECRET_KEY + ':').toString('base64');
  let tossRes, tossData;
  try {
    tossRes = await fetch(`${TOSS_API_BASE}/payments/confirm`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    });
    tossData = await tossRes.json();
  } catch (err) {
    await pool.query('UPDATE orders SET status = ? WHERE order_id = ?', ['failed', orderId]);
    return res.status(502).json({ error: '결제 서버 통신 실패' });
  }

  if (!tossRes.ok) {
    await pool.query('UPDATE orders SET status = ? WHERE order_id = ?', ['failed', orderId]);
    return res.status(400).json({ error: tossData.message || '결제 승인 실패' });
  }

  // 결제 성공 — 주문 상태 갱신 + purchases 자동 등록
  await pool.query(
    'UPDATE orders SET status = ?, payment_key = ?, paid_at = CURRENT_TIMESTAMP WHERE order_id = ?',
    ['paid', paymentKey, orderId]
  );

  if (order.product_id) {
    await pool.query(
      'INSERT IGNORE INTO purchases (user_id, product_id, note) VALUES (?, ?, ?)',
      [order.user_id, order.product_id, `주문 #${orderId}`]
    );
  }

  res.json({ ok: true });
}));

// GET /api/orders/mine — 내 주문 목록
router.get('/mine', requireUser, asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT id, order_id, product_id, product_name, product_image_url,
           amount, status, tracking_number, shipping_carrier,
           created_at, paid_at
    FROM orders
    WHERE user_id = ?
    ORDER BY created_at DESC
  `, [req.session.userId]);
  res.json(rows);
}));

// GET /api/orders — 전체 주문 (관리자)
router.get('/', requireAdmin, asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT o.*, u.email AS user_email
    FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC
  `);
  res.json(rows);
}));

// PUT /api/orders/:id/status — 상태/송장번호/택배사 변경 (관리자)
router.put('/:id/status', requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status, tracking_number, shipping_carrier } = req.body || {};
  const VALID = ['pending','paid','preparing','shipping','delivered','failed','cancelled'];
  if (!VALID.includes(status)) return res.status(400).json({ error: '잘못된 상태입니다.' });

  await pool.query(
    'UPDATE orders SET status = ?, tracking_number = ?, shipping_carrier = ? WHERE id = ?',
    [status, tracking_number?.trim() || null, shipping_carrier?.trim() || null, id]
  );
  res.json({ ok: true });
}));

// POST /api/orders/:id/cancel — 결제 취소 + 환불 (관리자)
router.post('/:id/cancel', requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { reason } = req.body || {};

  const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
  if (orders.length === 0) return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });

  const order = orders[0];
  if (order.status === 'cancelled') return res.json({ ok: true, alreadyCancelled: true });
  if (!order.payment_key)           return res.status(400).json({ error: '결제 정보가 없는 주문입니다.' });

  const auth = Buffer.from(TOSS_SECRET_KEY + ':').toString('base64');
  let tossRes, tossData;
  try {
    tossRes = await fetch(`${TOSS_API_BASE}/payments/${order.payment_key}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ cancelReason: reason?.trim() || '관리자 취소' }),
    });
    tossData = await tossRes.json();
  } catch (err) {
    return res.status(502).json({ error: '결제 서버 통신 실패' });
  }
  if (!tossRes.ok) return res.status(400).json({ error: tossData.message || '취소 실패' });

  // 상태 갱신 + purchases에서 제거 (후기 권한 회수)
  await pool.query('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', id]);
  if (order.user_id && order.product_id) {
    await pool.query(
      'DELETE FROM purchases WHERE user_id = ? AND product_id = ?',
      [order.user_id, order.product_id]
    );
  }

  res.json({ ok: true });
}));

// DELETE /api/orders/:id — 주문 삭제 (관리자)
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID' });
  await pool.query('DELETE FROM orders WHERE id = ?', [id]);
  res.json({ ok: true });
}));

module.exports = router;
