import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // docker 이미지는 .next/standalone만 복사해 node server.js로 띄운다.
  output: 'standalone',
  // DB 드라이버·내장 DB(WASM)·bcrypt는 번들하지 않고 node_modules에서 그대로 읽는다.
  serverExternalPackages: ['pg', '@electric-sql/pglite', 'bcryptjs'],
  // 시드·페르소나 JSON은 실행 중에 경로를 만들어 읽으므로(src/lib/seed.ts·personas.ts) 자동 추적되지 않는다.
  // Vercel 함수·standalone 묶음에 같이 넣는다.
  outputFileTracingIncludes: {
    '/**': ['./data/seed/*.json', './data/drugs/otc_core.json'],
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
}

export default nextConfig
