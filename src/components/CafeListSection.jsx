import CafeCard from './CafeCard'

// PRD.md §6 화면 구성 — 지도 아래 카페 목록 카드 영역
export default function CafeListSection({ cafes }) {
  return (
    <section className="px-6 py-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">카페 목록 ({cafes.length})</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cafes.map((cafe) => (
          <CafeCard key={cafe.id} cafe={cafe} />
        ))}
      </div>
    </section>
  )
}
