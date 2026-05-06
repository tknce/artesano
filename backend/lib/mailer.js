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
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function row(label, value) {
  if (value == null || value === '') return '';
  return `<tr><td style="padding:6px 12px;color:#888;width:120px;">${label}</td><td style="padding:6px 12px;">${escape(value)}</td></tr>`;
}

// fire-and-forget — 응답 지연 없이 백그라운드 발송
function send(subject, html) {
  if (!transporter) return;
  transporter.sendMail({
    from: `"CROCINI 알림" <${GMAIL_USER}>`,
    to: NOTIFY_TO,
    subject,
    html,
  }).catch(err => console.error('[mailer] 발송 실패:', err.message));
}

function sendInquiryNotification(inquiry) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;">
      <h2 style="border-bottom:1px solid #ddd;padding-bottom:8px;">새 문의 접수</h2>
      <table style="border-collapse:collapse;font-size:14px;">
        ${row('이름', inquiry.name)}
        ${row('연락처', inquiry.phone)}
        ${row('이메일', inquiry.email)}
      </table>
      <h3 style="margin-top:24px;">문의 내용</h3>
      <p style="white-space:pre-wrap;background:#f8f8f8;padding:12px;border-radius:4px;">${escape(inquiry.message)}</p>
    </div>`;
  send(`[CROCINI] 새 문의 — ${inquiry.name}`, html);
}

function sendCustomOrderNotification(order) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;">
      <h2 style="border-bottom:1px solid #ddd;padding-bottom:8px;">새 주문제작 신청</h2>
      <table style="border-collapse:collapse;font-size:14px;">
        ${row('이름', order.name)}
        ${row('연락처', order.phone)}
        ${row('이메일', order.email)}
        ${row('상품 코드', order.product_code)}
        ${row('가죽 컬러', order.leather_color)}
        ${row('하드웨어', order.hardware)}
        ${row('내장 컬러', order.lining_color)}
        ${row('이니셜', order.initials)}
        ${row('희망 납기', order.desired_lead_time)}
        ${row('예산', order.budget_range)}
      </table>
      ${order.message ? `<h3 style="margin-top:24px;">메시지</h3><p style="white-space:pre-wrap;background:#f8f8f8;padding:12px;border-radius:4px;">${escape(order.message)}</p>` : ''}
    </div>`;
  send(`[CROCINI] 새 주문제작 — ${order.name}`, html);
}

module.exports = { sendInquiryNotification, sendCustomOrderNotification };
