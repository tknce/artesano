// ==============================================
// db.js — MySQL 연결 설정
//
// mysql2/promise 를 사용하면 async/await 문법으로
// DB 쿼리를 깔끔하게 쓸 수 있음
//
// createPool: 연결을 미리 여러 개 만들어두고 재사용
// → 요청마다 새로 연결하는 것보다 훨씬 빠름
// ==============================================

const mysql = require('mysql2/promise');

// .env 파일의 값들을 process.env 로 읽어옴
// (반드시 server.js에서 require('dotenv').config() 먼저 실행되어야 함)
const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+09:00',
  charset: 'utf8mb4',                 // 한글 깨짐 방지
});

module.exports = pool;
