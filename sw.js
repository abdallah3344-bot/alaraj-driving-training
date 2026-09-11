// عامل الخدمة لبرامج مدارس تعليم السياقة
// يُخزِّن ملفات البرنامج محلياً ليعمل بلا إنترنت، ولا يُخزِّن أي طلب سحابي
// (بيانات/مزامنة/مرفقات) حتى لا تُعرض بيانات قديمة وتُربك المزامنة.
const CACHE = 'driving-app-v1';

// لا نتخطّى الانتظار تلقائياً: ننتظر إذن البرنامج حتى لا تُعاد الصفحة أثناء عمل المستخدم
self.addEventListener('install', (e) => { /* ينتظر حتى تصل رسالة SKIP_WAITING */ });
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  // كل ما يخص السحابة يمر للشبكة مباشرة بلا تخزين
  if (/supabase\.co$/.test(url.hostname) || url.hostname.endsWith('supabase.co')) return;

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok && url.origin === self.location.origin) {
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      const fallback = await caches.match('./index.html') || await caches.match('./');
      if (fallback) return fallback;
      throw err;
    }
  })());
});
