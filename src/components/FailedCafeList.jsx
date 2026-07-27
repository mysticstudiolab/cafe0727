// PRD.md F2 — 지오코딩(주소→좌표 변환)에 실패한 카페를 사라지게 두지 않고 목록으로 안내한다.
export default function FailedCafeList({ failedCafes }) {
  if (failedCafes.length === 0) return null

  return (
    <div className="mx-6 mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <p className="font-medium">주소를 찾지 못한 카페 {failedCafes.length}개 (지도에는 표시되지 않음)</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {failedCafes.map((cafe) => (
          <li key={cafe.id}>
            {cafe.name} — {cafe.address}
          </li>
        ))}
      </ul>
    </div>
  )
}
