import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Header } from '@/components/Header'
import { PillField } from '@/components/PillField'
import { getCurrentUser } from '@/lib/session'
import { SERVICE_DESCRIPTION, SERVICE_NAME, SERVICE_TAGLINE } from '@/lib/brand'

export const metadata: Metadata = {
  title: { default: `${SERVICE_NAME} — ${SERVICE_TAGLINE}`, template: `%s · ${SERVICE_NAME}` },
  description: SERVICE_DESCRIPTION,
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser()
  return (
    <html lang="ko">
      {/* 로그인하면 휴대폰에서 아래 탭이 생기므로 body에 app을 붙여 아래 여백을 둔다. */}
      <body className={user ? 'app' : undefined}>
        <PillField />
        <div id="app">
          <Header />
          {children}
        </div>
      </body>
    </html>
  )
}
