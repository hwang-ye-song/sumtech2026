import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Header } from '@/components/Header'
import { PillField } from '@/components/PillField'
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
  return (
    <html lang="ko">
      <body>
        <PillField />
        <div id="app">
          <Header />
          {children}
        </div>
      </body>
    </html>
  )
}
