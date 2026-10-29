/**
 * 주소를 바꾸는 버튼. 링크 대신 GET 폼의 버튼으로 그려, 화면 스크립트가 준비되기 전에 눌러도 동작하고
 * 화면에서는 '버튼'으로 보인다(scenarios.yaml의 "~를 누른다"와 같은 이름·역할).
 */
export function GetButton({
  action,
  params,
  children,
  ...rest
}: {
  action: string
  params: Record<string, string>
  children: React.ReactNode
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'>) {
  return (
    <form method="get" action={action} style={{ display: 'contents' }}>
      {Object.entries(params).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" {...rest}>
        {children}
      </button>
    </form>
  )
}
