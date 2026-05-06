const zlib = require('zlib');
const nodemailer = require('nodemailer');
const pool = require('../db');

const BACKUP_TABLES = ['users', 'products', 'product_detail_images', 'inquiries', 'custom_orders'];

function escapeValue(v) {
  if (v === null) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
  if (Buffer.isBuffer(v)) return `0x${v.toString('hex')}`;
  return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
}

async function dumpTable(table) {
  const [createRes] = await pool.query(`SHOW CREATE TABLE \`${table}\``);
  const createSql = createRes[0]?.['Create Table'] || '';

  const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
  if (rows.length === 0) {
    return `-- Table: ${table} (empty)\nDROP TABLE IF EXISTS \`${table}\`;\n${createSql};\n`;
  }
  const columns = Object.keys(rows[0]);
  const cols = columns.map(c => `\`${c}\``).join(', ');
  const values = rows
    .map(r => `(${columns.map(c => escapeValue(r[c])).join(', ')})`)
    .join(',\n  ');
  return `-- Table: ${table} (${rows.length} rows)\nDROP TABLE IF EXISTS \`${table}\`;\n${createSql};\nINSERT INTO \`${table}\` (${cols}) VALUES\n  ${values};\n`;
}

async function buildDump() {
  const header = `-- CROCINI DB Backup\n-- Generated: ${new Date().toISOString()}\nSET FOREIGN_KEY_CHECKS=0;\n\n`;
  const sections = await Promise.all(BACKUP_TABLES.map(t => dumpTable(t).catch(e => `-- ${t}: ${e.message}\n`)));
  return header + sections.join('\n') + '\nSET FOREIGN_KEY_CHECKS=1;\n';
}

async function sendBackup() {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, NOTIFY_TO } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.warn('[backup] GMAIL_USER/GMAIL_APP_PASSWORD 미설정 — 백업 발송 건너뜀');
    return;
  }

  const sql = await buildDump();
  const gz = zlib.gzipSync(sql);
  const dateStr = new Date().toISOString().slice(0, 10);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  await transporter.sendMail({
    from: `"CROCINI 백업" <${GMAIL_USER}>`,
    to: NOTIFY_TO || GMAIL_USER,
    subject: `[CROCINI] DB 백업 — ${dateStr}`,
    text: `CROCINI DB 자동 백업 (${dateStr})\n\n첨부 파일을 안전한 곳에 보관하세요.\n복구 방법은 OPERATIONS.md 참고.`,
    attachments: [{
      filename: `crocini-${dateStr}.sql.gz`,
      content: gz,
    }],
  });

  console.log(`[backup] DB 백업 발송 완료 (${(gz.length / 1024).toFixed(1)} KB)`);
}

module.exports = { sendBackup, buildDump };
