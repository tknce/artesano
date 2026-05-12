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

async function deleteAccount(userId) {
  const [rows] = await pool.query('SELECT kakao_id, naver_id, naver_access_token, naver_refresh_token FROM users WHERE id = ?', [userId]);
  if (rows.length === 0) return false;

  const { kakao_id, naver_id, naver_access_token, naver_refresh_token } = rows[0];

  if (kakao_id && process.env.KAKAO_ADMIN_KEY) {
    try {
      const res = await fetch('https://kapi.kakao.com/v1/user/unlink', {
        method: 'POST',
        headers: {
          'Authorization': `KakaoAK ${process.env.KAKAO_ADMIN_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ target_id_type: 'user_id', target_id: kakao_id }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('[KAKAO] unlink failed:', res.status, text);
      }
    } catch (e) {
      console.error('[KAKAO] unlink error:', e.message);
    }
  }

  console.log('[NAVER] delete check:', { has_naver_id: !!naver_id, has_access_token: !!naver_access_token, has_refresh_token: !!naver_refresh_token });
  if (naver_id && NAVER_CLIENT_ID && NAVER_CLIENT_SECRET) {
    try {
      let accessToken = naver_access_token;
      if (naver_refresh_token) {
        const refreshRes = await fetch('https://nid.naver.com/oauth2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: NAVER_CLIENT_ID,
            client_secret: NAVER_CLIENT_SECRET,
            refresh_token: naver_refresh_token,
          }),
        });
        const refreshData = await refreshRes.json();
        console.log('[NAVER] refresh result:', refreshData.access_token ? 'ok' : 'fail', refreshData.error || '');
        if (refreshData.access_token) accessToken = refreshData.access_token;
      }
      if (accessToken) {
        const unlinkRes = await fetch('https://nid.naver.com/oauth2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'delete',
            client_id: NAVER_CLIENT_ID,
            client_secret: NAVER_CLIENT_SECRET,
            access_token: accessToken,
            service_provider: 'NAVER',
          }),
        });
        const unlinkData = await unlinkRes.json();
        console.log('[NAVER] unlink response:', JSON.stringify(unlinkData));
      } else {
        console.log('[NAVER] unlink skipped: no access token');
      }
    } catch (e) {
      console.error('[NAVER] unlink error:', e.message);
    }
  } else {
    console.log('[NAVER] unlink skipped: missing naver_id or env vars');
  }

  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [userId]);
  return result.affectedRows > 0;
}

// --- 카카오 간편 로그인 ---

const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;
const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI;

function getKakaoAuthUrl() {
  return `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(KAKAO_REDIRECT_URI)}&response_type=code`;
}

async function kakaoCallback(code) {
  // 1) 인가 코드로 토큰 발급
  const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: KAKAO_CLIENT_ID,
      redirect_uri: KAKAO_REDIRECT_URI,
      code,
      ...(KAKAO_CLIENT_SECRET ? { client_secret: KAKAO_CLIENT_SECRET } : {}),
    }),
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
    // 카카오에서 받은 닉네임이 fallback이 아니고 DB 이름과 다르면 갱신
    if (userData.kakao_account?.profile?.nickname && existing[0].name !== kakaoName) {
      await pool.query('UPDATE users SET name = ? WHERE id = ?', [kakaoName, existing[0].id]);
      existing[0].name = kakaoName;
    }
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

// --- 네이버 간편 로그인 ---

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const NAVER_REDIRECT_URI = process.env.NAVER_REDIRECT_URI;

function getNaverAuthUrl() {
  const state = Math.random().toString(36).substring(2);
  return `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${NAVER_CLIENT_ID}&redirect_uri=${encodeURIComponent(NAVER_REDIRECT_URI)}&state=${state}`;
}

async function naverCallback(code, state) {
  // 1) 인가 코드로 토큰 발급
  const tokenRes = await fetch('https://nid.naver.com/oauth2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', client_id: NAVER_CLIENT_ID, client_secret: NAVER_CLIENT_SECRET, code, state }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) return { error: '네이버 인증 실패', status: 401 };

  // 2) 사용자 정보 조회
  const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
    headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
  });
  const userData = await userRes.json();
  if (userData.resultcode !== '00') return { error: '네이버 사용자 정보 조회 실패', status: 401 };

  const naverId = userData.response.id;
  const naverEmail = userData.response.email || null;
  const naverName = userData.response.name || userData.response.nickname || '네이버 사용자';
  const naverPhone = userData.response.mobile?.replace(/-/g, '-') || null;

  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token || null;

  // 3) 기존 회원 확인 (naver_id로)
  const [existing] = await pool.query('SELECT * FROM users WHERE naver_id = ?', [naverId]);
  if (existing.length > 0) {
    await pool.query('UPDATE users SET naver_access_token = ?, naver_refresh_token = ? WHERE id = ?', [accessToken, refreshToken, existing[0].id]);
    return { ok: true, user: existing[0] };
  }

  // 4) 이메일로 기존 회원 연동 시도
  if (naverEmail) {
    const [emailUser] = await pool.query('SELECT * FROM users WHERE email = ?', [naverEmail]);
    if (emailUser.length > 0) {
      await pool.query('UPDATE users SET naver_id = ?, login_type = ?, naver_access_token = ?, naver_refresh_token = ? WHERE id = ?', [naverId, 'naver', accessToken, refreshToken, emailUser[0].id]);
      return { ok: true, user: { ...emailUser[0], naver_id: naverId } };
    }
  }

  // 5) 신규 회원 자동 가입
  const email = naverEmail || `naver_${naverId}@crocini.co.kr`;
  const [result] = await pool.query(
    'INSERT INTO users (email, password_hash, name, phone, naver_id, login_type, naver_access_token, naver_refresh_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [email, '', naverName, naverPhone, naverId, 'naver', accessToken, refreshToken]
  );
  const [newUser] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
  return { ok: true, user: newUser[0], isNew: true };
}

module.exports = { register, login, getMe, deleteAccount, getKakaoAuthUrl, kakaoCallback, getNaverAuthUrl, naverCallback };
