const pool = require('../../db');
const productService = require('../../services/product.service');

jest.mock('../../lib/cloudinary', () => ({
  uploader: { destroy: jest.fn().mockResolvedValue({}) },
  optimize: (url) => url ? url.replace('/upload/', '/upload/f_auto,q_auto/') : url,
}));

describe('product.service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('list — 전체 상품 목록 반환', async () => {
    pool.query.mockResolvedValue([[{ id: 1, name: 'M905', image_url: null }]]);
    const result = await productService.list(null);
    expect(result).toHaveLength(1);
  });

  it('list — 존재하지 않는 카테고리면 에러', async () => {
    pool.query.mockResolvedValue([[]]);  // categoryExists → empty
    const result = await productService.list('invalid');
    expect(result.error).toContain('카테고리');
  });

  it('getById — 존재하지 않는 ID면 에러', async () => {
    pool.query.mockResolvedValue([[]]);
    const result = await productService.getById(999);
    expect(result.error).toContain('찾을 수 없습니다');
  });

  it('create — name 없으면 에러', async () => {
    const result = await productService.create({ name: '', category: 'crocodile' }, 'http://img.jpg');
    expect(result.error).toContain('name');
  });

  it('remove — 존재하지 않는 상품이면 에러', async () => {
    pool.query.mockResolvedValue([[]]);
    const result = await productService.remove(999);
    expect(result.error).toContain('찾을 수 없습니다');
  });

  it('reorderDetailImages — 배열 아니면 에러', async () => {
    const result = await productService.reorderDetailImages(1, 'not-array');
    expect(result.error).toContain('order 배열');
  });
});
