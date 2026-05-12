// ============================================================
// order.service.js — 주문/결제 비즈니스 로직
//
// 기능:
//   - 주문 생성 (pending 상태)
//   - 토스페이먼츠 결제 승인
//   - 내 주문 목록 / 전체 목록 (관리자)
//   - 주문 상태 변경 + 이메일 알림
//   - 결제 취소 (환불)
//   - 주문 삭제
// ============================================================
const crypto = require('crypto');
const pool = require('../db');
const { sendOrderStatusNotification } = require('../lib/mailer');

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || 'test_sk_docs_OaPz8L5KdmQXkzRz3y47BMw6';
const TOSS_API_BASE = 'https://api.tosspayments.com/v1';

async function createOrder(userId, body) {
  const { productId, customerName, customerPhone, customerEmail, shippingPostal, shippingAddress1, shippingAddress2, shippingRequest } = body;
  const pid = parseInt(productId, 10);
  if (isNaN(pid)) return { error: '상품 ID가 필요합니다.', status: 400 };
  if (!customerName?.trim()) return { error: '이름을 입력해주세요.', status: 400 };
  if (!customerPhone?.trim()) return { error: '연락처를 입력해주세요.', status: 400 };
  if (!customerEmail?.trim()) return { error: '이메일을 입력해주세요.', status: 400 };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) return { error: '올바른 이메일 형식이 아닙니다.', status: 400 };
  if (!shippingAddress1?.trim()) return { error: '배송 주소를 입력해주세요.', status: 400 };

  const [products] = await pool.query('SELECT id, name, price, image_url FROM products WHERE id = ?', [pid]);
  if (products.length === 0) return { error: '상품을 찾을 수 없습니다.', status: 404 };
  const product = products[0];
  if (product.price === null) return { error: '주문제작 상품은 직접 구매할 수 없습니다.', status: 400 };

  const orderId = `ORD-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  await pool.query(`INSERT INTO orders (order_id, user_id, product_id, product_name, product_image_url, amount, customer_name, customer_phone, customer_email, shipping_postal, shipping_address1, shipping_address2, shipping_request) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [orderId, userId, product.id, product.name, product.image_url, product.price, customerName.trim(), customerPhone.trim(), customerEmail?.trim() || null, shippingPostal?.trim() || null, shippingAddress1.trim(), shippingAddress2?.trim() || null, shippingRequest?.trim() || null]);
  return { orderId, amount: product.price, productName: product.name };
}

async function confirmPayment(userId, { orderId, paymentKey, amount }) {
  if (!orderId || !paymentKey || !amount) return { error: '필수 결제 정보가 누락되었습니다.', status: 400 };
  const [orders] = await pool.query('SELECT * FROM orders WHERE order_id = ? AND user_id = ?', [orderId, userId]);
  if (orders.length === 0) return { error: '주문을 찾을 수 없습니다.', status: 404 };
  const order = orders[0];
  if (order.status === 'paid') return { ok: true, alreadyPaid: true };
  if (Number(order.amount) !== Number(amount)) return { error: '결제 금액이 일치하지 않습니다.', status: 400 };

  const auth = Buffer.from(TOSS_SECRET_KEY + ':').toString('base64');
  let tossRes, tossData;
  try {
    tossRes = await fetch(`${TOSS_API_BASE}/payments/confirm`, { method: 'POST', headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }) });
    tossData = await tossRes.json();
  } catch { await pool.query('UPDATE orders SET status = ? WHERE order_id = ?', ['failed', orderId]); return { error: '결제 서버 통신 실패', status: 502 }; }

  if (!tossRes.ok) { await pool.query('UPDATE orders SET status = ? WHERE order_id = ?', ['failed', orderId]); return { error: tossData.message || '결제 승인 실패', status: 400 }; }

  await pool.query('UPDATE orders SET status = ?, payment_key = ?, paid_at = CURRENT_TIMESTAMP WHERE order_id = ?', ['paid', paymentKey, orderId]);
  if (order.product_id) await pool.query('INSERT IGNORE INTO purchases (user_id, product_id, note) VALUES (?, ?, ?)', [order.user_id, order.product_id, `주문 #${orderId}`]);
  return { ok: true };
}

async function listMine(userId) {
  const [rows] = await pool.query('SELECT id, order_id, product_id, product_name, product_image_url, amount, status, tracking_number, shipping_carrier, created_at, paid_at FROM orders WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  return rows;
}

async function listAll() {
  const [rows] = await pool.query('SELECT o.*, u.email AS user_email FROM orders o LEFT JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC');
  return rows;
}

async function updateStatus(id, { status, tracking_number, shipping_carrier }) {
  const VALID = ['pending', 'paid', 'preparing', 'shipping', 'delivered', 'failed', 'cancelled'];
  if (!VALID.includes(status)) return { error: '잘못된 상태입니다.', status: 400 };
  await pool.query('UPDATE orders SET status = ?, tracking_number = ?, shipping_carrier = ? WHERE id = ?', [status, tracking_number?.trim() || null, shipping_carrier?.trim() || null, id]);

  // 상태 변경 시 고객에게 이메일 알림 발송
  const [orders] = await pool.query('SELECT customer_name, customer_email, product_name, order_id FROM orders WHERE id = ?', [id]);
  if (orders.length > 0 && orders[0].customer_email) {
    sendOrderStatusNotification({ ...orders[0], status, tracking_number: tracking_number?.trim() || null, shipping_carrier: shipping_carrier?.trim() || null });
  }

  return { ok: true };
}

async function cancelOrder(id, reason) {
  const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
  if (orders.length === 0) return { error: '주문을 찾을 수 없습니다.', status: 404 };
  const order = orders[0];
  if (order.status === 'cancelled') return { ok: true, alreadyCancelled: true };
  if (!order.payment_key) return { error: '결제 정보가 없는 주문입니다.', status: 400 };

  const auth = Buffer.from(TOSS_SECRET_KEY + ':').toString('base64');
  let tossRes, tossData;
  try {
    tossRes = await fetch(`${TOSS_API_BASE}/payments/${order.payment_key}/cancel`, { method: 'POST', headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ cancelReason: reason?.trim() || '관리자 취소' }) });
    tossData = await tossRes.json();
  } catch { return { error: '결제 서버 통신 실패', status: 502 }; }
  if (!tossRes.ok) return { error: tossData.message || '취소 실패', status: 400 };

  await pool.query('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', id]);
  if (order.user_id && order.product_id) await pool.query('DELETE FROM purchases WHERE user_id = ? AND product_id = ?', [order.user_id, order.product_id]);
  return { ok: true };
}

async function removeOrder(id) {
  await pool.query('DELETE FROM orders WHERE id = ?', [id]);
  return { ok: true };
}

module.exports = { createOrder, confirmPayment, listMine, listAll, updateStatus, cancelOrder, removeOrder };
