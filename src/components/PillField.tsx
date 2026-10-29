'use client'

import { useEffect, useRef } from 'react'

// 사진(1152×2048)에서 알약 하나씩 잘라 낸 값. c = [x, y, w, h]. 알약 둘레 여백을 두고 가장자리를 흐려 배경에 녹인다
// side: 왼쪽/오른쪽 가장자리, j: 여백 안에서 흔드는 정도, speed: 스크롤을 얼마나 따라가는가(클수록 가깝다)
const FIELD = [
  { c: [191, 836, 299, 483], side: 'L', j: 0, y: 60, speed: 0.34, rot: 0.01, base: -8, k: 0.95 },
  { c: [160, 1384, 376, 391], side: 'L', j: 0.15, y: 420, speed: 0.12, rot: 0.016, base: 10, k: 0.7 },
  { c: [0, 1292, 311, 294], side: 'L', j: -0.1, y: 250, speed: 0.22, rot: -0.012, base: -18, k: 0.85 },
  { c: [252, 181, 468, 371], side: 'L', j: 0.1, y: 640, speed: 0.28, rot: 0.014, base: 6, k: 0.9 },
  { c: [350, 1655, 289, 202], side: 'L', j: -0.15, y: 820, speed: 0.09, rot: -0.018, base: 14, k: 0.6 },
  { c: [723, 595, 263, 514], side: 'R', j: 0, y: 120, speed: 0.3, rot: -0.01, base: 12, k: 0.85 },
  { c: [411, 457, 391, 432], side: 'R', j: 0.12, y: 500, speed: 0.14, rot: 0.02, base: -6, k: 0.75 },
  { c: [698, 1184, 412, 396], side: 'R', j: -0.1, y: 300, speed: 0.36, rot: 0.008, base: -12, k: 0.95 },
  { c: [800, 0, 326, 336], side: 'R', j: 0.1, y: 700, speed: 0.18, rot: -0.016, base: 20, k: 0.85 },
  { c: [959, 457, 193, 324], side: 'R', j: -0.12, y: 880, speed: 0.1, rot: 0.012, base: 0, k: 0.6 },
]

/** 화면 양옆 여백에서 스크롤에 따라 흘러가는 알약 사진(프로토타입의 #pillfield) */
export function PillField() {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    let pills: { el: HTMLDivElement; f: (typeof FIELD)[number] }[] = []
    let queued = false

    const build = () => {
      el.innerHTML = ''
      // 글이 있는 가운데(최대 1120px)는 비우고, 양옆 여백 안에만 알약을 둔다. 여백이 좁으면(휴대폰·작은 창) 알약을 숨긴다
      const gutter = Math.max(0, (window.innerWidth - 1120) / 2)
      el.style.display = gutter < 56 ? 'none' : ''
      if (gutter < 56) {
        pills = []
        return
      }
      pills = FIELD.map((f) => {
        const w = Math.round(Math.min(f.c[2] * 1.1, gutter * f.k))
        const off = Math.max(0, (gutter - w) / 2 + gutter * f.j * 0.5)
        const p = document.createElement('div')
        p.className = 'fpill'
        p.style.cssText = `--cx:${f.c[0]};--cy:${f.c[1]};--cw:${f.c[2]};--ch:${f.c[3]};width:${w}px;${f.side === 'L' ? 'left' : 'right'}:${Math.round(off)}px`
        el.appendChild(p)
        return { el: p, f }
      })
    }
    const paint = () => {
      queued = false
      const vh = window.innerHeight
      const sy = window.scrollY
      for (const { el: p, f } of pills) {
        const h = p.offsetHeight
        const loop = vh + h * 2
        // 알약마다 다른 속도로 위로 흘러가다 화면 밖으로 나가면 반대쪽에서 다시 들어온다
        const y = ((((f.y * vh) / 900 - (reduceMotion ? 0 : sy) * f.speed) % loop) + loop) % loop - h
        const r = f.base + (reduceMotion ? 0 : sy * f.rot)
        p.style.transform = `translate3d(0,${y.toFixed(1)}px,0) rotate(${r.toFixed(2)}deg)`
      }
    }
    const queue = () => {
      if (!queued) {
        queued = true
        requestAnimationFrame(paint)
      }
    }
    const onResize = () => {
      build()
      queue()
    }
    build()
    queue()
    window.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', queue)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return <div id="pillfield" ref={host} aria-hidden="true" />
}
