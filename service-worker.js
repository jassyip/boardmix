const CACHE_NAME='boardmix-v3.1.0';
const APP_SHELL=['/','/index.html','/assets/app.css?v=3.1.0','/assets/app.js?v=3.1.0','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png','/icons/icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(response=>{if(response.ok&&new URL(event.request.url).origin===location.origin){const clone=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,clone))}return response}).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('/index.html'))))});
