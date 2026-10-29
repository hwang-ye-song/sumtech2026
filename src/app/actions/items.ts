'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/session'
import { ensureReady } from '@/lib/ready'
import { addUserItem, markFirstChecked, removeUserItem } from '@/lib/items'
import { itemKey, parseItemKey } from '@/lib/catalog'

async function requireUser() {
  await ensureReady()
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

/** 검색·사진 인식 결과의 '추가' 버튼. 끝나면 내 목록으로 가서(사용 중이면) 방금 넣은 것의 경고를 바로 보여 준다. */
export async function addItemAction(formData: FormData): Promise<void> {
  const user = await requireUser()
  const item = parseItemKey(String(formData.get('item') ?? ''))
  if (!item) redirect('/add?error=invalid')
  const ok = await addUserItem(user.id, item)
  if (!ok) redirect('/add?error=notfound')
  redirect(`/list?added=${encodeURIComponent(itemKey(item))}`)
}

export async function removeItemAction(formData: FormData): Promise<void> {
  const user = await requireUser()
  const id = Number(formData.get('id'))
  if (Number.isInteger(id)) await removeUserItem(user.id, id)
  revalidatePath('/list')
  redirect('/list')
}

/** '검진하기': 첫 검진이면 '사용 중' 상태로 바꾸고 결과 화면으로 간다. */
export async function runCheckAction(): Promise<void> {
  const user = await requireUser()
  await markFirstChecked(user.id)
  redirect('/check')
}
