// lib/config.js — 환경별 설정
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';

const base = {
  env,
  port: parseInt(process.env.PORT, 10) || 3000,
  siteUrl: process.env.SITE_URL || 'http://localhost:3000',
  session: {
    secret: process.env.SESSION_SECRET,
    maxAge: 8 * 60 * 60 * 1000, // 8시간
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crocini',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
};

const envConfig = {
  development: {
    cors: { origin: '*' },
    rateLimit: { windowMs: 15 * 60 * 1000, max: 1000 },
    logLevel: 'debug',
  },
  production: {
    cors: { origin: process.env.CORS_ORIGIN?.split(',') || ['https://www.crocini.co.kr', 'https://crocini.co.kr'] },
    rateLimit: { windowMs: 15 * 60 * 1000, max: 100 },
    logLevel: 'info',
  },
};

module.exports = { ...base, ...envConfig[env] };
