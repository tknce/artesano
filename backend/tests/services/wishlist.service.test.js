const pool = require('../../db');
const wishlistService = require('../../services/wishlist.service');

describe('wishlist.service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('사용자의 위시리스트 상품 목록을 반환한다', async () => {
      const mockRows = [{ id: 1, name: 'M905', category: 'crocodile', price: 513000 }];
      pool.query.mockResolvedValue([mockRows]);

      const result = await wishlistService.list(1);
      expect(result).toEqual(mockRows);
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('FROM wishlists'), [1]);
    });
  });

  describe('getIds', () => {
    it('찜한 상품 ID 배열을 반환한다', async () => {
      pool.query.mockResolvedValue([[{ product_id: 1 }, { product_id: 3 }]]);

      const result = await wishlistService.getIds(1);
      expect(result).toEqual([1, 3]);
    });
  });

  describe('add', () => {
    it('존재하는 상품을 찜 추가한다', async () => {
      pool.query
        .mockResolvedValueOnce([[{ id: 5 }]])  // SELECT products
        .mockResolvedValueOnce([{}]);           // INSERT

      const result = await wishlistService.add(1, 5);
      expect(result).toEqual({ ok: true, wishlisted: true });
    });

    it('존재하지 않는 상품이면 에러를 반환한다', async () => {
      pool.query.mockResolvedValueOnce([[]]);  // SELECT products — empty

      const result = await wishlistService.add(1, 999);
      expect(result.error).toBe('상품을 찾을 수 없습니다.');
      expect(result.status).toBe(404);
    });
  });

  describe('remove', () => {
    it('찜을 해제한다', async () => {
      pool.query.mockResolvedValue([{}]);

      const result = await wishlistService.remove(1, 5);
      expect(result).toEqual({ ok: true, wishlisted: false });
    });
  });
});
