/**
 * Vydys static-only cache: no authenticated responses, course documents,
 * payments, API calls or user information may be saved by the service worker.
 */
const CACHE_NAME="vydys-static-v2";
const STATIC_ASSETS=["/offline.html","/manifest.webmanifest","/vydys-icon.svg","/favicon.ico","/apple-touch-icon.png"];
const PRIVATE_PATH=/^\/(?:api|auth|connexion|paiement|admin|dashboard|formateur|apprendre|notifications|messages|parametres|onboarding|certificat)(?:\/|$)/i;

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>
    Promise.allSettled(STATIC_ASSETS.map(path=>cache.add(path)))
  ).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(key=>key.startsWith("vydys-static-")&&key!==CACHE_NAME)
      .map(key=>caches.delete(key))
  )).then(()=>self.clients.claim()));
});

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(PRIVATE_PATH.test(url.pathname))return;

  // Public navigation is never stored: on failure show only a generic offline page.
  if(request.mode==="navigate"){
    event.respondWith(fetch(request).catch(async()=>{
      const fallback=await caches.match("/offline.html");
      return fallback||Response.error();
    }));
    return;
  }

  // Only immutable application assets and the fixed public app shell are cached.
  const staticResource=url.pathname.startsWith("/_next/static/")||STATIC_ASSETS.includes(url.pathname);
  if(!staticResource)return;

  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
    if(response.ok&&response.type==="basic"){
      const copy=response.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)).catch(()=>{});
    }
    return response;
  })));
});
