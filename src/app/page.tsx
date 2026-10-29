import Link from 'next/link'
import { getCurrentUser } from '@/lib/session'
import { listUserItems } from '@/lib/items'
import { isSupplement } from '@/lib/catalog'
import { personaByEmail } from '@/lib/personas'
import { enterPersona } from '@/app/actions/auth'
import { Logo } from '@/components/Header'
import { SubmitButton } from '@/components/SubmitButton'
import { CONSULT_NOTE } from '@/lib/labels'

const LANDING_DISCLAIMER = '이 서비스는 처방이나 진단을 하지 않아요. 복용을 바꾸기 전에 약사·의사와 상담하세요'
const SRC_URL = {
  R3: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3092723/',
  R7: 'https://nedrug.mfds.go.kr/searchEasyDrug/easyDetail?itemSeq=202300436',
  R12: 'https://medlineplus.gov/druginfo/meds/a682461.html',
}

export default async function HomePage() {
  const user = await getCurrentUser()
  return user ? <UserHome userId={user.id} email={user.email} name={user.display_name ?? user.email.split('@')[0]} inUse={user.first_checked_at !== null} /> : <Landing />
}

/** 로그인하지 않은 사람이 보는 첫 화면(프로토타입 랜딩) */
function Landing() {
  return (
    <main>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">약 × 영양제 복용 점검</div>
            <h1>
              약과 영양제를
              <br />
              함께 먹을 때
              <br />
              <b>해로운 조합을 출처와 함께 알려 줘요</b>
            </h1>
            <p className="lead">
              약은 병원에서, 영양제는 인터넷에서 따로 들어와요. 그 둘을 함께 봐 주는 사람은 없어요. TwoPills는 목록에 더하는 순간, 식약처 원문과 논문으로 먼저 알려
              드려요.
            </p>
            <div className="cta">
              <Link className="btn btn-primary btn-lg" href="/signup" data-testid="hero-signup">
                회원가입
              </Link>
              <Link className="btn btn-lg" href="/login">
                로그인
              </Link>
            </div>
            <p className="faint" data-testid="landing-disclaimer">
              {LANDING_DISCLAIMER}
            </p>
          </div>
          <div className="panel preview" aria-label="경고 화면 미리보기">
            <div className="cap">갑상선약을 먹는 분이 칼슘을 더하는 순간, 이렇게 떠요</div>
            <span className="badge badge-warn">
              <span className="ico" aria-hidden="true">
                ◷
              </span>
              시간을 띄워 드세요
            </span>
            <div className="act">레보티록신과 최소 4시간 띄워 드세요</div>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>레보티록신(갑상선약) ↔ 칼슘</p>
            <blockquote className="quote">
              If you take calcium carbonate or ferrous sulfate, take it at least 4 hours before or 4 hours after you take levothyroxine.
            </blockquote>
            <p className="faint" style={{ margin: '12px 0 0' }}>
              출처:{' '}
              <a href={SRC_URL.R12} target="_blank" rel="noopener noreferrer">
                Levothyroxine (MedlinePlus)
              </a>{' '}
              ·{' '}
              <a href={SRC_URL.R3} target="_blank" rel="noopener noreferrer">
                PMC 논문
              </a>
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="eyebrow">왜 필요한가요</div>
          <h2>
            영양제는 <b>괜찮겠지</b> 하고 먹다가 약과 부딪혀요
          </h2>
          <div className="grid grid-3" style={{ marginTop: 24 }}>
            <div className="card">
              <h4>따로따로 들어와요</h4>
              <p className="muted">약은 병원에서, 영양제는 자녀가 인터넷에서 사 보내거나 마트·직구·유튜브 추천으로 사요. 둘을 같이 놓고 봐 주는 사람이 없어요.</p>
            </div>
            <div className="card">
              <h4>아무도 묻지 않아요</h4>
              <p className="muted">병원과 약국은 약만 묻고 영양제는 묻지 않아요. 가족도 &ldquo;머 괜찮지 않을까?&rdquo; 하고 넘겨요.</p>
            </div>
            <div className="card">
              <h4>물어도 찜찜해요</h4>
              <p className="muted">AI에게 물으면 &ldquo;띄워 먹으면 문제없을 것 같다&rdquo;는 애매한 답이 와요. 근거가 없으니 믿어도 되는지 알 수 없어요.</p>
            </div>
          </div>
          <p className="problem" style={{ marginTop: 24 }}>
            &ldquo;같이 먹지 마세요&rdquo;는 약 설명서 안에만 적혀 있어요. TwoPills는 그 문장을 <strong>내 복용 목록</strong>에 연결해요.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="eyebrow">TwoPills가 다른 점</div>
          <h2>
            묻지 않아도 알려 주고, <b>근거를 보여 줘요</b>
          </h2>
          <div className="cmp-wrap" style={{ marginTop: 24 }}>
            <table className="cmp">
              <thead>
                <tr>
                  <th />
                  <th>유튜브·블로그·SNS</th>
                  <th>생성형 AI에게 묻기</th>
                  <th className="us">TwoPills</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>내 약과 같이 보나요</th>
                  <td>영상은 내 약을 몰라요</td>
                  <td>먹는 걸 매번 직접 적어야 해요</td>
                  <td className="us">한 번 등록하면 더할 때마다 자동으로 점검해요</td>
                </tr>
                <tr>
                  <th>근거가 보이나요</th>
                  <td>비전문가 말이라 틀릴 수 있어요</td>
                  <td>설명서 문구를 확인하지 못한 채 답하기도 해요</td>
                  <td className="us">원문 문장과 출처 링크를 그대로 보여 줘요</td>
                </tr>
                <tr>
                  <th>같은 질문에 같은 답인가요</th>
                  <td>사람마다 달라요</td>
                  <td>물을 때마다 달라질 수 있어요</td>
                  <td className="us">같은 조합에는 항상 같은 답이 나와요</td>
                </tr>
                <tr>
                  <th>그다음엔 무엇을 하나요</th>
                  <td>광고가 많아 고를 수 없어요</td>
                  <td>&ldquo;문제없을 것 같다&rdquo;에서 끝나요</td>
                  <td className="us">해야 할 행동, 약사에게 물을 질문, 리포트까지 줘요</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="eyebrow">이럴 때 열어 보세요</div>
          <h2>
            먹는 사람도, <b>챙겨 드리는 사람도</b>
          </h2>
          <div className="grid grid-3 who" style={{ marginTop: 24 }}>
            <div className="card">
              <div className="tag">20~30대</div>
              <h4>영양제를 고르거나 살 때</h4>
              <p className="muted">유튜브 추천으로 산 비타민을 먹다가 감기약을 먹게 됐다면, 같이 먹어도 되는지 먼저 확인하고 내 약과 부딪히지 않는 영양제를 추천받아요.</p>
            </div>
            <div className="card">
              <div className="tag">부모님께 사 드리는 자녀</div>
              <h4>사 드리기 전에</h4>
              <p className="muted">부모님 약과 사 드릴 영양제를 내 목록에 넣어 미리 점검하고, 리포트를 부모님이나 약사에게 보여 드려요.</p>
            </div>
            <div className="card">
              <div className="tag">약을 매일 드시는 부모님</div>
              <h4>읽기 어려운 성분표 대신 사진으로</h4>
              <p className="muted">약 상자나 봉투를 찍으면 후보를 찾아 줘요. 갑상선약처럼 흔히 부르는 이름으로 찾아도 돼요.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="eyebrow">사용 방법</div>
          <h2>
            네 단계면 <b>끝나요</b>
          </h2>
          <div className="grid grid-4" style={{ marginTop: 24 }}>
            <div className="card step">
              <div className="num">1</div>
              <h4>검색이나 사진으로 등록한다</h4>
              <p className="muted">약 봉투에 적힌 이름, 흔히 부르는 이름(갑상선약), 영양제 성분으로 찾아요.</p>
            </div>
            <div className="card step">
              <div className="num">2</div>
              <h4>더할 때 점검한다</h4>
              <p className="muted">새 항목의 성분 × 내 목록 모든 성분의 짝을 DB에서 찾아요.</p>
            </div>
            <div className="card step">
              <div className="num">3</div>
              <h4>경고와 출처를 확인한다</h4>
              <p className="muted">원문 문장, 해야 할 행동, 약사에게 물을 질문까지 같이 보여 줘요.</p>
            </div>
            <div className="card step">
              <div className="num">4</div>
              <h4>내 약과 부딪히지 않는 영양제를 추천받는다</h4>
              <p className="muted">설문으로 원하는 효과를 받고 DB 안에서만 골라요.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="eyebrow">근거</div>
          <h2>
            지어내지 않아요. <b>원문을 그대로</b> 보여 줘요
          </h2>
          <div className="grid grid-3" style={{ marginTop: 24 }}>
            <div className="card">
              <span className="badge">공식 자료</span>
              <h4 style={{ margin: '12px 0 8px' }}>식약처 e약은요</h4>
              <blockquote className="quote">인산염, 칼슘염, 경구용 테트라사이클린계 제제, 제산제, 레보도파와 함께 복용하지 마십시오.</blockquote>
              <p className="faint" style={{ marginTop: 8 }}>
                <a href={SRC_URL.R7} target="_blank" rel="noopener noreferrer">
                  비맥스제트정 e약은요
                </a>
              </p>
            </div>
            <div className="card">
              <span className="badge">공식 자료</span>
              <h4 style={{ margin: '12px 0 8px' }}>MedlinePlus</h4>
              <blockquote className="quote">탄산칼슘이나 황산제일철을 먹는다면 레보티록신보다 최소 4시간 전이나 뒤에 드세요.</blockquote>
              <p className="faint" style={{ marginTop: 8 }}>
                <a href={SRC_URL.R12} target="_blank" rel="noopener noreferrer">
                  Levothyroxine (MedlinePlus)
                </a>
              </p>
            </div>
            <div className="card">
              <span className="badge">논문</span>
              <h4 style={{ margin: '12px 0 8px' }}>PMC 논문 · 건강한 성인 8명 연구</h4>
              <blockquote className="quote">칼슘제와 함께 먹으면 레보티록신 흡수가 약 20~25% 줄었어요.</blockquote>
              <p className="faint" style={{ marginTop: 8 }}>
                <a href={SRC_URL.R3} target="_blank" rel="noopener noreferrer">
                  Thyroid, 2011
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="eyebrow">약속</div>
          <div className="grid grid-2">
            <div className="card card-soft">
              <h4>출처 없는 조합은 DB에 들어가지 못해요</h4>
              <p className="muted">원문을 열어 문장을 옮기고 다른 팀원이 대조한 것만 넣어요.</p>
            </div>
            <div className="card card-soft">
              <h4>AI는 판정하지 않아요</h4>
              <p className="muted">조합 판정에 AI 생성이 없어요. AI는 사진 글자 읽기와 추천 후보 고르기에만 써요.</p>
            </div>
            <div className="card card-soft">
              <h4>처방·진단·복용 중단 지시를 하지 않아요</h4>
              <p className="muted">경고해도 막지 않아요. &lsquo;그래도 추가&rsquo;와 &lsquo;취소&rsquo;는 사용자가 골라요.</p>
            </div>
            <div className="card card-soft">
              <h4>사진은 읽은 뒤 바로 지워요</h4>
              <p className="muted">보내기 전에 동의를 받고, 서버와 DB 어디에도 저장하지 않아요.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="band">
            <h3>
              먹고 있는 약과 영양제를 <b>한자리에</b> 모아 보세요
            </h3>
            <Link className="btn btn-primary btn-lg" href="/signup">
              회원가입
            </Link>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap">
          <div>
            <Logo />
            <p style={{ marginTop: 8 }}>SUMTECH 2026 루프톤 · 팀 늘크크</p>
          </div>
          <div className="prose">
            <p>{LANDING_DISCLAIMER}</p>
            <p>
              출처:{' '}
              <a href={SRC_URL.R7} target="_blank" rel="noopener noreferrer">
                식약처 e약은요
              </a>{' '}
              ·{' '}
              <a href={SRC_URL.R12} target="_blank" rel="noopener noreferrer">
                MedlinePlus
              </a>{' '}
              ·{' '}
              <a href={SRC_URL.R3} target="_blank" rel="noopener noreferrer">
                PMC
              </a>
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}

/** 로그인한 사람의 홈: '복용 목록'·'분석하기' 두 칸과 '영양제 추천받기'. 시연 계정이면 그 페르소나 설명을 위에 둔다. */
async function UserHome({ userId, email, name, inUse }: { userId: number; email: string; name: string; inUse: boolean }) {
  const [items, persona] = await Promise.all([listUserItems(userId), personaByEmail(email)])
  const sups = items.filter(isSupplement).length
  const drugs = items.length - sups
  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <div className="eyebrow">홈</div>
          <h2>
            안녕하세요, <b>{name}</b>님
          </h2>
        </div>

        {persona ? (
          <div className="card card-soft" style={{ marginBottom: 16 }} data-testid="persona-note">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>시연 계정 {persona.id} · 가상 인물</strong>
              <form action={enterPersona}>
                <input type="hidden" name="persona" value={persona.id} />
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
            <h3>분석하기</h3>
            <p className="muted" style={{ marginTop: 8 }}>
              {inUse ? '약사·의사에게 보여 줄 복용 리포트' : '다 넣은 뒤 한 번 분석하면, 그 뒤로는 더할 때마다 자동으로 점검해요'}
            </p>
          </Link>
        </div>
        <div style={{ marginTop: 24 }}>
          <Link className="btn btn-black btn-lg" href="/recommend" data-testid="home-recommend">
            영양제 추천받기
          </Link>
        </div>
        <div className="disclaimer" style={{ marginTop: 24 }}>
          {CONSULT_NOTE}
        </div>
      </div>
    </main>
  )
}
