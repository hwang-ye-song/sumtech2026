import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Header } from '@/components/Header'
import { SERVICE_DESCRIPTION, SERVICE_NAME, SERVICE_TAGLINE } from '@/lib/brand'

export const metadata: Metadata = {
  title: { default: `${SERVICE_NAME} — ${SERVICE_TAGLINE}`, template: `%s · ${SERVICE_NAME}` },
  description: SERVICE_DESCRIPTION,
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-dvh">
        <Header />
        <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6">{children}</main>
      </body>
    </html>
  )
}
