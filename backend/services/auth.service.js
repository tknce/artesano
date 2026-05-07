// ============================================================
// auth.service.js — 인증 비즈니스 로직
//
// 기능:
//   - 회원가입 (이메일 중복 체크, bcrypt 해싱)
//   - 로그인 (비밀번호 비교)
//   - 현재 사용자 정보 조회
// ============================================================
const pool = require('../db');
const bcrypt = require('bcryptjs');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function register({ email, password, name, phone }) {
  if (!email?.trim()) return { error: '이메일을 입력해주세요.', status: 400 };
  if (!password) return { error: '비밀번호를 입력해주세요.', status: 400 };
  if (!name?.trim()) return { error: '이름을 입력해주세요.', status: 400 };
  if (!EMAIL_RE.test(email.trim())) return { error: '올바른 이메일 형식이 아닙니다.', status: 400 };
  if (password.length < 8) return { error: '비밀번호는 8자 이상이어야 합니다.', status: 400 };
  if (name.trim().length > 100) return { error: '이름은 100자 이내로 입력해주세요.', status: 400 };

  const normalizedEmail = email.trim().toLowerCase();
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
  if (existing.length > 0) return { error: '이미 사용 중인 이메일입니다.', status: 409 };

  const hash = await bcrypt.hash(password, 12);
  const trimmedPhone = phone?.trim() || null;
  const [result] = await pool.query('INSERT INTO users (email, password_hash, name, phone) VALUES (?, ?, ?, ?)', [normalizedEmail, hash, name.trim(), trimmedPhone]);
  return { ok: true, id: result.insertId, name: name.trim(), email: normalizedEmail, phone: trimmedPhone, status: 201 };
}

async function login({ email, password }) {
  if (!email?.trim() || !password) return { error: '이메일과 비밀번호를 입력해주세요.', status: 400 };
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  if (rows.length === 0) return { error: '이메일 또는 비밀번호가 올바르지 않습니다.', status: 401 };
  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return { error: '이메일 또는 비밀번호가 올바르지 않습니다.', status: 401 };
  return { ok: true, user };
}

async function getMe(userId) {
  const [rows] = await pool.query('SELECT id, email, name, phone FROM users WHERE id = ?', [userId]);
  return rows.length > 0 ? rows[0] : null;
}

// --- 카카오 간편 로그인 ---

const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI;

function getKakaoAuthUrl() {
  return `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(KAKAO_REDIRECT_URI)}&response_type=code`;
}

async function kakaoCallback(code) {
  // 1) 인가 코드로 토큰 발급
  const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', client_id: KAKAO_CLIENT_ID, redirect_uri: KAKAO_REDIRECT_URI, code }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) return { error: '카카오 인증 실패', status: 401 };

  // 2) 사용자 정보 조회
  const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
  });
  const userData = await userRes.json();
  const kakaoId = String(userData.id);
  const kakaoEmail = userData.kakao_account?.email || null;
  const kakaoName = userData.kakao_account?.profile?.nickname || '카카오 사용자';

  // 3) 기존 회원 확인 (kakao_id로)
  const [existing] = await pool.query('SELECT * FROM users WHERE kakao_id = ?', [kakaoId]);
  if (existing.length > 0) {
    return { ok: true, user: existing[0] };
  }

  // 4) 이메일로 기존 회원 연동 시도
  if (kakaoEmail) {
    const [emailUser] = await pool.query('SELECT * FROM users WHERE email = ?', [kakaoEmail]);
    if (emailUser.length > 0) {
      await pool.query('UPDATE users SET kakao_id = ?, login_type = ? WHERE id = ?', [kakaoId, 'kakao', emailUser[0].id]);
      return { ok: true, user: { ...emailUser[0], kakao_id: kakaoId } };
    }
  }

  // 5) 신규 회원 자동 가입
  const email = kakaoEmail || `kakao_${kakaoId}@crocini.co.kr`;
  const [result] = await pool.query(
    'INSERT INTO users (email, password_hash, name, kakao_id, login_type) VALUES (?, ?, ?, ?, ?)',
    [email, '', kakaoName, kakaoId, 'kakao']
  );
  const [newUser] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
  return { ok: true, user: newUser[0], isNew: true };
}

module.exports = { register, login, getMe, getKakaoAuthUrl, kakaoCallback };
