'use server'

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { ensureReady } from '@/lib/ready'
import { normalizeQuery, searchCatalog, type CatalogHit } from '@/lib/catalog'
import { describeAiError, readNamesFromPhoto } from '@/lib/ai'

export interface PhotoState {
  error?: string
  /** 사진이 흐려서 글자를 읽지 못함 */
  blurry?: boolean
  readNames?: string[]
  matches?: CatalogHit[]
}

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

/**
 * 사진을 받아 AI로 이름을 읽고, 읽은 이름마다 우리 목록(약·건강기능식품·성분)에서 가장 잘 맞는 항목 하나를 후보로 돌려준다.
 * 사진은 메모리에서만 읽고 저장하지 않는다.
 */
export async function recognizePhoto(_prev: PhotoState, formData: FormData): Promise<PhotoState> {
  await ensureReady()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const file = formData.get('photo')
  if (!(file instanceof File) || file.size === 0) return { error: '사진 파일을 골라 주세요.' }
  if (file.size > MAX_BYTES) return { error: '사진이 너무 커요(8MB 이하).' }
  const mediaType = file.type || 'image/jpeg'
  if (!ALLOWED.has(mediaType)) return { error: 'JPG·PNG·WEBP 사진만 올릴 수 있어요.' }

  let reading
  try {
    reading = await readNamesFromPhoto(new Uint8Array(await file.arrayBuffer()), mediaType)
  } catch (err) {
    return { error: describeAiError(err) }
  }
  if (!reading.readable) return { blurry: true }

  // 처방전·약 봉투에 적힌 약만 후보로 남긴다. 읽은 이름 하나당 가장 잘 맞는 항목 하나만 고르고,
  // '서방정'·'정'·'30정' 같은 제형·수량 글자로는 검색하지 않는다(엉뚱한 약이 섞이지 않게).
  const seen = new Set<string>()
  const matches: CatalogHit[] = []
  for (const raw of reading.names) {
    const name = cleanReadName(raw)
    if (!name) continue
    // 이미 고른 약 이름에 든 글자(예: 훼로바-유서방정(건조황산제일철)의 '건조황산제일철')면 같은 약이다. 다른 제품을 끌어오지 않게 건너뛴다.
    if (matches.some((m) => normalizeQuery(m.name).includes(normalizeQuery(name)))) continue
    const best = await bestMatch(name)
    if (best && !seen.has(`${best.type}:${best.ref}`)) {
      seen.add(`${best.type}:${best.ref}`)
      matches.push(best)
    }
  }
  return { readNames: reading.names, matches }
}

/** 제형·수량만 있는 글자(검색하면 상관없는 약이 잔뜩 걸린다) */
const FORM_ONLY = /^(정|정제|서방정|장용정|필름코팅정|츄어블정|발포정|캡슐|연질캡슐|경질캡슐|시럽|액|현탁액|내복액|과립|산|주|연고|크림|패취|일반의약품|전문의약품)$/

/** AI가 읽은 이름을 검색어로 다듬는다. 쓸 수 없으면 빈 글자. */
function cleanReadName(raw: string): string {
  const name = raw
    .replace(/[…·]+$/g, '')
    .replace(/\.{2,}$/, '')
    .replace(/\s*\d+\s*(정|캡슐|포|병|ml|mL|g)\s*$/, '')
    .trim()
  if (name.length < 2 || FORM_ONLY.test(name.replace(/\s+/g, ''))) return ''
  return name
}

/** 읽은 이름과 가장 잘 맞는 항목 하나: 이름이 같은 것 → 이름이 그 글자로 시작하는 것 → 이름에 그 글자가 든 것 순. */
async function bestMatch(name: string): Promise<CatalogHit | null> {
  const variants = [name, name.replace(/\(.*$/, '').trim()].filter((v, i, arr) => v.length >= 2 && arr.indexOf(v) === i)
  for (const v of variants) {
    const q = normalizeQuery(v)
    const hits = await searchCatalog(v, 20)
    const scored = hits
      .map((h) => {
        const n = normalizeQuery(h.name)
        const plain = normalizeQuery(h.name.replace(/\(.*$/, ''))
        const score = n === q || plain === q ? 0 : n.startsWith(q) || plain.startsWith(q) ? 1 : n.includes(q) ? 2 : 3
        return { h, score }
      })
      .filter((x) => x.score < 3)
      .sort((a, b) => a.score - b.score || a.h.name.length - b.h.name.length)
    if (scored.length > 0) return scored[0].h
  }
  return null
}
