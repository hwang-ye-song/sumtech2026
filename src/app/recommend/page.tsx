import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { ensureReady } from '@/lib/ready'
import { RecommendForm } from '@/components/RecommendForm'

export const metadata = { title: '영양제 추천' }

export default async function RecommendPage() {
  await ensureReady()
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/recommend')

  return (
    <main className="page">
      <div className="wrap" style={{ maxWidth: 800 }}>
        <RecommendForm />
      </div>
    </main>
  )
}
