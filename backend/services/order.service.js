// ============================================================
// order.service.js — 주문/결제 비즈니스 로직
//
// 주문 모델:
//   - 단일 상품 주문: orders.product_id 사용 (legacy 호환)
//   - 카트 주문: orders.product_id=NULL, order_items에 여러 줄
//   - 두 경우 모두 결제 금액(amount)은 할인 적용 후 최종 금액
// ============================================================
const crypto = require('crypto');
const pool = require('../db');
const { sendOrderStatusNotification } = require('../lib/mailer');
const couponService = require('./coupon.service');
const cartService = require('./cart.service');

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || 'test_sk_docs_OaPz8L5KdmQXkzRz3y47BMw6';
const TOSS_API_BASE = 'https://api.tosspayments.com/v1';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCustomer({ customerName, customerPhone, customerEmail, shippingAddress1 }) {
  if (!customerName?.trim()) return '이름을 입력해주세요.';
  if (!customerPhone?.trim()) return '연락처를 입력해주세요.';
  if (!customerEmail?.trim()) return '이메일을 입력해주세요.';
  if (!EMAIL_RE.test(customerEmail.trim())) return '올바른 이메일 형식이 아닙니다.';
  if (!shippingAddress1?.trim()) return '배송 주소를 입력해주세요.';
  return null;
}

// 카트의 모든 아이템에 대해 atomic 재고 차감. 실패 시 이미 차감된 것 복구.
async function decrementStockForItems(items) {
  const decremented = [];
  for (const it of items) {
    if (it.stock === null) continue; // 무제한
    const [r] = await pool.query('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?', [it.quantity, it.product_id, it.quantity]);
    if (r.affectedRows === 0) {
      // 롤백
      for (const d of decremented) {
        await pool.query('UPDATE products SET stock = stock + ? WHERE id = ?', [d.quantity, d.product_id]);
      }
      return { error: `「${it.name}」 재고가 부족합니다.`, status: 409 };
    }
    decremented.push(it);
  }
  return { ok: true };
}

async function createOrder(userId, body) {
  const { productId, fromCart, customerName, customerPhone, customerEmail, shippingPostal, shippingAddress1, shippingAddress2, shippingRequest, couponCode } = body;

  const customerErr = validateCustomer(body);
  if (customerErr) return { error: customerErr, status: 400 };

  // 주문 항목 결정: 카트 모드 vs 단일 상품 모드
  let items; // [{ product_id, name, image_url, unit_price, quantity, subtotal, stock }]
  if (fromCart) {
    const cartRows = await cartService.list(userId);
    if (cartRows.length === 0) return { error: '장바구니가 비어있습니다.', status: 400 };
    const productIds = cartRows.map(r => r.product_id);
    const [products] = await pool.query(`SELECT id, name, price, image_url, stock FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`, productIds);
    const productMap = new Map(products.map(p => [p.id, p]));
    items = cartRows.map(c => {
      const p = productMap.get(c.product_id);
      if (!p) return null;
      if (p.price === null) return { invalid: true, reason: `「${p.name}」은 주문제작 상품이라 결제할 수 없습니다.` };
      return {
        product_id: p.id, name: p.name, image_url: p.image_url,
        unit_price: p.price, quantity: c.quantity, subtotal: p.price * c.quantity,
        stock: p.stock,
      };
    });
    const invalid = items.find(it => it?.invalid);
    if (invalid) return { error: invalid.reason, status: 400 };
    items = items.filter(Boolean);
    if (items.length === 0) return { error: '주문할 상품이 없습니다.', status: 400 };
  } else {
    const pid = parseInt(productId, 10);
    if (isNaN(pid)) return { error: '상품 ID가 필요합니다.', status: 400 };
    const [products] = await pool.query('SELECT id, name, price, image_url, stock FROM products WHERE id = ?', [pid]);
    if (products.length === 0) return { error: '상품을 찾을 수 없습니다.', status: 404 };
    const p = products[0];
    if (p.price === null) return { error: '주문제작 상품은 직접 구매할 수 없습니다.', status: 400 };
    items = [{ product_id: p.id, name: p.name, image_url: p.image_url, unit_price: p.price, quantity: 1, subtotal: p.price, stock: p.stock }];
  }

  const subtotal = items.reduce((sum, it) => sum + it.subtotal, 0);

  // 쿠폰 검증 (서버에서 다시 검증 — 클라가 보낸 할인 금액 신뢰 안 함)
  let discount = 0;
  let appliedCouponCode = null;
  if (couponCode?.trim()) {
    const v = await couponService.validate(couponCode.trim().toUpperCase(), subtotal);
    if (v.error) return { error: `쿠폰: ${v.error}`, status: 400 };
    discount = v.discount;
    appliedCouponCode = couponCode.trim().toUpperCase();
  }
  const finalAmount = subtotal - discount;

  // 재고 atomic 차감
  const stockResult = await decrementStockForItems(items);
  if (stockResult.error) return stockResult;

  const orderId = `ORD-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const isCart = !!fromCart;
  const orderProductId = isCart ? null : items[0].product_id;
  const orderProductName = isCart && items.length > 1 ? `${items[0].name} 외 ${items.length - 1}건` : items[0].name;
  const orderProductImage = items[0].image_url;

  await pool.query(
    `INSERT INTO orders (order_id, user_id, product_id, product_name, product_image_url, amount, coupon_code, discount_amount, customer_name, customer_phone, customer_email, shipping_postal, shipping_address1, shipping_address2, shipping_request) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [orderId, userId, orderProductId, orderProductName, orderProductImage, finalAmount, appliedCouponCode, discount,
     customerName.trim(), customerPhone.trim(), customerEmail.trim(),
     shippingPostal?.trim() || null, shippingAddress1.trim(), shippingAddress2?.trim() || null, shippingRequest?.trim() || null]
  );

  // 카트 주문이든 단일 주문이든 항상 order_items에도 기록 (관리/통계 용)
  for (const it of items) {
    await pool.query(
      `INSERT INTO order_items (order_id, product_id, product_name, product_image_url, unit_price, quantity, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [orderId, it.product_id, it.name, it.image_url, it.unit_price, it.quantity, it.subtotal]
    );
  }

  return { orderId, amount: finalAmount, productName: orderProductName, subtotal, discount };
}

// 주문 1건의 모든 상품 재고를 복구 (Toss 결제 실패 / 위젯 취소 / 환불 시)
async function restoreStockForOrder(orderId) {
  const [items] = await pool.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
  for (const it of items) {
    if (!it.product_id) continue;
    await pool.query('UPDATE products SET stock = stock + ? WHERE id = ? AND stock IS NOT NULL', [it.quantity, it.product_id]);
  }
  // legacy: order_items가 없는 옛 주문 호환
  if (items.length === 0) {
    const [orders] = await pool.query('SELECT product_id FROM orders WHERE order_id = ?', [orderId]);
    if (orders[0]?.product_id) {
      await pool.query('UPDATE products SET stock = stock + 1 WHERE id = ? AND stock IS NOT NULL', [orders[0].product_id]);
    }
  }
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
  } catch {
    await pool.query('UPDATE orders SET status = ? WHERE order_id = ?', ['failed', orderId]);
    await restoreStockForOrder(orderId);
    return { error: '결제 서버 통신 실패', status: 502 };
  }

  if (!tossRes.ok) {
    await pool.query('UPDATE orders SET status = ? WHERE order_id = ?', ['failed', orderId]);
    await restoreStockForOrder(orderId);
    return { error: tossData.message || '결제 승인 실패', status: 400 };
  }

  await pool.query('UPDATE orders SET status = ?, payment_key = ?, paid_at = CURRENT_TIMESTAMP WHERE order_id = ?', ['paid', paymentKey, orderId]);

  // 결제 완료 후 처리
  const [items] = await pool.query('SELECT product_id FROM order_items WHERE order_id = ?', [orderId]);
  for (const it of items) {
    if (it.product_id) {
      await pool.query('INSERT IGNORE INTO purchases (user_id, product_id, note) VALUES (?, ?, ?)', [order.user_id, it.product_id, `주문 #${orderId}`]);
    }
  }
  // 카트 주문이면 사용자의 카트 비우기
  if (order.product_id === null) await cartService.clear(order.user_id);
  // 쿠폰 사용 카운트 증가
  if (order.coupon_code) await couponService.apply(order.coupon_code);

  return { ok: true };
}

async function listMine(userId) {
  const [rows] = await pool.query('SELECT id, order_id, product_id, product_name, product_image_url, amount, coupon_code, discount_amount, status, tracking_number, shipping_carrier, created_at, paid_at FROM orders WHERE user_id = ? ORDER BY created_at DESC', [userId]);
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
  // 모든 항목의 purchase 기록 삭제 + 재고 복구
  const [items] = await pool.query('SELECT product_id FROM order_items WHERE order_id = ?', [order.order_id]);
  for (const it of items) {
    if (order.user_id && it.product_id) {
      await pool.query('DELETE FROM purchases WHERE user_id = ? AND product_id = ?', [order.user_id, it.product_id]);
    }
  }
  await restoreStockForOrder(order.order_id);
  return { ok: true };
}

async function removeOrder(id) {
  await pool.query('DELETE FROM orders WHERE id = ?', [id]);
  return { ok: true };
}

async function abandonOrder(userId, orderId) {
  const [orders] = await pool.query('SELECT * FROM orders WHERE order_id = ? AND user_id = ?', [orderId, userId]);
  if (orders.length === 0) return { error: '주문을 찾을 수 없습니다.', status: 404 };
  const order = orders[0];
  if (order.status !== 'pending') return { ok: true, alreadyProcessed: true };
  await restoreStockForOrder(orderId);
  await pool.query('DELETE FROM order_items WHERE order_id = ?', [orderId]);
  await pool.query('DELETE FROM orders WHERE order_id = ?', [orderId]);
  return { ok: true };
}

async function cleanupAbandonedOrders() {
  const [orders] = await pool.query(
    "SELECT order_id FROM orders WHERE status = 'pending' AND created_at < (NOW() - INTERVAL 30 MINUTE)"
  );
  for (const o of orders) {
    await restoreStockForOrder(o.order_id);
    await pool.query('DELETE FROM order_items WHERE order_id = ?', [o.order_id]);
    await pool.query('DELETE FROM orders WHERE order_id = ?', [o.order_id]);
  }
  return orders.length;
}

module.exports = { createOrder, confirmPayment, listMine, listAll, updateStatus, cancelOrder, removeOrder, abandonOrder, cleanupAbandonedOrders };
