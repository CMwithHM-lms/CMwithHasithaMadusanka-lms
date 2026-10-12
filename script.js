const beMsg=()=>!window.LMS_BE?'backend.js is not loaded. Upload backend.js and the new index.html, register.html, reset.html to GitHub, then hard refresh.':LMS_BE.why==='sdk'?'Firebase could not load. Check the internet connection or turn off the ad blocker.':'firebase-config.js has no real keys yet.';
const $=s=>document.querySelector(s);
try{ if(localStorage.getItem('lms_session')) location.replace('home.html'); }catch(e){}
(function(){const w='Welcome';let i=0;const t=$('#typed');
  (function step(){ if(i<=w.length){t.textContent=w.slice(0,i++);setTimeout(step,170);} else $('#duck').classList.remove('writing'); })();})();
$('#eye').onclick=()=>{const p=$('#pass'),s=p.type==='password';p.type=s?'text':'password';$('#eye').textContent=s?'Hide':'Show';};
function fail(msg){const e=$('#err');e.textContent=msg;e.classList.add('show');
  const c=$('#card');c.classList.remove('shake');void c.offsetWidth;c.classList.add('shake');}
$('#form').addEventListener('submit',async ev=>{
  ev.preventDefault();$('#err').classList.remove('show');
  const phone=$('#phone').value.replace(/\D/g,''), pass=$('#pass').value;
  if(!phone||!pass) return fail('දුරකථන අංකය සහ මුරපදය දෙකම ඇතුළත් කරන්න.');
  if(!/^0\d{9}$/.test(phone)) return fail('දුරකථන අංකය වැරදියි. උදා: 0712345678');
  if(!window.LMS_BE||!LMS_BE.ready) return fail(beMsg());
  $('#go').disabled=true;
  try{ await LMS_BE.login(phone,pass); }
  catch(e){ $('#go').disabled=false; const c=e&&e.code||''; return fail(/network/.test(c)?'Network error. Check your connection.':/too-many/.test(c)?'Too many attempts. Try again later or reset your password.':'දුරකථන අංකය හෝ මුරපදය වැරදියි. නැවත උත්සාහ කරන්න.'); }
  $('#go').textContent='ඇතුල් වෙනවා...';
  setTimeout(()=>location.href='home.html',400);
});
