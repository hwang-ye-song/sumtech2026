// 내 목록(user_item) 읽기·추가·삭제
import { getDb } from './db'
import { itemExists, nameItems, type ItemRef, type ItemType, type NamedItem } from './catalog'

export interface Dose {
  /** 하루에 먹는 개수 */
  daily_count: number
  /** 한 알 함량(선택) */
  unit_amount: number | null
  unit: string | null
}

export interface UserItem extends NamedItem, Dose {
  id: number
  added_at: Date
}

export async function listUserItems(userId: number): Promise<UserItem[]> {
  const db = await getDb()
  const rows = await db.query<{
    id: number
    item_type: ItemType
    item_ref: string
    added_at: Date
    daily_count: number
    unit_amount: string | number | null
    unit: string | null
  }>(
    `SELECT id, item_type, item_ref, added_at, daily_count, unit_amount, unit FROM user_item WHERE user_id = $1 ORDER BY added_at, id`,
    [userId],
  )
  const named = await nameItems(rows.map((r) => ({ type: r.item_type, ref: r.item_ref })))
  return rows.map((r, i) => ({
    ...named[i],
    id: r.id,
    added_at: r.added_at,
    daily_count: Number(r.daily_count),
    unit_amount: r.unit_amount === null ? null : Number(r.unit_amount),
    unit: r.unit,
  }))
}

/** 복용량을 한 줄로: '1정', '1000mg', '하루 2알 × 1500mg' */
export function doseText(item: Pick<UserItem, 'countUnit'> & Dose): string {
  if (item.unit_amount !== null) {
    const amount = `${item.unit_amount}${item.unit ?? 'mg'}`
    return item.daily_count === 1 ? amount : `하루 ${item.daily_count}${item.countUnit} × ${amount}`
  }
  return `${item.daily_count}${item.countUnit}`
}

/** 참조가 실제로 있는 항목인지 확인한 뒤 넣는다. 이미 있으면 복용량만 바꾼다. */
export async function addUserItem(userId: number, item: ItemRef, dose: Dose): Promise<boolean> {
  const db = await getDb()
  if (!(await itemExists(item))) return false
  await db.query(
    `INSERT INTO user_item (user_id, item_type, item_ref, daily_count, unit_amount, unit) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, item_type, item_ref)
     DO UPDATE SET daily_count = EXCLUDED.daily_count, unit_amount = EXCLUDED.unit_amount, unit = EXCLUDED.unit`,
    [userId, item.type, item.ref, dose.daily_count, dose.unit_amount, dose.unit],
  )
  return true
}

export async function removeUserItem(userId: number, itemId: number): Promise<void> {
  const db = await getDb()
  await db.query('DELETE FROM user_item WHERE user_id = $1 AND id = $2', [userId, itemId])
}

export async function markFirstChecked(userId: number): Promise<void> {
  const db = await getDb()
  await db.query('UPDATE app_user SET first_checked_at = now() WHERE id = $1 AND first_checked_at IS NULL', [userId])
}
