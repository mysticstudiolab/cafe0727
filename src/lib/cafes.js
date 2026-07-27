import { supabase } from './supabaseClient'

// F1/F2 연동 — 엑셀 업로드로 지오코딩된 카페 목록을 `cafes` 테이블에 영구 저장하고,
// 로그인 여부와 무관하게(공개 SELECT) 지도 로드시 이 테이블에서 불러온다.
// (name, address) 유니크 제약 덕분에 upsert가 PRD §12의 재업로드 병합 정책을 그대로 구현한다.
export async function fetchAllCafes() {
  const { data, error } = await supabase
    .from('cafes')
    .select('id, name, address, category, lat, lng, geocode_status')
    .eq('geocode_status', 'success')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

// 성공/실패 지오코딩 결과를 모두 upsert한다 — RLS로 관리자만 쓸 수 있다(admin 화이트리스트, src/lib/admin.js).
export async function upsertCafes(rows) {
  const { error } = await supabase.from('cafes').upsert(
    rows.map((row) => ({
      name: row.name,
      address: row.address,
      category: row.category,
      lat: row.lat,
      lng: row.lng,
      geocode_status: row.geocode_status,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'name,address' },
  )

  if (error) throw error
}
