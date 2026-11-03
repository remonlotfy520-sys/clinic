const CACHE_NAME = 'clinic-shell-v3';
const SHELL_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@500;700;800&family=Tajawal:wght@400;500;700&display=swap',
  'https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // منسيبش طلبات جوجل الحقيقية (تسجيل الدخول والبيانات) - دي لازم تروح للنت مباشرة
  // الموقع نفسه بيتعامل مع فشلها (لو حصل) بطريقته الخاصة
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('securetoken.googleapis.com')
  ) {
    return;
  }

  // الصفحات: الأحدث من النت الأول (عشان التحديثات توصل فورًا)، ولو مفيش نت نفتح النسخة المحفوظة
  // الصفحة الرئيسية بتتحفظ باسم index.html، وأي صفحة تانية (زي secretary.html) بتتحفظ باسمها هي
  if (event.request.mode === 'navigate') {
    const path = new URL(event.request.url).pathname;
    const isMain = path.endsWith('/') || path.endsWith('/index.html');
    const key = isMain ? './index.html' : event.request;
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(key, copy));
          }
          return response;
        })
        .catch(() => caches.match(key).then((c) => c || (isMain ? caches.match('./') : undefined)))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
