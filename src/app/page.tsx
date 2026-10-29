import Link from 'next/link'
import { Logo } from '@/components/Header'

const LANDING_DISCLAIMER = '이 서비스는 처방이나 진단을 하지 않아요. 복용을 바꾸기 전에 약사·의사와 상담하세요'
const SRC_URL = {
  R3: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3092723/',
  R7: 'https://nedrug.mfds.go.kr/searchEasyDrug/easyDetail?itemSeq=202300436',
  R12: 'https://medlineplus.gov/druginfo/meds/a682461.html',
}

/** 첫 화면(TwoPills 로고를 누르면 로그인 여부와 상관없이 항상 이 소개 화면으로 온다. 내 계정 화면은 /mypage) */
export default function HomePage() {
  return <Landing />
}

/** 헤드라인 단어 하나. 아래에서 올라오며 나타난다(wordReveal). dim은 흐리게, em은 굵게. */
function Word({ t, d, dim, em }: { t: string; d: number; dim?: boolean; em?: boolean }) {
  return (
    <span className={`word${dim ? ' dim' : ''}${em ? ' em' : ''}`}>
      <span style={{ animationDelay: `${d}s` }}>{t}</span>
    </span>
  )
}

/** 첫 화면(프로토타입 랜딩). 로그인 여부와 상관없이 TwoPills 로고를 누르면 항상 이 화면이다. */
function Landing() {
  return (
    <main>
      <section className="hero2" aria-label="소개">
        <div className="wrap body">
          <h1 className="hero-main">
            <span className="line">
              <Word t="약과" d={0.3} />
              <Word t="영양제," d={0.4} />
              <Word t="같이" d={0.5} />
              <Word t="먹기" d={0.6} />
              <Word t="전에" d={0.7} />
              <Word t="TwoPills" d={0.9} em />
            </span>
          </h1>
          <div className="cta2 animate-fade-up delay-600">
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
              지금 시작하기
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
