const pool = require('../../db');
const reviewService = require('../../services/review.service');

describe('review.service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('create — 구매하지 않은 상품이면 거부', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1 }]]).mockResolvedValueOnce([[]]);  // product exists, no purchase
    const result = await reviewService.create(1, 1, 5, '좋아요');
    expect(result.error).toContain('구매 후');
    expect(result.status).toBe(403);
  });

  it('create — 별점 범위 초과 시 에러', async () => {
    const result = await reviewService.create(1, 1, 6, '');
    expect(result.error).toContain('1~5');
  });

  it('remove — 관리자는 모든 리뷰 삭제 가능', async () => {
    pool.query.mockResolvedValue([{ affectedRows: 1 }]);
    const result = await reviewService.remove(1, 99, true);
    expect(result.ok).toBe(true);
  });

  it('remove — 본인 리뷰가 아니면 거부', async () => {
    pool.query.mockResolvedValue([{ affectedRows: 0 }]);
    const result = await reviewService.remove(1, 99, false);
    expect(result.error).toContain('권한');
  });
});
