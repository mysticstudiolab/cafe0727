// PRD 오픈 이슈 #1 — 관리자 판별은 환경변수 이메일 화이트리스트 방식으로 확정.
// RLS 정책(cafes 테이블)도 동일한 이메일을 하드코딩해 서버 쪽에서 실제로 강제한다 —
// 이 값은 UI에서 업로드 버튼을 보여줄지 결정하는 용도일 뿐, 보안 경계는 RLS다.
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',')
  .map((email) => email.trim())
  .filter(Boolean)

export function isAdminUser(user) {
  return Boolean(user?.email && ADMIN_EMAILS.includes(user.email))
}
