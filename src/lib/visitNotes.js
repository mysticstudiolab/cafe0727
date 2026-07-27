import { supabase } from './supabaseClient'

// F4/F5 연동 — `visit_notes` 테이블에 (user_id, place_name, address) 조합으로 소감을 저장한다.
// 아직 `cafes` 테이블이 없어서(엑셀 결과는 프론트 state에만 존재) 카페 식별에 cafe_id 대신
// 이름+주소를 그대로 쓰고, 같은 조합의 유니크 제약(visit_notes_user_id_place_name_address_key)이
// "본인+같은 카페는 1행"을 DB 레벨에서 강제한다.
export async function fetchVisitNote(userId, cafe) {
  const { data, error } = await supabase
    .from('visit_notes')
    .select('visited, impression')
    .eq('user_id', userId)
    .eq('place_name', cafe.name)
    .eq('address', cafe.address)
    .maybeSingle()

  if (error) throw error
  return data
}

// upsert 대상 컬럼에 onConflict로 유니크 제약을 지정 — 신규 삽입이 아니라 기존 행 갱신이 되도록 한다.
export async function upsertVisitNote(userId, cafe, { visited, comment }) {
  const { error } = await supabase.from('visit_notes').upsert(
    {
      user_id: userId,
      place_name: cafe.name,
      address: cafe.address,
      lat: cafe.lat ?? null,
      lng: cafe.lng ?? null,
      visited,
      impression: comment,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,place_name,address' },
  )

  if (error) throw error
}

// F5 — "내 방문 목록": 본인이 visited=true로 체크한 기록만 최신순으로 불러온다.
// select 자체가 user_id 필터 없이도 RLS(auth.uid() = user_id)로 본인 행만 보이지만,
// 쿼리 의도를 명시하고 다른 계정 전환 시에도 실수로 캐시가 섞이지 않도록 eq 필터를 그대로 둔다.
export async function fetchMyVisitedCafes(userId) {
  const { data, error } = await supabase
    .from('visit_notes')
    .select('place_name, address, lat, lng, impression, updated_at')
    .eq('user_id', userId)
    .eq('visited', true)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data
}

// 세션 만료/RLS 위반으로 인한 실패인지 판별 — 이 경우 일반 에러 화면 대신 재로그인 안내를 보여준다.
export function isAuthRelatedError(error) {
  const code = error?.code ?? ''
  const message = error?.message ?? ''
  return code === '42501' || code === 'PGRST301' || /jwt/i.test(message) || /row-level security/i.test(message)
}
