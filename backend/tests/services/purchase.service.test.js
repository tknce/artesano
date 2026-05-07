const pool = require('../../db');
const purchaseService = require('../../services/purchase.service');

describe('purchase.service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('checkPurchased — 구매 내역 있으면 true', async () => {
    pool.query.mockResolvedValue([[{ id: 1 }]]);
    expect(await purchaseService.checkPurchased(1, 5)).toBe(true);
  });

  it('checkPurchased — 구매 내역 없으면 false', async () => {
    pool.query.mockResolvedValue([[]]);
    expect(await purchaseService.checkPurchased(1, 5)).toBe(false);
  });

  it('create — 이메일 없으면 에러', async () => {
    const result = await purchaseService.create('', 1, '');
    expect(result.error).toContain('이메일');
  });

  it('create — 존재하지 않는 회원이면 에러', async () => {
    pool.query.mockResolvedValueOnce([[]]);  // user not found
    const result = await purchaseService.create('nobody@test.com', 1, '');
    expect(result.error).toContain('회원이 없습니다');
  });
});
