const pool = require('../../db');
const authService = require('../../services/auth.service');

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$hashed$'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('auth.service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('register — 이메일 없으면 에러', async () => {
    const result = await authService.register({ email: '', password: '12345678', name: '홍' });
    expect(result.error).toContain('이메일');
  });

  it('register — 비밀번호 8자 미만이면 에러', async () => {
    const result = await authService.register({ email: 'a@b.com', password: '123', name: '홍' });
    expect(result.error).toContain('8자');
  });

  it('register — 이미 존재하는 이메일이면 에러', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1 }]]);  // existing user
    const result = await authService.register({ email: 'a@b.com', password: '12345678', name: '홍' });
    expect(result.error).toContain('이미 사용 중');
  });

  it('login — 존재하지 않는 이메일이면 에러', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const result = await authService.login({ email: 'no@b.com', password: '12345678' });
    expect(result.error).toContain('올바르지 않습니다');
  });
});
