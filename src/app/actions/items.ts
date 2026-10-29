'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/session'
import { ensureReady } from '@/lib/ready'
import { addUserItem, listUserItems, markFirstChecked, removeUserItem, type Dose } from '@/lib/items'
import { itemKey, parseItemKey } from '@/lib/catalog'
import { checkItems, type Warning } from '@/lib/check'

async function requireUser() {
  await ensureReady()
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

export interface RegisterState {
  error?: string
  /** '등록'을 누를 때마다 바뀐다. 같은 경고라도 창을 다시 연다. */
  attempt?: number
  warnings?: Warning[]
}

function readDose(formData: FormData): Dose | string {
  const count = Number(String(formData.get('daily_count') ?? '').trim())
  if (!Number.isInteger(count) || count < 1 || count > 20) return "'하루에 먹는 개수'를 1~20 사이 숫자로 넣어 주세요."
  const amountRaw = String(formData.get('unit_amount') ?? '')
    .trim()
    .replace(/\s*mg$/i, '')
    .replace(/,/g, '')
  if (!amountRaw) return { daily_count: count, unit_amount: null, unit: null }
  const amount = Number(amountRaw)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) return "'한 알 함량'은 mg 단위 숫자로 넣어 주세요."
  return { daily_count: count, unit_amount: amount, unit: 'mg' }
}

/**
 * 검색·사진 등록의 '등록'. 첫 검진을 마친 사람(사용 중)이면 넣기 전에 방금 고른 것이 끼는 조합을 점검해
 * 경고가 있으면 넣지 않고 경고 창을 띄운다('그래도 추가'를 누르면 force로 다시 온다).
 * 처음 등록하는 사람에게는 경고 없이 넣는다(검진은 '검진하기'에서 한 번에).
 */
export async function registerItem(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const user = await requireUser()
  const item = parseItemKey(String(formData.get('item') ?? ''))
  if (!item) return { error: '등록할 약·영양제를 먼저 골라 주세요.' }
  const dose = readDose(formData)
  if (typeof dose === 'string') return { error: dose }
  const force = formData.get('force') === '1'
  const inUse = user.first_checked_at !== null

  const current = await listUserItems(user.id)
  if (current.some((i) => itemKey(i) === itemKey(item))) {
    return { error: '이미 내 목록에 있어요. 복용량을 바꾸려면 목록에서 지운 뒤 다시 등록해 주세요.' }
  }
  if (inUse && !force) {
    const warnings = await checkItems([...current, item], item)
    if (warnings.length > 0) return { attempt: Date.now(), warnings }
  }

  const ok = await addUserItem(user.id, item, dose)
  if (!ok) return { error: '그 항목을 찾지 못했어요. 다시 검색해 주세요.' }
  revalidatePath('/list')
  const status = !inUse ? 'new' : force ? 'warned' : 'clear'
  redirect(`/list?added=${encodeURIComponent(itemKey(item))}&status=${status}`)
}

export async function removeItemAction(formData: FormData): Promise<void> {
  const user = await requireUser()
  const id = Number(formData.get('id'))
  if (Number.isInteger(id)) await removeUserItem(user.id, id)
  revalidatePath('/list')
  redirect('/list?deleted=1')
}

/** '검진 시작': 첫 검진이면 '사용 중' 상태로 바꾸고 검진 리포트로 간다. */
export async function startCheckAction(): Promise<void> {
  const user = await requireUser()
  await markFirstChecked(user.id)
  redirect('/check/report')
}
