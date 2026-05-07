const pool = require('../../db');
const customOrderService = require('../../services/custom-order.service');

jest.mock('../../lib/mailer', () => ({ sendCustomOrderNotification: jest.fn() }));

describe('custom-order.service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('create — 유효한 주문제작 신청', async () => {
    pool.query.mockResolvedValue([{ insertId: 1 }]);
    const result = await customOrderService.create({ name: '홍길동', phone: '010-1234', email: null }, null);
    expect(result.success).toBe(true);
    expect(result.status).toBe(201);
  });

  it('create — 이름 없으면 에러', async () => {
    const result = await customOrderService.create({ name: '', phone: '010' }, null);
    expect(result.error).toContain('이름');
  });

  it('create — python 아닌 상품이면 거부', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, name: 'M905', category: 'crocodile' }]]);
    const result = await customOrderService.create({ name: '홍', phone: '010', product_id: 1 }, null);
    expect(result.error).toContain('Python');
  });

  it('remove — 존재하지 않는 ID면 에러', async () => {
    pool.query.mockResolvedValue([{ affectedRows: 0 }]);
    const result = await customOrderService.remove(999);
    expect(result.error).toContain('찾을 수 없습니다');
  });
});
