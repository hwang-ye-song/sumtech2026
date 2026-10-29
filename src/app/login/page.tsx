import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/AuthForm'
import { SubmitButton } from '@/components/SubmitButton'
import { enterPersona, logIn } from '@/app/actions/auth'
import { getCurrentUser } from '@/lib/session'
import { safeNext } from '@/lib/next-path'
import { listPersonas } from '@/lib/personas'

export const metadata = { title: '로그인' }

const MENU_NAME: Record<string, string> = { '/list': '복용 목록', '/check': '검진하기', '/check/report': '복용 리포트', '/recommend': '영양제 추천' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const next = safeNext(params.next)
  if (await getCurrentUser()) redirect(next ?? '/')
  const personas = await listPersonas()
  const menu = next ? (MENU_NAME[next] ?? (next.startsWith('/rules/') ? '근거 보기' : null)) : null
  return (
    <main className="page">
      <div className="wrap" style={{ maxWidth: 488 }}>
        <div className="page-head">
          <h2>로그인</h2>
          {menu ? <p className="muted">로그인하면 &lsquo;{menu}&rsquo; 화면으로 이어서 가요.</p> : null}
        </div>
        <AuthForm action={logIn} submitLabel="로그인" mode="login" next={next} />
        <p className="muted" style={{ marginTop: 16 }}>
          계정이 없나요? <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}>회원가입</Link>
        </p>
      </div>

      {personas.length > 0 ? (
        <section className="wrap" style={{ maxWidth: 880, marginTop: 40 }} aria-labelledby="persona-title" data-testid="personas">
          <h3 id="persona-title">가입 없이 둘러보기</h3>
          <p className="muted" style={{ marginTop: 8 }}>
            예시 인물의 목록으로 바로 들어가요. 모두 지어낸 인물이고, 둘러본 기록은 하루 뒤 지워져요.
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
                  처음 목록 {p.items.length}개
                </p>
                <form action={enterPersona}>
                  <input type="hidden" name="persona" value={p.id} />
                  {next ? <input type="hidden" name="next" value={next} /> : null}
                  <SubmitButton className="btn btn-sm btn-block" pendingLabel="들어가는 중…">
                    이 목록으로 시작
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
