import { useRef } from 'react'

// PRD.md §6 화면 구성 — 헤더: 제목 + 엑셀 업로드 버튼(관리자, F1) + 로그인/로그아웃(F4)
export default function Header({ onExcelFileSelected, isUploading, user, isAdmin, onLoginClick, onLogoutClick }) {
  const fileInputRef = useRef(null)

  function handleUploadButtonClick() {
    fileInputRef.current?.click()
  }

  function handleFileInputChange(event) {
    const file = event.target.files?.[0]
    // 같은 파일을 다시 선택해도 change 이벤트가 다시 발생하도록 값을 비워둔다.
    event.target.value = ''
    if (file) onExcelFileSelected(file)
  }

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <h1 className="text-lg font-semibold text-gray-900">우리 동네 카페 지도</h1>
      <div className="flex items-center gap-2">
        {isAdmin && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleUploadButtonClick}
              disabled={isUploading}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? '처리 중...' : '엑셀 업로드'}
            </button>
          </>
        )}
        {user ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              type="button"
              onClick={onLogoutClick}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onLoginClick}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            로그인
          </button>
        )}
      </div>
    </header>
  )
}
