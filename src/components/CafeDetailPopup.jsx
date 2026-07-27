import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'

// PRD.md §6 화면 구성 — 마커 상세 팝업 (F3: 방문 여부 체크 + 한줄 소감 입력)
// visited/comment는 실제로는 `visit_notes` 테이블의 visited/impression 컬럼과 연결된다(App.jsx 참고).
// 지도/마커 조회는 비로그인도 가능해야 하므로, 이 팝업 자체는 누구에게나 열리고
// 방문 체크/소감 작성(저장)만 로그인(isLoggedIn)을 요구한다.
export default function CafeDetailPopup({
  cafe,
  visited,
  comment,
  onSave,
  onOpenChange,
  isLoggedIn,
  onRequireLogin,
  isLoadingVisit,
  isSavingVisit,
  visitError,
}) {
  const [draftVisited, setDraftVisited] = useState(visited)
  const [draftComment, setDraftComment] = useState(comment)

  // 다른 카페 마커를 클릭했거나(= cafe.id 변경), 바깥에서 불러오거나 저장된 값이 바뀌면
  // 입력 초안을 그 값으로 다시 맞춘다. 불러오는 중(isLoadingVisit)에는 아직 반영하지 않는다 —
  // 그 사이 사용자가 입력을 시작했다면 뒤늦게 도착한 빈 값으로 덮어써버릴 수 있기 때문.
  useEffect(() => {
    if (isLoadingVisit) return
    setDraftVisited(visited)
    setDraftComment(comment)
  }, [cafe?.id, visited, comment, isLoadingVisit])

  function handleSaveClick() {
    onSave({ visited: draftVisited, comment: draftComment })
  }

  return (
    <Dialog open={Boolean(cafe)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cafe?.name}</DialogTitle>
          <DialogDescription>{cafe?.address}</DialogDescription>
        </DialogHeader>

        {isLoggedIn ? (
          <>
            {visitError && (
              <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {visitError}
              </p>
            )}

            {isLoadingVisit ? (
              <p className="text-sm text-gray-500">이전 기록을 불러오는 중...</p>
            ) : (
              <>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={draftVisited}
                    onChange={(e) => setDraftVisited(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  방문했어요
                </label>

                <textarea
                  value={draftComment}
                  onChange={(e) => setDraftComment(e.target.value)}
                  placeholder="한줄 소감을 남겨보세요"
                  rows={3}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-gray-500 focus:outline-none"
                />

                <DialogFooter>
                  <button
                    type="button"
                    onClick={handleSaveClick}
                    disabled={isSavingVisit}
                    className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingVisit ? '저장 중...' : '저장'}
                  </button>
                </DialogFooter>
              </>
            )}
          </>
        ) : (
          <p className="rounded-md border border-dashed border-gray-300 p-3 text-sm text-gray-500">
            방문 체크와 소감은{' '}
            <button type="button" onClick={onRequireLogin} className="font-medium text-gray-900 underline">
              로그인
            </button>{' '}
            후 남길 수 있어요.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
