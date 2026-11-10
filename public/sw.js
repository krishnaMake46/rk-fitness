const CACHE='rk-fitness-shell-v6';
const SHELL=['/','/manifest.webmanifest','/icons/rk-fitness-app-192-v2.png','/icons/rk-fitness-app-512-v2.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('rk-fitness-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  const pathname=new URL(request.url).pathname;
  const isVideo=/\.(mp4|webm|mov|m4v)$/i.test(pathname);
  // Video players use HTTP Range requests for seeking and streaming. Never send
  // partial 206 responses through Cache Storage; let the browser/server stream them.
  if(isVideo||request.headers.has('range')){
    event.respondWith(fetch(request));
    return;
  }
  event.respondWith((async()=>{
    try{
      const response=await fetch(request);
      if(response.ok&&response.type==='basic'){
        const cache=await caches.open(CACHE);
        await cache.put(request,response.clone());
      }
      return response;
    }catch{
      const cached=await caches.match(request);
      if(cached)return cached;
      if(request.mode==='navigate'){
        const shell=await caches.match('/');
        if(shell)return shell;
      }
      return new Response('RK FITNESS is offline. Reconnect and try again.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
    }
  })());
});
