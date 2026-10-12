const beMsg=()=>!window.LMS_BE?'backend.js did not start. Open the browser console (F12) for the error.':LMS_BE.why==='sdk'?'Firebase could not load. Check the internet connection or turn off the ad blocker.':LMS_BE.why==='init'?'Firebase failed to start: '+LMS_BE.err:'firebase-config.js has no real keys yet.';
/* Loads Firebase + backend.js by itself when the page does not include them (old html on the server), and says exactly which file failed. */
const needBE=()=>new Promise(res=>{
  if(window.LMS_BE) return res('');
  const g='https://www.gstatic.com/firebasejs/10.14.1/firebase-',L=[g+'app-compat.js',g+'auth-compat.js',g+'firestore-compat.js','firebase-config.js','backend.js'];let i=0;
  (function n(){ if(i>=L.length) return res(''); const s=document.createElement('script'); s.src=L[i]+(i>2?'?v='+Date.now():'');
    s.onload=()=>{i++;n();}; s.onerror=()=>res(L[i].split('/').pop()+' could not be loaded (file missing on GitHub, wrong name, or blocked).'); document.head.appendChild(s); })();
});
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
  {const w=await needBE(); if(!window.LMS_BE||!LMS_BE.ready) return fail(w||beMsg());}
  $('#go').disabled=true;
  try{ await LMS_BE.login(phone,pass); }
  catch(e){ $('#go').disabled=false; const c=e&&e.code||''; return fail(/network/.test(c)?'Network error. Check your connection.':/too-many/.test(c)?'Too many attempts. Try again later or reset your password.':'දුරකථන අංකය හෝ මුරපදය වැරදියි. නැවත උත්සාහ කරන්න.'); }
  $('#go').textContent='ඇතුල් වෙනවා...';
  setTimeout(()=>location.href='home.html',400);
});
