'use client'

import { useState } from 'react'
import { removeItemAction } from '@/app/actions/items'

/** 목록 줄의 '삭제'. 바로 지우지 않고 '삭제할까요?' 창에서 한 번 더 묻는다. */
export function DeleteItemButton({ id, name }: { id: number; name: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="btn btn-sm" onClick={() => setOpen(true)} data-testid="row-delete">
        삭제
      </button>
      {open ? (
        <div className="overlay" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby={`delete-title-${id}`} data-testid="modal" style={{ textAlign: 'left' }}>
            <h3 id={`delete-title-${id}`}>삭제할까요?</h3>
            <p className="muted">
              <strong>{name}</strong>을(를) 목록에서 지워요. 검진 리포트에서도 사라져요.
            </p>
            <form action={removeItemAction} className="actions">
              <input type="hidden" name="id" value={id} />
              <button type="button" className="btn" onClick={() => setOpen(false)}>
                취소
              </button>
              <button type="submit" className="btn btn-black" data-testid="confirm-delete" autoFocus>
                삭제
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
