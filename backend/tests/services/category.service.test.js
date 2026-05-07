const pool = require('../../db');
const categoryService = require('../../services/category.service');

describe('category.service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('list — 카테고리 목록 반환', async () => {
    pool.query.mockResolvedValue([[{ id: 1, slug: 'crocodile', name: 'CROCODILE' }]]);
    const result = await categoryService.list();
    expect(result).toHaveLength(1);
  });

  it('create — 유효한 slug로 생성', async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 1 }]).mockResolvedValueOnce([[{ id: 1, slug: 'test', name: 'Test' }]]);
    const result = await categoryService.create('test', 'Test', 1);
    expect(result.data.slug).toBe('test');
  });

  it('create — 잘못된 slug면 에러', async () => {
    const result = await categoryService.create('AB!', 'Test', 1);
    expect(result.error).toContain('slug');
  });

  it('remove — 보호된 slug면 거부', async () => {
    pool.query.mockResolvedValueOnce([[{ slug: 'python' }]]);
    const result = await categoryService.remove(1);
    expect(result.error).toContain('python');
  });
});
