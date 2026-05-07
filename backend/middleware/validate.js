// middleware/validate.js — 입력 검증 미들웨어 (zod)
const { z } = require('zod');

// 검증 미들웨어 팩토리
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const messages = result.error.errors.map(e => e.message);
      return res.status(400).json({ error: messages[0], details: messages });
    }
    req.validated = result.data;
    next();
  };
}

// === 공통 스키마 ===

const idParam = z.object({
  id: z.string().regex(/^\d+$/, '유효한 ID가 아닙니다').transform(Number),
});

const productIdParam = z.object({
  productId: z.string().regex(/^\d+$/, '유효한 상품 ID가 아닙니다').transform(Number),
});

// === Auth 스키마 ===

const registerSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요').max(50),
  email: z.string().email('유효한 이메일을 입력해주세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
  phone: z.string().min(1, '전화번호를 입력해주세요'),
});

const loginSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

// === Order 스키마 ===

const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive(),
  })).min(1, '주문 상품이 없습니다'),
  address: z.string().min(1, '배송지를 입력해주세요'),
  phone: z.string().min(1, '연락처를 입력해주세요'),
  name: z.string().optional(),
  memo: z.string().optional(),
});

// === Inquiry 스키마 ===

const inquirySchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('유효한 이메일을 입력해주세요'),
  phone: z.string().min(1, '연락처를 입력해주세요'),
  message: z.string().min(1, '문의 내용을 입력해주세요').max(2000),
});

// === Review 스키마 ===

const reviewSchema = z.object({
  productId: z.number().int().positive('유효한 상품 ID가 아닙니다'),
  rating: z.number().int().min(1).max(5, '별점은 1~5 사이여야 합니다'),
  comment: z.string().max(500).optional(),
});

module.exports = {
  validate,
  schemas: {
    idParam,
    productIdParam,
    register: registerSchema,
    login: loginSchema,
    createOrder: createOrderSchema,
    inquiry: inquirySchema,
    review: reviewSchema,
  },
};
