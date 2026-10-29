import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/AuthForm'
import { SubmitButton } from '@/components/SubmitButton'
import { enterPersona, logIn } from '@/app/actions/auth'
import { getCurrentUser } from '@/lib/session'
import { listPersonas } from '@/lib/personas'

export const metadata = { title: '로그인' }

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/')
  const personas = await listPersonas()
  return (
    <main className="page">
      <div className="wrap" style={{ maxWidth: 488 }}>
        <div className="page-head">
          <h2>로그인</h2>
        </div>
        <AuthForm action={logIn} submitLabel="로그인" mode="login" />
        <p className="muted" style={{ marginTop: 16 }}>
          계정이 없나요? <Link href="/signup">회원가입</Link>
        </p>
      </div>

      {personas.length > 0 ? (
        <section className="wrap" style={{ maxWidth: 880, marginTop: 40 }} aria-labelledby="persona-title" data-testid="personas">
          <div className="eyebrow">시연 계정</div>
          <h3 id="persona-title">
            가상 페르소나로 <b>바로 들어가기</b>
          </h3>
          <p className="muted" style={{ marginTop: 8 }}>
            모두 지어낸 인물이에요. 누를 때마다 그 페르소나의 처음 상태(복용 목록·첫 검진 여부)로 되돌린 뒤 들어가요.
          </p>
          <div className="persona-grid" style={{ marginTop: 16 }}>
            {personas.map((p) => (
              <article key={p.id} className="persona" data-testid={`persona-${p.id}`}>
                <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                  <strong>{p.display_name}</strong>
                  <span className={`badge ${p.first_check_done ? 'badge-cobalt' : ''}`}>
                    {p.first_check_done ? '사용 중' : p.items.length ? '처음 등록' : '빈 목록'}
                  </span>
                </div>
                <p className="profile">{p.profile}</p>
                <p className="faint" style={{ margin: 0 }}>
                  {p.email} · 목록 {p.items.length}개
                </p>
                <form action={enterPersona}>
                  <input type="hidden" name="persona" value={p.id} />
                  <SubmitButton className="btn btn-sm btn-block" pendingLabel="들어가는 중…">
                    {p.id} 계정으로 시작
                  </SubmitButton>
                </form>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}
