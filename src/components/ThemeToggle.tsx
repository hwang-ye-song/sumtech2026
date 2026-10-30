'use client'

const KEY = 'twopills-theme'

/** 처음 그리기 전에 저장된 모드를 붙여, 새로고침할 때 어두운 화면이 잠깐 비치지 않게 한다(layout의 <head>에 넣는다). */
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem('${KEY}')==='light')document.documentElement.dataset.theme='light'}catch(e){}`

/**
 * 머리글의 해·달 버튼: 어두운 화면(기본) ↔ 화이트 모드. 고른 모드는 이 브라우저에만 기억한다.
 * 지금 모드는 <html data-theme>에만 두고, 아이콘은 CSS로 바꾼다(서버 렌더와 어긋나지 않게).
 */
export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement
    const light = root.dataset.theme !== 'light'
    if (light) root.dataset.theme = 'light'
    else delete root.dataset.theme
    try {
      localStorage.setItem(KEY, light ? 'light' : 'dark')
    } catch {}
  }
  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label="화이트 모드 켜고 끄기" title="화이트 모드 켜고 끄기" data-testid="theme-toggle">
      <svg className="ic-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      <svg className="ic-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
    </button>
  )
}
