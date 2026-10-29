// Next.js가 서버를 시작할 때 한 번 부른다. 여기서 스키마를 만들고 시드를 넣기 시작한다.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startApp } = await import('./lib/ready')
    // 실패는 readyState()에 남고 /__health가 503으로 알린다.
    startApp().catch(() => {})
  }
}
