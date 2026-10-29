'use client'

import { useEffect, useState } from 'react'

// 첫 화면 하단 패널의 '약속' 네 가지. 3.5초마다 넘어가고, 모션 줄이기 설정이면 첫 장에 멈춘다.
const SLIDES = [
  {
    bg: 'var(--brand)',
    text: '출처 없는 조합은 DB에 들어가지 못해요',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
        <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
      </svg>
    ),
  },
  {
    bg: '#3a3340',
    text: 'AI는 판정하지 않아요. 조합 판정은 DB 조회로만 해요',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
        <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
      </svg>
    ),
  },
  {
    bg: '#8a3a2c',
    text: '처방·진단·복용 중단 지시를 하지 않아요',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
      </svg>
    ),
  },
  {
    bg: '#7a5a14',
    text: '사진은 읽은 뒤 바로 지워요',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    ),
  },
]

export function PromiseCarousel() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 3500)
    return () => clearInterval(t)
  }, [])
  return (
    <>
      <div className="carousel" aria-live="polite">
        {SLIDES.map((s, i) => (
          <div key={s.text} className="slide" data-active={i === active} aria-hidden={i !== active}>
            <span className="ic" style={{ background: s.bg }}>
              {s.icon}
            </span>
            <p>{s.text}</p>
          </div>
        ))}
      </div>
      <div className="dots" aria-hidden="true">
        {SLIDES.map((s, i) => (
          <i key={s.text} className={i === active ? 'on' : undefined} />
        ))}
      </div>
    </>
  )
}
