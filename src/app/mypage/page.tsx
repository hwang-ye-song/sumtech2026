import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { listUserItems } from '@/lib/items'
import { isSupplement } from '@/lib/catalog'
import { personaByEmail } from '@/lib/personas'
import { resetMyPersona } from '@/app/actions/auth'
import { SubmitButton } from '@/components/SubmitButton'
import { CONSULT_NOTE } from '@/lib/labels'

export const metadata = { title: '마이페이지' }

/** 로그인한 사람의 마이페이지: '복용 목록'·'검진하기' 두 칸과 '영양제 추천받기'. 시연 계정이면 그 페르소나 설명을 위에 둔다. */
export default async function MyPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/mypage')
  const [items, persona] = await Promise.all([listUserItems(user.id), personaByEmail(user.email)])
  const name = user.display_name ?? user.email.split('@')[0]
  const inUse = user.first_checked_at !== null
  const sups = items.filter(isSupplement).length
  const drugs = items.length - sups
  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <div className="eyebrow">마이페이지</div>
          <h2>
            안녕하세요, <b>{name}</b>님
          </h2>
        </div>

        {persona ? (
          <div className="card card-soft" style={{ marginBottom: 16 }} data-testid="persona-note">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>시연 계정 {persona.id} · 가상 인물 · 바꾸려면 로그아웃 후 다시 고르기</strong>
              <form action={resetMyPersona}>
                <SubmitButton className="btn btn-sm" pendingLabel="되돌리는 중…">
                  처음 상태로 되돌리기
                </SubmitButton>
              </form>
            </div>
            <p className="muted" style={{ margin: '8px 0 0' }}>
              {persona.profile}
            </p>
          </div>
        ) : null}

        {items.length === 0 ? (
          <div className="notice" data-testid="home-empty">
            먹고 있는 약이나 영양제를 추가해 보세요
          </div>
        ) : null}
        <div className="grid grid-2" style={{ marginTop: 16 }}>
          <Link className="card card-link" href="/list" data-testid="home-list">
            <div className="eyebrow">등록·점검</div>
            <h3>복용 목록</h3>
            <p className="muted" style={{ marginTop: 8 }}>
              약 <span className="num">{drugs}</span>개 · 영양제 <span className="num">{sups}</span>개
            </p>
          </Link>
          <Link className="card card-link" href="/check" data-testid="home-analyze">
            <div className="eyebrow">리포트</div>
            <h3>검진하기</h3>
            <p className="muted" style={{ marginTop: 8 }}>
              {inUse ? '약사·의사에게 보여 줄 복용 리포트' : '다 넣은 뒤 한 번 검진하면, 그 뒤로는 더할 때마다 자동으로 점검해요'}
            </p>
          </Link>
        </div>
        <div className="row" style={{ marginTop: 24 }}>
          <Link className="btn btn-black btn-lg" href="/recommend" data-testid="home-recommend">
            영양제 추천받기
          </Link>
          <Link className="btn btn-lg" href="/explore" data-testid="home-explore">
            약·영양제 알아보기
          </Link>
        </div>
        <div className="disclaimer" style={{ marginTop: 24 }}>
          {CONSULT_NOTE}
        </div>
      </div>
    </main>
  )
}
