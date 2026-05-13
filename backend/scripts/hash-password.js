// 사용법: node scripts/hash-password.js <평문 비밀번호>
// 출력된 해시를 Railway Variables의 ADMIN_PASSWORD_HASH에 저장하고,
// ADMIN_PASSWORD는 삭제하세요.
const bcrypt = require('bcryptjs');
const password = process.argv[2];
if (!password) {
  console.error('사용법: node scripts/hash-password.js <비밀번호>');
  process.exit(1);
}
console.log(bcrypt.hashSync(password, 12));
