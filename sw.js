// 武家合戦: plays from the copy saved on the phone first; only a genuine, complete game page from the server updates it.
const CACHE='buke-v51';
const CORE=['./','index.html','gfx.js','manifest.webmanifest','icon-192.png','icon-512.png','icon-180.png','icon-1024.png'];
const MARK='name="app-id" content="buke-kassen"';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(CORE.map(u=>fetch(u,{cache:'reload'}).then(r=>{if(r.ok)return c.put(u,r);}).catch(()=>{})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&!k.startsWith('buke-keep')).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
let UPDATED=false;
// the page asks after it has loaded, in case the news came before it was listening
self.addEventListener('message',e=>{if(e.data==='buke-check'&&UPDATED&&e.source)e.source.postMessage({type:'buke-updated'});});
async function freshGame(req){
  // accept a new page only if it is really this game (not an error, maintenance or "suspended" page)
  try{const r=await fetch(req,{cache:'no-store'});if(!r.ok||r.redirected)return null;const t=await r.clone().text();
    if(t.length<50000||!t.includes(MARK))return null;const c=await caches.open(CACHE);
    const old=await c.match('index.html');const was=old?await old.text():null;
    await c.put('index.html',r.clone());
    if(was!==null&&was!==t){UPDATED=true;const cs=await self.clients.matchAll({type:'window'});cs.forEach(cl=>cl.postMessage({type:'buke-updated'}));}
    return r;}catch(e){return null;}
}
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(r.mode==='navigate'){
    e.respondWith((async()=>{const hit=await caches.match('index.html');
      if(hit){e.waitUntil(freshGame(r));return hit;}// the saved game first, update quietly in the background
      return (await freshGame(r))||fetch(r);})());return;}
  if(u.origin===location.origin||/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){
    e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque')){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));}return res;}).catch(()=>hit)));
  }
});
