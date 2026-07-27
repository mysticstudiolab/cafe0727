import { useEffect, useState } from 'react'
import Header from './components/Header'
import KakaoMap from './components/KakaoMap'
import CafeListSection from './components/CafeListSection'
import CafeDetailPopup from './components/CafeDetailPopup'
import FailedCafeList from './components/FailedCafeList'
import AuthDialog from './components/AuthDialog'
import MyVisitsSection from './components/MyVisitsSection'
import { parseCafeExcelFile } from './lib/excel'
import { loadKakaoMapScript, geocodeCafeRows } from './lib/kakaoMap'
import { fetchVisitNote, upsertVisitNote, fetchMyVisitedCafes, isAuthRelatedError } from './lib/visitNotes'
import { fetchAllCafes, upsertCafes } from './lib/cafes'
import { isAdminUser } from './lib/admin'
import { useAuth } from './context/AuthContext'

const EMPTY_VISIT = { visited: false, comment: '' }
const SESSION_EXPIRED_MESSAGE = '로그인이 만료됐어요. 다시 로그인한 뒤 시도해주세요.'
const GENERIC_VISIT_ERROR_MESSAGE = '소감을 불러오지 못했어요. 잠시 후 다시 시도해주세요.'
const GENERIC_SAVE_ERROR_MESSAGE = '소감을 저장하지 못했어요. 잠시 후 다시 시도해주세요.'

export default function App() {
  const { user, signOut } = useAuth()
  const [cafes, setCafes] = useState([])
  const [failedCafes, setFailedCafes] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [cafesLoadError, setCafesLoadError] = useState(null)
  const [selectedCafeId, setSelectedCafeId] = useState(null)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  // cafeId -> { visited, comment }. `visit_notes` 테이블(user_id, place_name, address 유니크)에서
  // 불러온/저장한 값의 로컬 캐시.
  const [visitsByCafeId, setVisitsByCafeId] = useState({})
  const [isLoadingVisit, setIsLoadingVisit] = useState(false)
  const [isSavingVisit, setIsSavingVisit] = useState(false)
  const [visitError, setVisitError] = useState(null)
  // F5 — 내 방문 목록(visited=true인 visit_notes만) 및 목록 클릭 시 지도 이동 대상.
  const [myVisits, setMyVisits] = useState([])
  const [isLoadingMyVisits, setIsLoadingMyVisits] = useState(false)
  const [myVisitsError, setMyVisitsError] = useState(null)
  const [mapFocusTarget, setMapFocusTarget] = useState(null)

  const selectedCafe = cafes.find((cafe) => cafe.id === selectedCafeId) ?? null

  // 카페 목록은 Supabase `cafes` 테이블에 영구 저장돼 있으므로, 로그인 여부/엑셀 업로드 여부와
  // 무관하게 앱이 켜질 때 한 번 불러온다(공개 SELECT라 비로그인 상태에서도 조회 가능).
  useEffect(() => {
    let cancelled = false

    fetchAllCafes()
      .then((rows) => {
        if (!cancelled) setCafes(rows)
      })
      .catch((err) => {
        if (!cancelled) setCafesLoadError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function refreshMyVisits(userId) {
    setIsLoadingMyVisits(true)
    setMyVisitsError(null)

    try {
      const rows = await fetchMyVisitedCafes(userId)
      setMyVisits(rows)
    } catch (err) {
      setMyVisitsError(isAuthRelatedError(err) ? SESSION_EXPIRED_MESSAGE : GENERIC_VISIT_ERROR_MESSAGE)
    } finally {
      setIsLoadingMyVisits(false)
    }
  }

  // 로그인/로그아웃/계정 전환 시(user.id 변경) 목록을 새로 불러온다. 로그아웃 상태면 비운다 —
  // 계정을 바꿔 로그인했을 때 이전 계정의 목록이 잠깐이라도 남아 보이지 않도록.
  useEffect(() => {
    if (!user) {
      setMyVisits([])
      setMyVisitsError(null)
      return
    }
    refreshMyVisits(user.id)
  }, [user?.id])

  function handleSelectMyVisit(visit) {
    if (visit.lat == null || visit.lng == null) return
    setMapFocusTarget({ lat: visit.lat, lng: visit.lng })
  }

  // 마커를 클릭해 팝업이 열릴 때(로그인 상태라면) 본인이 예전에 남긴 체크/소감을 불러와 채워 넣는다.
  useEffect(() => {
    if (!selectedCafe || !user) return

    let cancelled = false
    setIsLoadingVisit(true)
    setVisitError(null)

    fetchVisitNote(user.id, selectedCafe)
      .then((note) => {
        if (cancelled) return
        setVisitsByCafeId((prev) => ({
          ...prev,
          [selectedCafe.id]: note ? { visited: note.visited, comment: note.impression ?? '' } : EMPTY_VISIT,
        }))
      })
      .catch((err) => {
        if (cancelled) return
        setVisitError(isAuthRelatedError(err) ? SESSION_EXPIRED_MESSAGE : GENERIC_VISIT_ERROR_MESSAGE)
      })
      .finally(() => {
        if (!cancelled) setIsLoadingVisit(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedCafe?.id, user?.id])

  async function saveVisit(cafeId, partialVisit) {
    const cafe = cafes.find((c) => c.id === cafeId)
    if (!cafe || !user) return

    const nextVisit = { ...EMPTY_VISIT, ...visitsByCafeId[cafeId], ...partialVisit }
    setIsSavingVisit(true)
    setVisitError(null)

    try {
      await upsertVisitNote(user.id, cafe, nextVisit)
      setVisitsByCafeId((prev) => ({ ...prev, [cafeId]: nextVisit }))
      // 방문 체크가 바뀌었을 수 있으니(체크/해제) 내 방문 목록도 최신 상태로 다시 불러온다.
      refreshMyVisits(user.id)
    } catch (err) {
      setVisitError(isAuthRelatedError(err) ? SESSION_EXPIRED_MESSAGE : GENERIC_SAVE_ERROR_MESSAGE)
    } finally {
      setIsSavingVisit(false)
    }
  }

  function handleMarkerClick(cafe) {
    setSelectedCafeId(cafe.id)
  }

  // 소감 저장 팝업에서 로그인이 필요할 때: 팝업을 닫고 로그인/회원가입 다이얼로그를 연다.
  function handleRequireLogin() {
    setSelectedCafeId(null)
    setIsAuthDialogOpen(true)
  }

  // F1 + F2: 엑셀 업로드 → 파싱 → 주소 하나씩 순차 지오코딩 → `cafes` 테이블에 upsert(PRD §12: (name,
  // address) 기준 병합) → DB 기준으로 다시 불러와 지도 마커 갱신. 이렇게 하면 다른 관리자가 이전에
  // 올려둔 카페와도 병합된 최신 상태가 되고, 새로고침/재접속해도 이번에 올린 카페가 그대로 남는다.
  async function handleExcelFileSelected(file) {
    setUploadError(null)
    setIsUploading(true)
    setSelectedCafeId(null)

    try {
      const rows = await parseCafeExcelFile(file)
      const kakao = await loadKakaoMapScript()
      const { cafes: geocodedCafes, failedCafes: failed } = await geocodeCafeRows(kakao, rows)

      await upsertCafes([...geocodedCafes, ...failed])
      const refreshedCafes = await fetchAllCafes()

      setCafes(refreshedCafes)
      setFailedCafes(failed)
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const selectedVisit = visitsByCafeId[selectedCafeId] ?? EMPTY_VISIT

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header
        onExcelFileSelected={handleExcelFileSelected}
        isUploading={isUploading}
        user={user}
        isAdmin={isAdminUser(user)}
        onLoginClick={() => setIsAuthDialogOpen(true)}
        onLogoutClick={signOut}
      />

      {uploadError && (
        <div className="mx-6 mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {uploadError}
        </div>
      )}

      {cafesLoadError && (
        <div className="mx-6 mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          카페 목록을 불러오지 못했어요: {cafesLoadError}
        </div>
      )}

      <FailedCafeList failedCafes={failedCafes} />

      <main className="flex flex-1 flex-col">
        <div className="flex h-[420px] w-full gap-4 px-6 pt-4">
          <div className="flex-1">
            <KakaoMap cafes={cafes} onMarkerClick={handleMarkerClick} focusTarget={mapFocusTarget} />
          </div>
          <div className="w-72 shrink-0">
            <MyVisitsSection
              isLoggedIn={Boolean(user)}
              visits={myVisits}
              isLoading={isLoadingMyVisits}
              error={myVisitsError}
              onSelectVisit={handleSelectMyVisit}
            />
          </div>
        </div>

        <CafeListSection cafes={cafes} />
      </main>

      <CafeDetailPopup
        cafe={selectedCafe}
        visited={selectedVisit.visited}
        comment={selectedVisit.comment}
        onSave={(draft) => saveVisit(selectedCafeId, draft)}
        onOpenChange={(open) => {
          if (!open) setSelectedCafeId(null)
        }}
        isLoggedIn={Boolean(user)}
        onRequireLogin={handleRequireLogin}
        isLoadingVisit={isLoadingVisit}
        isSavingVisit={isSavingVisit}
        visitError={visitError}
      />

      <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />
    </div>
  )
}
