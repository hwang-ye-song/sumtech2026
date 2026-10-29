/** 화면을 옮길 때 서버 응답을 기다리는 동안 보여 준다(눌렀는데 반응이 없어 보이지 않게). */
export default function Loading() {
  return (
    <main className="page">
      <div className="wrap loading" role="status" aria-live="polite">
        <span className="loading-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="muted">불러오는 중이에요</span>
      </div>
    </main>
  )
}
