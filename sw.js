/* WEALTH PWA service worker — เปลือก cache-first · ข้อมูล (app.enc/app.json) network-first + cache fallback */
var VER = 'c5d3d0bf5c69';
var SHELL = 'wealth-shell-' + VER, DATA = 'wealth-data';
var SHELL_FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png',
                   'desktop/', 'desktop/index.html', 'desktop/desktop.webmanifest'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(SHELL).then(function(c){ return c.addAll(SHELL_FILES); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k.indexOf('wealth-shell-') === 0 && k !== SHELL; })
      .map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

function tagged(res){
  // บอกเปลือกว่าอันนี้มาจาก cache (ออฟไลน์/เซิร์ฟเวอร์ล่ม)
  var h = new Headers(res.headers); h.set('X-PWA-Cache', '1');
  return res.arrayBuffer().then(function(b){ return new Response(b, {status: 200, headers: h}); });
}

self.addEventListener('fetch', function(e){
  var url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== 'GET') return;
  var name = url.pathname.split('/').pop();
  if (name === 'app.enc' || name === 'app.json' || name === 'dash.enc' || name === 'dash.json' || name === 'index.html' || name === '') {   // เปลือกหลักก็ network-first ให้แก้แล้วเห็นทันที
    e.respondWith(fetch(e.request, {cache:'no-store'}).then(function(res){
      if (res.ok) { var cp = res.clone(); caches.open(DATA).then(function(c){ c.put(e.request, cp); }); }
      return res;
    }).catch(function(){
      return caches.match(e.request).then(function(c){ return c ? tagged(c) : new Response('offline', {status: 503}); });
    }));
    return;
  }
  if (name === 'sw.js') return;
  e.respondWith(caches.match(e.request).then(function(c){
    var net = fetch(e.request).then(function(res){
      if (res.ok) { var cp = res.clone(); caches.open(SHELL).then(function(cc){ cc.put(e.request, cp); }); }
      return res;
    }).catch(function(){ return c; });
    return c || net;
  }));
});
