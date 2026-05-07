const pool = require('../../db');
const contentService = require('../../services/content.service');

describe('content.service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getAll', () => {
    it('모든 콘텐츠를 key-value 객체로 반환한다', async () => {
      pool.query.mockResolvedValue([[
        { content_key: 'material_info', content: '소재 정보' },
        { content_key: 'care_guide', content: '케어 가이드' },
      ]]);

      const result = await contentService.getAll();
      expect(result).toEqual({ material_info: '소재 정보', care_guide: '케어 가이드' });
    });
  });

  describe('update', () => {
    it('허용된 키의 콘텐츠를 업데이트한다', async () => {
      pool.query.mockResolvedValue([{}]);

      const result = await contentService.update('care_guide', '새 내용');
      expect(result).toEqual({ ok: true });
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO site_content'), ['care_guide', '새 내용']);
    });

    it('허용되지 않은 키면 에러를 반환한다', async () => {
      const result = await contentService.update('invalid_key', '내용');
      expect(result.error).toBe('잘못된 키입니다.');
      expect(result.status).toBe(400);
    });
  });
});
