'use server'

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { ensureReady } from '@/lib/ready'
import { searchCatalog, type CatalogHit } from '@/lib/catalog'
import { describeAiError, readNamesFromPhoto } from '@/lib/ai'

export interface PhotoState {
  error?: string
  readNames?: string[]
  matches?: CatalogHit[]
}

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

/** 사진을 받아 AI로 이름을 읽고, 읽은 이름을 우리 목록(drug·substance)에서 찾아 후보로 돌려준다. */
export async function recognizePhoto(_prev: PhotoState, formData: FormData): Promise<PhotoState> {
  await ensureReady()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const file = formData.get('photo')
  if (!(file instanceof File) || file.size === 0) return { error: '사진 파일을 골라 주세요.' }
  if (file.size > MAX_BYTES) return { error: '사진이 너무 커요(8MB 이하).' }
  const mediaType = file.type || 'image/jpeg'
  if (!ALLOWED.has(mediaType)) return { error: 'JPG·PNG·WEBP 사진만 올릴 수 있어요.' }

  let names: string[]
  try {
    names = await readNamesFromPhoto(new Uint8Array(await file.arrayBuffer()), mediaType)
  } catch (err) {
    return { error: describeAiError(err) }
  }

  const seen = new Set<string>()
  const matches: CatalogHit[] = []
  for (const name of names) {
    // 읽은 이름 전체로 먼저 찾고, 없으면 괄호·공백 앞부분으로 다시 찾는다(예: '비맥스제트정 60정' → '비맥스제트정').
    const variants = [name, name.replace(/\(.*$/, '').trim(), name.split(/\s+/)[0]].filter((v, i, arr) => v && arr.indexOf(v) === i)
    for (const v of variants) {
      const hits = await searchCatalog(v, 5)
      for (const h of hits) {
        const key = `${h.type}:${h.ref}`
        if (!seen.has(key)) {
          seen.add(key)
          matches.push(h)
        }
      }
      if (hits.length > 0) break
    }
  }
  return { readNames: names, matches }
}
