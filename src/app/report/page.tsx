import { redirect } from 'next/navigation'

// 예전 주소. 복용 리포트는 검진 리포트로 합쳤다.
export default function ReportPage() {
  redirect('/check/report')
}
