const beMsg=()=>!window.LMS_BE?'backend.js did not start. Open the browser console (F12) for the error.':LMS_BE.why==='sdk'?'Firebase could not load. Check the internet connection or turn off the ad blocker.':LMS_BE.why==='init'?'Firebase failed to start: '+LMS_BE.err:'firebase-config.js has no real keys yet.';
/* Loads Firebase + backend.js by itself when the page does not include them (old html on the server), and says exactly which file failed. */
const needBE=()=>new Promise(res=>{
  if(window.LMS_BE) return res('');
  const g='https://www.gstatic.com/firebasejs/10.14.1/firebase-',L=[g+'app-compat.js',g+'auth-compat.js',g+'firestore-compat.js','firebase-config.js','backend.js'];let i=0;
  (function n(){ if(i>=L.length) return res(''); const s=document.createElement('script'); s.src=L[i]+(i>2?'?v='+Date.now():'');
    s.onload=()=>{i++;n();}; s.onerror=()=>res(L[i].split('/').pop()+' could not be loaded (file missing on GitHub, wrong name, or blocked).'); document.head.appendChild(s); })();
});
const $=s=>document.querySelector(s);

// duckling writes the title
(function(){const w='Reset Password';let i=0;const t=$('#typed');
  (function step(){ if(i<=w.length){t.textContent=w.slice(0,i++);setTimeout(step,110);} })();})();

$('#eye').onclick=()=>{const p=$('#pass'),s=p.type==='password';p.type=s?'text':'password';$('#eye').textContent=s?'Hide':'Show';};
['#phone','#wa'].forEach(id=>$(id).addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'');}));

const R={len:v=>v.length>=8,up:v=>/[A-Z]/.test(v),low:v=>/[a-z]/.test(v),num:v=>/\d/.test(v),sym:v=>/[^A-Za-z0-9]/.test(v)};
const passOk=v=>Object.values(R).every(f=>f(v));

async function hash(s){
  try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
  catch(e){return btoa(unescape(encodeURIComponent(s)));}
}
function fail(form,field,msg){
  form.querySelectorAll('.f').forEach(f=>f.classList.remove('bad'));
  const f=form.querySelector('[data-f="'+field+'"]');
  if(f){f.classList.add('bad');f.scrollIntoView({behavior:'smooth',block:'center'});}
  const e=form.querySelector('.err');e.className='err show';e.textContent=msg;
  const c=$('#card');c.classList.remove('shake');void c.offsetWidth;c.classList.add('shake');
}

// live password rules + confirm match
function checkMatch(){
  const a=$('#pass').value,b=$('#cpass').value,m=$('#match');
  if(!b){m.textContent='';m.className='match';return;}
  const ok=a===b;m.textContent=ok?'Passwords match':'Passwords do not match';m.className='match'+(ok?' ok':'');
}
$('#pass').addEventListener('input',e=>{
  const v=e.target.value;let n=0;
  document.querySelectorAll('#rules li').forEach(li=>{const ok=R[li.dataset.r](v);li.classList.toggle('ok',ok);if(ok)n++;});
  const m=$('#meter');m.dataset.lv=n;[...m.children].forEach((x,k)=>x.classList.toggle('on',k<n));
  $('#secure').classList.toggle('on',n===5);
  const f=document.querySelector('[data-f="pass"]');f.classList.toggle('strong',n===5);f.classList.remove('bad');
  checkMatch();
});
$('#cpass').addEventListener('input',checkMatch);

let target=null;

// step 1: verify the details given at registration
$('#f1').addEventListener('submit',async ev=>{
  ev.preventDefault();const f=$('#f1');f.querySelector('.err').className='err';
  const phone=$('#phone').value.replace(/\D/g,''),email=$('#email').value.trim().toLowerCase(),wa=$('#wa').value.replace(/\D/g,'');
  if(!/^0\d{9}$/.test(phone)) return fail(f,'phone','දුරකථන අංකය වැරදියි | Invalid phone number');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail(f,'email','Email එක වැරදියි | Enter a valid email');
  {const w=await needBE(); if(!window.LMS_BE||!LMS_BE.ready) return fail(f,'',w||beMsg());}
  LMS_BE.reset(phone,email).then(()=>{const e=f.querySelector('.err');e.className='err good show';e.textContent='We sent a password reset link to '+email+'. Open it, set a new password, then log in.';$('#go').hidden=true;})
    .catch(()=>fail(f,'','ලබාදුන් තොරතුරු ගැලපෙන්නේ නෑ | The details do not match our records'));
});

// step 2: save the new password
$('#f2').addEventListener('submit',async ev=>{
  ev.preventDefault();const f=$('#f2');f.querySelector('.err').className='err';
  const a=$('#pass').value,b=$('#cpass').value;
  if(!passOk(a)) return fail(f,'pass','මුරපදයේ සියලු කොන්දේසි තිබිය යුතුයි | Password must meet all rules');
  if(a!==b) return fail(f,'cpass','මුරපද දෙක ගැලපෙන්නේ නෑ | Passwords do not match');
  let users={};try{users=JSON.parse(localStorage.getItem('lms_users')||'{}');}catch(e){}
  users[target]=await hash(a);
  try{localStorage.setItem('lms_users',JSON.stringify(users));localStorage.removeItem('lms_session');}
  catch(e){return fail(f,'','සුරැකීමට නොහැකි විය | Could not save');}
  const e=f.querySelector('.err');e.className='err good show';e.textContent='මුරපදය වෙනස් කළා! Login පිටුවට යනවා... | Password updated! Redirecting...';
  $('#go').disabled=true;
  setTimeout(()=>location.href='index.html',1500);
});
