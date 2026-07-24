/**
 * PKH 2026 Service Worker
 * - 정적 자산 캐싱 (오프라인 지원)
 * - Google Apps Script / YouTube API 등 외부 요청은 캐시 제외
 */

const CACHE_NAME  = 'pkh2026-v3';
const CACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './images/title.png',
  './images/favicon.ico',
];

/* 설치: 핵심 파일 캐시 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* 활성화: 이전 버전 캐시 삭제 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* 요청 처리 */
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 외부 요청(Google APIs, YouTube, Fonts 등)은 서비스워커 통과
  if (!url.startsWith(self.location.origin)) return;

  // GET 요청만 캐시 처리
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        // 유효한 응답만 캐시에 저장
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached); // 네트워크 실패 시 캐시 반환

      // 캐시 있으면 즉시 반환, 동시에 백그라운드에서 갱신
      return cached || networkFetch;
    })
  );
});
