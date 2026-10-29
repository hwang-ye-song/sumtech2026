import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // docker 이미지는 .next/standalone만 복사해 node server.js로 띄운다.
  output: 'standalone',
  // DB 드라이버·내장 DB(WASM)·bcrypt는 번들하지 않고 node_modules에서 그대로 읽는다.
  serverExternalPackages: ['pg', '@electric-sql/pglite', 'bcryptjs'],
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
