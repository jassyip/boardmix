const CACHE='boardmix-v3.2.0';
const SHELL=['/','/index.html','/assets/app.css?v=3.2.0','/assets/app.js?v=3.2.0','/assets/core.js','/assets/gomoku.js','/assets/bomb.js','/assets/ludo.js','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png','/icons/icon.svg'];
const SHELL_PATHS=new Set(SHELL.map(path=>new URL(path,self.location.origin).pathname));
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('boardmix-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{
    const cacheControl=response.headers.get('Cache-Control')||'',vary=response.headers.get('Vary')||'';
    const cacheableShell=SHELL_PATHS.has(url.pathname)&&!event.request.headers.has('Authorization')&&!/(?:^|,)\s*(?:private|no-store)(?:\s*(?:=|,|$))/i.test(cacheControl)&&!vary.split(',').some(value=>value.trim()==='*');
    if(cacheableShell&&response.status===200&&response.type==='basic'){
      const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));
    }
    return response;
  }).catch(error=>caches.match(event.request).then(hit=>{
    if(hit)return hit;
    if(event.request.mode==='navigate')return caches.match('/index.html').then(fallback=>fallback||Promise.reject(error));
    return Promise.reject(error);
  })));
});
