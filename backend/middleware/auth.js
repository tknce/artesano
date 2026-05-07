// ============================================================
// middleware/auth.js — 인증 미들웨어
//
// 기능:
//   - requireUser: 로그인한 사용자만 접근 허용
//   - requireAdmin: 관리자만 접근 허용
// ============================================================
function requireUser(req, res, next) {
  if (req.session?.userId) return next();
  res.status(401).json({ error: '로그인이 필요합니다.' });
}

function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.status(401).json({ error: '관리자 권한이 필요합니다.' });
}

module.exports = { requireUser, requireAdmin };
