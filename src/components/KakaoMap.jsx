import { useEffect, useRef, useState } from 'react'
import { loadKakaoMapScript, initKakaoMap, renderCafeMarkers, SEOUL_CITY_HALL_CENTER } from '../lib/kakaoMap'

// PRD.md §6 화면 구성 — 지도 메인 영역 (F2: 지오코딩 & 지도 마커 표시)
// focusTarget({ lat, lng })이 바뀌면 F5(내 방문 목록) 항목 클릭에 반응해 지도 중심을 옮긴다.
export default function KakaoMap({ cafes, onMarkerClick, focusTarget }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    loadKakaoMapScript()
      .then((kakao) => {
        if (cancelled || !containerRef.current) return
        mapRef.current = initKakaoMap(kakao, containerRef.current, SEOUL_CITY_HALL_CENTER)
        markersRef.current = renderCafeMarkers(kakao, mapRef.current, cafes, markersRef.current, onMarkerClick)
      })
      .catch((err) => setError(err.message))

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mapRef.current || !window.kakao) return
    markersRef.current = renderCafeMarkers(window.kakao, mapRef.current, cafes, markersRef.current, onMarkerClick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cafes])

  useEffect(() => {
    if (!mapRef.current || !window.kakao || !focusTarget) return
    mapRef.current.setCenter(new window.kakao.maps.LatLng(focusTarget.lat, focusTarget.lng))
    mapRef.current.setLevel(3)
  }, [focusTarget])

  if (error) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-red-300 bg-red-50 p-4 text-center text-sm text-red-600">
        {error}
      </div>
    )
  }

  return <div ref={containerRef} className="h-full w-full rounded-lg border border-gray-200" />
}
