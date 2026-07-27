// PRD.md §6 화면 구성 — 카페 목록 카드 한 장. props는 §7.1 `cafes` 테이블 필드명과 동일하게 맞춘다.
export default function CafeCard({ cafe }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-gray-900">{cafe.name}</h3>
        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {cafe.category}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-500">{cafe.address}</p>
    </div>
  )
}
