// tests/setup.js — Jest 글로벌 설정
// DB를 mock하여 실제 MySQL 연결 없이 테스트 실행
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret';

jest.mock('../db', () => ({
  query: jest.fn(),
}));
