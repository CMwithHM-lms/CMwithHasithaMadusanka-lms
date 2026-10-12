/* PWA: registers the service worker and shows an "Install app" button when the browser allows it. Add <link rel="manifest" href="manifest.json"> + <script src="pwa.js"> to a page. */
(function(){
  if(!document.querySelector('link[rel=manifest]')){const l=document.createElement('link');l.rel='manifest';l.href='manifest.json';document.head.appendChild(l);}
  if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
  let ev=null;
  addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();ev=e;if(document.getElementById('pwaBtn'))return;
    const b=document.createElement('button');b.id='pwaBtn';b.textContent='Install app';
    b.style.cssText='position:fixed;right:14px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:60;padding:11px 18px;border:0;border-radius:999px;font:700 .85rem system-ui;color:#2a1c05;background:linear-gradient(140deg,#fff3c4,#f2c46d,#c8963a);box-shadow:0 10px 24px -8px rgba(200,150,58,.9);cursor:pointer';
    b.onclick=async()=>{ev.prompt();await ev.userChoice;ev=null;b.remove();};
    document.body.appendChild(b);
  });
})();
