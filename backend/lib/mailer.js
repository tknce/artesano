// ============================================================
// mailer.js — 이메일 알림 발송
//
// 기능:
//   - 새 문의 접수 시 관리자에게 알림
//   - 새 주문제작 신청 시 관리자에게 알림
//   - 주문 상태 변경 시 고객에게 알림 (준비중/배송중/배송완료)
//
// 모든 발송은 fire-and-forget (API 응답 지연 없음)
// ============================================================
const nodemailer = require('nodemailer');

const GMAIL_USER         = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const NOTIFY_TO          = process.env.NOTIFY_TO || GMAIL_USER;

let transporter = null;
if (GMAIL_USER && GMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
} else {
  console.warn('[mailer] GMAIL_USER / GMAIL_APP_PASSWORD 미설정 — 이메일 알림 비활성');
}

function escape(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function row(label, value) {
  if (value == null || value === '') return '';
  return `<tr><td style="padding:6px 12px;color:#888;width:120px;">${label}</td><td style="padding:6px 12px;">${escape(value)}</td></tr>`;
}

// 관리자에게 발송
function sendToAdmin(subject, html) {
  if (!transporter) return;
  transporter.sendMail({ from: `"CROCINI 알림" <${GMAIL_USER}>`, to: NOTIFY_TO, subject, html })
    .catch(err => console.error('[mailer] 발송 실패:', err.message));
}

// 고객에게 발송
function sendToCustomer(email, subject, html) {
  if (!transporter || !email) return;
  transporter.sendMail({ from: `"CROCINI" <${GMAIL_USER}>`, to: email, subject, html })
    .catch(err => console.error('[mailer] 고객 발송 실패:', err.message));
}

// --- 관리자 알림 ---

function sendInquiryNotification(inquiry) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;">
      <h2 style="border-bottom:1px solid #ddd;padding-bottom:8px;">새 문의 접수</h2>
      <table style="border-collapse:collapse;font-size:14px;">
        ${row('이름', inquiry.name)}${row('연락처', inquiry.phone)}${row('이메일', inquiry.email)}
      </table>
      <h3 style="margin-top:24px;">문의 내용</h3>
      <p style="white-space:pre-wrap;background:#f8f8f8;padding:12px;border-radius:4px;">${escape(inquiry.message)}</p>
    </div>`;
  sendToAdmin(`[CROCINI] 새 문의 — ${inquiry.name}`, html);
}

function sendCustomOrderNotification(order) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;">
      <h2 style="border-bottom:1px solid #ddd;padding-bottom:8px;">새 주문제작 신청</h2>
      <table style="border-collapse:collapse;font-size:14px;">
        ${row('이름', order.name)}${row('연락처', order.phone)}${row('이메일', order.email)}
        ${row('상품 코드', order.product_code)}${row('가죽 컬러', order.leather_color)}
        ${row('하드웨어', order.hardware)}${row('내장 컬러', order.lining_color)}
        ${row('이니셜', order.initials)}${row('희망 납기', order.desired_lead_time)}${row('예산', order.budget_range)}
      </table>
      ${order.message ? `<h3 style="margin-top:24px;">메시지</h3><p style="white-space:pre-wrap;background:#f8f8f8;padding:12px;border-radius:4px;">${escape(order.message)}</p>` : ''}
    </div>`;
  sendToAdmin(`[CROCINI] 새 주문제작 — ${order.name}`, html);
}

// --- 고객 알림 (주문 상태 변경) ---

const STATUS_LABELS = {
  preparing: '상품 준비중',
  shipping:  '배송중',
  delivered: '배송 완료',
};

function sendOrderStatusNotification(order) {
  const label = STATUS_LABELS[order.status];
  if (!label) return; // preparing, shipping, delivered만 알림

  let trackingInfo = '';
  if (order.status === 'shipping' && order.tracking_number) {
    const carrier = order.shipping_carrier || '택배';
    trackingInfo = `<p style="margin-top:12px;"><b>송장번호:</b> ${escape(carrier)} ${escape(order.tracking_number)}</p>`;
  }

  const html = `
    <div style="font-family:sans-serif;max-width:600px;">
      <h2 style="border-bottom:1px solid #ddd;padding-bottom:8px;">주문 상태 안내</h2>
      <p>${escape(order.customer_name)}님, 주문하신 상품의 상태가 변경되었습니다.</p>
      <table style="border-collapse:collapse;font-size:14px;margin:16px 0;">
        ${row('주문번호', order.order_id)}
        ${row('상품', order.product_name)}
        ${row('상태', label)}
      </table>
      ${trackingInfo}
      <p style="margin-top:24px;color:#888;font-size:13px;">CROCINI 아르테사노 | www.crocini.co.kr</p>
    </div>`;
  sendToCustomer(order.customer_email, `[CROCINI] ${escape(order.product_name)} — ${label}`, html);
}

// --- 깨진 이미지 알림 (관리자) ---

function sendBrokenImagesNotification(items) {
  if (!items.length) return;
  const rows = items.map(it =>
    `<tr><td style="padding:6px 12px;">${escape(it.kind)}</td><td style="padding:6px 12px;">${escape(it.id)}</td><td style="padding:6px 12px;">${escape(it.name || '-')}</td><td style="padding:6px 12px;font-size:12px;color:#888;">${escape(it.url)}</td></tr>`
  ).join('');
  const html = `
    <div style="font-family:sans-serif;max-width:760px;">
      <h2 style="border-bottom:1px solid #ddd;padding-bottom:8px;">⚠️ 깨진 이미지 ${items.length}건</h2>
      <p>아래 이미지가 Cloudinary에서 404 응답을 반환합니다. <a href="https://www.crocini.co.kr/admin">/admin</a>에서 재업로드해주세요.</p>
      <table style="border-collapse:collapse;font-size:14px;margin-top:16px;width:100%;">
        <thead><tr style="background:#f0f0f0;"><th style="padding:8px;text-align:left;">종류</th><th style="padding:8px;text-align:left;">ID</th><th style="padding:8px;text-align:left;">이름</th><th style="padding:8px;text-align:left;">URL</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  sendToAdmin(`[CROCINI] ⚠️ 깨진 이미지 ${items.length}건 발견`, html);
}

module.exports = { sendInquiryNotification, sendCustomOrderNotification, sendOrderStatusNotification, sendBrokenImagesNotification };
