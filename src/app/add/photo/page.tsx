import { redirect } from 'next/navigation'

// 예전 주소. 사진 등록은 복용 목록 화면 왼쪽 패널로 합쳤다.
export default function PhotoAddPage() {
  redirect('/list?mode=photo')
}
