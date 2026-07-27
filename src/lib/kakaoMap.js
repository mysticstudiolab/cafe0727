// 카카오맵 SDK 로딩 및 마커 렌더링 헬퍼.
// PRD.md §10(외부 연동), CLAUDE.md 아키텍처 제약을 그대로 반영:
// - 프론트엔드에서 직접 SDK를 로드하고 지오코딩까지 호출한다 (백엔드 프록시 없음)
// - `libraries=services`를 반드시 포함해야 주소→좌표 변환(Geocoder)을 쓸 수 있다
// - 마커를 다시 그릴 때는 기존 마커를 전부 지운 뒤 새로 그린다

export const SEOUL_CITY_HALL_CENTER = { lat: 37.5665, lng: 126.978 }

const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY

let kakaoScriptPromise = null

export function loadKakaoMapScript() {
  if (kakaoScriptPromise) return kakaoScriptPromise

  kakaoScriptPromise = new Promise((resolve, reject) => {
    if (window.kakao && window.kakao.maps) {
      resolve(window.kakao)
      return
    }

    if (!KAKAO_MAP_KEY) {
      reject(new Error('VITE_KAKAO_MAP_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.'))
      return
    }

    const script = document.createElement('script')
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&libraries=services&autoload=false`
    script.onload = () => {
      window.kakao.maps.load(() => resolve(window.kakao))
    }
    script.onerror = () => reject(new Error('카카오맵 SDK 로드에 실패했습니다.'))
    document.head.appendChild(script)
  })

  return kakaoScriptPromise
}

export function initKakaoMap(kakao, container, center) {
  return new kakao.maps.Map(container, {
    center: new kakao.maps.LatLng(center.lat, center.lng),
    level: 4,
  })
}

// 카카오맵 기본 마커는 색상을 옵션으로 지정할 수 없어서, 빨간 핀 모양 SVG를 마커 이미지로 만들어 쓴다.
function createRedMarkerImage(kakao) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" viewBox="0 0 24 30">' +
    '<path fill="#dc2626" stroke="#991b1b" stroke-width="0.5" ' +
    'd="M12 0C5.373 0 0 5.373 0 12c0 8.25 12 18 12 18s12-9.75 12-18c0-6.627-5.373-12-12-12zm0 16a4 4 0 110-8 4 4 0 010 8z"/>' +
    '</svg>'
  const src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
  const size = new kakao.maps.Size(24, 30)
  const options = { offset: new kakao.maps.Point(12, 30) }
  return new kakao.maps.MarkerImage(src, size, options)
}

// 주소 하나를 좌표로 변환한다. 실패(ZERO_RESULT 등)하면 null을 반환한다.
export function geocodeAddress(kakao, address) {
  return new Promise((resolve) => {
    const geocoder = new kakao.maps.services.Geocoder()
    geocoder.addressSearch(address, (result, status) => {
      if (status === kakao.maps.services.Status.OK && result[0]) {
        resolve({ lat: Number(result[0].y), lng: Number(result[0].x) })
      } else {
        resolve(null)
      }
    })
  })
}

// 엑셀에서 파싱된 카페 행들을 하나씩 순서대로 지오코딩한다 (동시 병렬 호출 금지).
// 성공한 카페와 실패한 카페를 나눠서 반환하며, 실패한 카페는 화면의 "못 찾음" 목록에 쓰인다.
export async function geocodeCafeRows(kakao, rows) {
  const cafes = []
  const failedCafes = []

  for (const row of rows) {
    const id = `${row.name}__${row.address}`
    const coords = await geocodeAddress(kakao, row.address)

    if (coords) {
      cafes.push({ id, ...row, lat: coords.lat, lng: coords.lng, geocode_status: 'success' })
    } else {
      failedCafes.push({ id, ...row, lat: null, lng: null, geocode_status: 'failed' })
    }
  }

  return { cafes, failedCafes }
}

// 이전 마커를 모두 지운 뒤 cafes 배열로 새 마커를 그려서 반환한다.
export function renderCafeMarkers(kakao, map, cafes, previousMarkers, onMarkerClick) {
  previousMarkers.forEach((marker) => marker.setMap(null))

  const redMarkerImage = createRedMarkerImage(kakao)

  return cafes
    .filter((cafe) => cafe.geocode_status === 'success' && cafe.lat != null && cafe.lng != null)
    .map((cafe) => {
      const marker = new kakao.maps.Marker({
        map,
        position: new kakao.maps.LatLng(cafe.lat, cafe.lng),
        title: cafe.name,
        image: redMarkerImage,
      })

      if (onMarkerClick) {
        kakao.maps.event.addListener(marker, 'click', () => onMarkerClick(cafe))
      }

      return marker
    })
}
