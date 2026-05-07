// tests/integration/api.test.js — 주요 API 통합 테스트
const request = require('supertest');

// DB와 외부 서비스 mock
jest.mock('../../db', () => ({ query: jest.fn() }));
jest.mock('../../lib/mailer', () => ({ sendInquiryNotification: jest.fn() }));
jest.mock('../../lib/backup', () => ({ sendBackup: jest.fn() }));
jest.mock('../../lib/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), fatal: jest.fn() }));

const app = require('../../server');

describe('API 통합 테스트', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /products', () => {
    it('상품 목록을 반환한다', async () => {
      const db = require('../../db');
      db.query.mockResolvedValueOnce([[{ id: 1, name: 'Test Bag', price: 1000000 }]]);

      const res = await request(app).get('/products');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/auth/register', () => {
    it('유효하지 않은 이메일이면 400을 반환한다', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: '테스트', email: 'invalid', password: '123456', phone: '010-1234-5678' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('이메일');
    });

    it('비밀번호가 짧으면 400을 반환한다', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: '테스트', email: 'test@test.com', password: '123', phone: '010-1234-5678' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('6자');
    });
  });

  describe('POST /api/auth/login', () => {
    it('이메일 없이 요청하면 400을 반환한다', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: '123456' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /inquiries', () => {
    it('유효한 문의를 접수한다', async () => {
      const db = require('../../db');
      db.query.mockResolvedValueOnce([{ insertId: 1 }]);

      const res = await request(app)
        .post('/inquiries')
        .send({ name: '홍길동', email: 'hong@test.com', phone: '010-1234-5678', message: '문의합니다' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('이메일 없이 문의하면 400을 반환한다', async () => {
      const res = await request(app)
        .post('/inquiries')
        .send({ name: '홍길동', message: '문의합니다' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('메시지 없이 문의하면 400을 반환한다', async () => {
      const res = await request(app)
        .post('/inquiries')
        .send({ name: '홍길동', email: 'hong@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /api/wishlist', () => {
    it('인증 없이 접근하면 401을 반환한다', async () => {
      const res = await request(app).get('/api/wishlist');
      expect(res.status).toBe(401);
    });
  });

  describe('404 처리', () => {
    it('존재하지 않는 API 경로는 JSON 404를 반환한다', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });
  });
});
