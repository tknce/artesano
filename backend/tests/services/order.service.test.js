const pool = require('../../db');
const orderService = require('../../services/order.service');

describe('order.service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('createOrder — 상품 ID 없으면 에러', async () => {
    const result = await orderService.createOrder(1, { productId: 'abc', customerName: '홍', customerPhone: '010', shippingAddress1: '서울' });
    expect(result.error).toContain('상품 ID');
  });

  it('createOrder — 이름 없으면 에러', async () => {
    const result = await orderService.createOrder(1, { productId: 1, customerName: '', customerPhone: '010', shippingAddress1: '서울' });
    expect(result.error).toContain('이름');
  });

  it('createOrder — 주문제작 상품이면 거부', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, name: 'PT001', price: null, image_url: null }]]);
    const result = await orderService.createOrder(1, { productId: 1, customerName: '홍', customerPhone: '010', shippingAddress1: '서울' });
    expect(result.error).toContain('주문제작');
  });

  it('updateStatus — 잘못된 상태면 에러', async () => {
    const result = await orderService.updateStatus(1, { status: 'invalid' });
    expect(result.error).toContain('잘못된 상태');
  });
});
