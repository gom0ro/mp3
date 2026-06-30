const CACHE_NAME = 'vibeplayer-v1'
const ASSETS = ['/', '/index.html']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))
  )
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Cache audio files on first play
  if (url.pathname.match(/\.(mp3|wav|ogg|flac|aac|m4a|wma)$/i)) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
          return res
        })
        .catch(() => caches.match(e.request))
    )
    return
  }

  // Cache-first for app shell
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request))
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  )
})
