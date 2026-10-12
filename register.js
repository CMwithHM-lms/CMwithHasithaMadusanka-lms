const beMsg=()=>!window.LMS_BE?'backend.js did not start. Open the browser console (F12) for the error.':LMS_BE.why==='sdk'?'Firebase could not load. Check the internet connection or turn off the ad blocker.':LMS_BE.why==='init'?'Firebase failed to start: '+LMS_BE.err:'firebase-config.js has no real keys yet.';
/* Loads Firebase + backend.js by itself when the page does not include them (old html on the server), and says exactly which file failed. */
const needBE=()=>new Promise(res=>{
  if(window.LMS_BE) return res('');
  const g='https://www.gstatic.com/firebasejs/10.14.1/firebase-',L=[g+'app-compat.js',g+'auth-compat.js',g+'firestore-compat.js','firebase-config.js','backend.js'];let i=0;
  (function n(){ if(i>=L.length) return res(''); const s=document.createElement('script'); s.src=L[i]+(i>2?'?v='+Date.now():'');
    s.onload=()=>{i++;n();}; s.onerror=()=>res(L[i].split('/').pop()+' could not be loaded (file missing on GitHub, wrong name, or blocked).'); document.head.appendChild(s); })();
});
const $=s=>document.querySelector(s);

// districts
['Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha','Hambantota','Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala','Mannar','Matale','Matara','Monaragala','Mullaitivu','Nuwara Eliya','Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya']
  .forEach(d=>{const o=document.createElement('option');o.textContent=d;$('#district').appendChild(o);});

// duckling writes WELCOME
(function(){const w='WELCOME';let i=0;const t=$('#typed');
  (function step(){ if(i<=w.length){t.textContent=w.slice(0,i++);setTimeout(step,170);} })();})();

// show / hide password
$('#eye').onclick=()=>{const p=$('#pass'),s=p.type==='password';p.type=s?'text':'password';$('#eye').textContent=s?'Hide':'Show';};

// digits only for phone fields
['#phone','#wa'].forEach(id=>$(id).addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'');}));
$('#same').onclick=()=>{$('#wa').value=$('#phone').value;};

// live password rules
const R={len:v=>v.length>=8,up:v=>/[A-Z]/.test(v),low:v=>/[a-z]/.test(v),num:v=>/\d/.test(v),sym:v=>/[^A-Za-z0-9]/.test(v)};
const passOk=v=>Object.values(R).every(f=>f(v));
$('#pass').addEventListener('input',e=>{
  const v=e.target.value;let n=0;
  document.querySelectorAll('#rules li').forEach(li=>{const ok=R[li.dataset.r](v);li.classList.toggle('ok',ok);if(ok)n++;});
  const m=$('#meter');m.dataset.lv=n;[...m.children].forEach((x,k)=>x.classList.toggle('on',k<n));
  $('#secure').classList.toggle('on',n===5);
  const f=document.querySelector('[data-f="pass"]');f.classList.toggle('strong',n===5);f.classList.remove('bad');
});

async function hash(s){
  try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
  catch(e){return btoa(unescape(encodeURIComponent(s)));}
}
function fail(field,msg){
  document.querySelectorAll('.f').forEach(f=>f.classList.remove('bad'));
  const f=document.querySelector('[data-f="'+field+'"]');
  if(f){f.classList.add('bad');f.scrollIntoView({behavior:'smooth',block:'center'});}
  const e=$('#err');e.className='err show';e.textContent=msg;
  const c=$('#card');c.classList.remove('shake');void c.offsetWidth;c.classList.add('shake');
  return false;
}

$('#form').addEventListener('submit',async ev=>{
  ev.preventDefault();$('#err').className='err';
  document.querySelectorAll('.f').forEach(f=>f.classList.remove('bad'));
  const v={name:$('#name').value.trim(),school:$('#school').value.trim(),phone:$('#phone').value.replace(/\D/g,''),
    email:$('#email').value.trim(),address:$('#address').value.trim(),district:$('#district').value,year:$('#year').value,attempt:$('#attempt').value,town:$('#town').value.trim(),inst:$('#inst').value,
    wa:$('#wa').value.replace(/\D/g,''),pass:$('#pass').value};
  const phoneRe=/^0\d{9}$/;
  if(!v.name) return fail('name','නම ඇතුළත් කරන්න. / Enter your name.');
  if(!v.school) return fail('school','පාසල ඇතුළත් කරන්න. / Enter your school.');
  if(!phoneRe.test(v.phone)) return fail('phone','දුරකථන අංකය වැරදියි (උදා: 0712345678). / Invalid phone number.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) return fail('email','Email එක වැරදියි. / Enter a valid email.');
  if(v.address.length<8) return fail('address','ලිපිනය සම්පූර්ණව ඇතුළත් කරන්න. / Enter your full address.');
  if(!v.district) return fail('district','District එක තෝරන්න. / Select your district.');
  if(v.town.length<2) return fail('town','නගරය ඇතුළත් කරන්න. / Enter your town.');
  if(!v.year) return fail('year','A/L වර්ෂය තෝරන්න. / Select your A/L year.');
  if(!v.attempt) return fail('attempt','Attempt එක තෝරන්න. / Select your attempt.');
  if(!v.inst) return fail('inst','Institute එක තෝරන්න. / Select your institute.');
  if(!phoneRe.test(v.wa)) return fail('wa','WhatsApp අංකය වැරදියි. / Invalid WhatsApp number.');
  if(!passOk(v.pass)) return fail('pass','මුරපදයේ ඉහත සියලු කොන්දේසි තිබිය යුතුයි. / Password must meet all rules.');

  {const w=await needBE(); if(!window.LMS_BE||!LMS_BE.ready) return fail('', w||beMsg());}
  $('#go').disabled=true;
  try{ await LMS_BE.register(v.phone,v.email,v.pass,{name:v.name,school:v.school,phone:v.phone,email:v.email,address:v.address,district:v.district,year:v.year,attempt:v.attempt,town:v.town,institute:v.inst,whatsapp:v.wa,created:Date.now()}); }
  catch(x){ $('#go').disabled=false; const c=x&&x.code||''; if(c==='phone-taken') return fail('phone','මෙම අංකයෙන් දැනටමත් ලියාපදිංචි වී ඇත. / This number is already registered.'); if(c==='auth/email-already-in-use') return fail('email','This email is already used by another account.'); const M={'auth/weak-password':'මුරපදය දුර්වලයි. / Password is too weak.','auth/invalid-email':'Email එක වැරදියි. / Invalid email.','auth/network-request-failed':'ඉන්ටර්නෙට් සම්බන්ධතාවය පරීක්ෂා කරන්න. / Network error. Check your connection.','unavailable':'ඉන්ටර්නෙට් සම්බන්ධතාවය පරීක්ෂා කරන්න. / Network error. Check your connection.','auth/too-many-requests':'උත්සාහ ගණන වැඩියි. පසුව නැවත උත්සාහ කරන්න. / Too many attempts. Try again later.','permission-denied':'Server එක ඉල්ලීම පිළිගත්තේ නෑ. ගුරුවරයාට දැනුම් දෙන්න (Firestore rules publish කළ යුතුයි). / The server refused the request (permission-denied).','sid-failed':'Student ID එක සෑදිය නොහැකි වුණා. නැවත උත්සාහ කරන්න. / Could not create your Student ID. Please try again.'};
    return fail('', (M[c]||'ලියාපදිංචි විය නොහැක. / Could not register.')+' ('+(c||'error')+')'); }

  const e=$('#err');e.className='err good show';e.textContent='ලියාපදිංචි වුණා! Login පිටුවට යනවා... / Registered! Redirecting...';
  $('#go').disabled=true;
  setTimeout(()=>location.href='index.html',1400);
});
