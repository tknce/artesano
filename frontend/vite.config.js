// ============================================================
// vite.config.js — 프론트엔드 빌드 설정
//
// 기능:
//   - CSS/JS 미니파이 (프로덕션 빌드)
//   - 파일명에 해시 추가 (캐시 버스팅)
//   - dist/ 디렉토리에 빌드 결과물 출력
//
// 사용법:
//   npm run build  → dist/ 에 최적화된 파일 생성
//   npm run dev    → 개발 서버 (HMR)
//
// 주의: HTML은 빌드하지 않음 (서버사이드 partial injection 유지)
//       CSS/JS만 번들링하여 dist/assets/ 에 출력
// ============================================================
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        style: resolve(__dirname, 'style.css'),
        script: resolve(__dirname, 'script.js'),
        admin: resolve(__dirname, 'admin.js'),
        adminCss: resolve(__dirname, 'admin.css'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    cssMinify: true,
    minify: 'esbuild',
  },
});
