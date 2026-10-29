// DB 연결. DATABASE_URL이 있으면 PostgreSQL(pg), 없으면 로컬 개발용 내장 PGlite를 쓴다.
// docker·CI·배포는 항상 DATABASE_URL을 준다. PGlite는 docker 없는 개발 PC에서만 쓰는 대체 수단이다.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>

export interface Db {
  kind: 'pg' | 'pglite'
  /** 파라미터가 있는 단일 문장 */
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T[]>
  /** 파라미터 없는 여러 문장(스키마 생성용) */
  exec(sql: string): Promise<void>
}

declare global {
  // Next.js 개발 서버의 모듈 재로딩에도 연결을 하나만 유지한다.
  var __neulDb: Promise<Db> | undefined
}

async function createDb(): Promise<Db> {
  // Vercel Marketplace의 Postgres 연동은 DATABASE_URL이나 POSTGRES_URL로 주소를 넣는다.
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url && process.env.VERCEL) {
    throw new Error('배포 환경에 DATABASE_URL이 없어요. Vercel 프로젝트에 Postgres(무료 등급)를 연결해 주세요.')
  }
  if (url) {
    const { Pool } = await import('pg')
    // Supabase처럼 자체 인증서(CA)로 SSL을 받는 DB는 그 CA(PEM)를 DATABASE_SSL_CA에 넣으면 인증서를 검증하며 붙는다.
    // (Supabase: Project Settings → Database → SSL Configuration → Download certificate.) 주소의 sslmode는 이 설정과 겹치므로 뺀다.
    const ca = process.env.DATABASE_SSL_CA?.replace(/\\n/g, '\n')
    const connectionString = ca ? url.replace(/([?&])sslmode=[^&]*&?/, '$1').replace(/[?&]$/, '') : url
    const pool = new Pool({ connectionString, max: process.env.VERCEL ? 3 : 10, ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : {}) })
    return {
      kind: 'pg',
      async query<T extends Row>(sql: string, params: unknown[] = []) {
        const res = await pool.query(sql, params)
        return res.rows as T[]
      },
      async exec(sql: string) {
        await pool.query(sql)
      },
    }
  }
  const { PGlite } = await import('@electric-sql/pglite')
  const dataDir = process.env.PGLITE_DIR ?? '.pglite/data'
  const fs = await import('node:fs/promises')
  await fs.mkdir(dataDir, { recursive: true })
  const pg = await PGlite.create(dataDir)
  return {
    kind: 'pglite',
    async query<T extends Row>(sql: string, params: unknown[] = []) {
      const res = await pg.query<T>(sql, params)
      return res.rows
    },
    async exec(sql: string) {
      await pg.exec(sql)
    },
  }
}

export function getDb(): Promise<Db> {
  if (!globalThis.__neulDb) globalThis.__neulDb = createDb()
  return globalThis.__neulDb
}
