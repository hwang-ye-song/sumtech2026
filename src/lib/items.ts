// 내 목록(user_item) 읽기·추가·삭제
import { getDb } from './db'
import { nameItems, type ItemRef, type NamedItem } from './catalog'

export interface UserItem extends NamedItem {
  id: number
  added_at: Date
}

export async function listUserItems(userId: number): Promise<UserItem[]> {
  const db = await getDb()
  const rows = await db.query<{ id: number; item_type: 'drug' | 'substance'; item_ref: string; added_at: Date }>(
    `SELECT id, item_type, item_ref, added_at FROM user_item WHERE user_id = $1 ORDER BY added_at, id`,
    [userId],
  )
  const named = await nameItems(rows.map((r) => ({ type: r.item_type, ref: r.item_ref })))
  return rows.map((r, i) => ({ ...named[i], id: r.id, added_at: r.added_at }))
}

/** 참조가 실제로 있는 항목인지 확인한 뒤 넣는다. 이미 있으면 그대로 둔다. */
export async function addUserItem(userId: number, item: ItemRef): Promise<boolean> {
  const db = await getDb()
  const exists =
    item.type === 'drug'
      ? await db.query('SELECT 1 FROM drug WHERE item_seq = $1', [item.ref])
      : await db.query('SELECT 1 FROM substance WHERE id = $1', [item.ref])
  if (exists.length === 0) return false
  await db.query(
    `INSERT INTO user_item (user_id, item_type, item_ref) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, item_type, item_ref) DO NOTHING`,
    [userId, item.type, item.ref],
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
