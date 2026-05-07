const pool = require('../../db');
const inquiryService = require('../../services/inquiry.service');

jest.mock('../../lib/mailer', () => ({ sendInquiryNotification: jest.fn() }));

describe('inquiry.service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('create — 유효한 문의 등록', async () => {
    pool.query.mockResolvedValue([{ insertId: 1 }]);
    const result = await inquiryService.create({ name: '홍길동', phone: '010-1234', email: null, message: '문의합니다' }, null);
    expect(result.success).toBe(true);
    expect(result.status).toBe(201);
  });

  it('create — 이름 없으면 에러', async () => {
    const result = await inquiryService.create({ name: '', phone: '010', message: '내용' }, null);
    expect(result.error).toContain('이름');
  });

  it('create — 문의 내용 없으면 에러', async () => {
    const result = await inquiryService.create({ name: '홍', phone: '010', message: '' }, null);
    expect(result.error).toContain('문의 내용');
  });

  it('remove — 존재하지 않는 ID면 에러', async () => {
    pool.query.mockResolvedValue([{ affectedRows: 0 }]);
    const result = await inquiryService.remove(999);
    expect(result.error).toContain('찾을 수 없습니다');
  });
});
