// F5 — 내 방문 목록. 엑셀 업로드 여부와 무관하게, 로그인한 사용자가 visited=true로 체크한
// `visit_notes` 기록만 모아 보여준다. 항목 클릭 시 지도를 그 위치로 이동시킨다(onSelectVisit).
export default function MyVisitsSection({ isLoggedIn, visits, isLoading, error, onSelectVisit }) {
  return (
    <section className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">
        방문한 카페{isLoggedIn ? ` (${visits.length})` : ''}
      </h2>

      {!isLoggedIn && <p className="text-sm text-gray-500">로그인하면 방문한 카페를 모아볼 수 있어요.</p>}

      {isLoggedIn && error && (
        <p className="mb-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {isLoggedIn && isLoading && <p className="text-sm text-gray-500">불러오는 중...</p>}

      {isLoggedIn && !isLoading && !error && visits.length === 0 && (
        <p className="text-sm text-gray-500">아직 방문 체크한 카페가 없어요.</p>
      )}

      {isLoggedIn && !isLoading && visits.length > 0 && (
        <ul className="flex-1 space-y-2 overflow-y-auto">
          {visits.map((visit) => (
            <li key={`${visit.place_name}__${visit.address}`}>
              <button
                type="button"
                onClick={() => onSelectVisit(visit)}
                className="w-full rounded-md border border-gray-200 p-2 text-left hover:bg-gray-50"
              >
                <p className="font-medium text-gray-900">{visit.place_name}</p>
                <p className="text-xs text-gray-500">{visit.address}</p>
                {visit.impression && <p className="mt-1 text-sm text-gray-700">{visit.impression}</p>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
