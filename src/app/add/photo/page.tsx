import { redirect } from 'next/navigation'

// 예전 주소. 사진 등록은 검진하기 화면 등록 패널로 합쳤다.
export default function PhotoAddPage() {
  redirect('/check?mode=photo')
}
