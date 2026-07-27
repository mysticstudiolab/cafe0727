import { precacheAndRoute, matchPrecache } from 'workbox-precaching'

// 카카오맵/Supabase 요청은 온라인 상태에서만 의미가 있으므로 앱 셸을 통째로 오프라인
// 캐싱하지 않는다 — 오프라인일 때 낡은 화면을 보여주는 대신 안내 페이지만 보여준다.
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return

  event.respondWith(fetch(event.request).catch(() => matchPrecache('offline.html')))
})
