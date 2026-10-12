/* Shared layout for every signed-in page: top bar, dock, theme, session, toast, student ID */
(function () {
  window.ic = n => `<i class="ico">${ICON[n] || ''}</i>`;
  const C = window.LMS_CONFIG, $ = s => document.querySelector(s), root = document.documentElement;
  const PAGE = document.body.dataset.page || 'home';
  let phone = null, all = {};
  try { phone = localStorage.getItem('lms_session'); all = JSON.parse(localStorage.getItem('lms_profiles') || '{}'); } catch (e) {}
  const p = phone && all[phone];
  if (!p) { location.replace('index.html'); return; }

  window.DISTRICTS = ['Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha','Hambantota','Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala','Mannar','Matale','Matara','Monaragala','Mullaitivu','Nuwara Eliya','Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya'];
  window.hashPw = async s => {
    try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
    catch (e) { return btoa(unescape(encodeURIComponent(s))); }
  };

  /* markup */
  const NAV = [['dashboard','dash','dash','Dashboard'],['classes','cls','classes','My Classes'],['store','store','store','Lesson Store'],['analyze','ana','analyze','Mark Analyze'],['achievements','ach','achieve','Achievements &amp; Goals'],['profile','prof','profile','My Profile'],['contact','con','chat','Contact Us']];
  const CUR = { home: 'dashboard', profile: 'profile', store: 'store', classes: 'classes', analyze: 'analyze', achievements: 'achievements', contact: 'contact' }[PAGE];
  document.body.insertAdjacentHTML('afterbegin', `
<header class="top glass">
  <div class="brand"><div class="logo" id="logo">CM</div><div class="bt"><b>COMBINED MATHS</b><small>with Hasitha Madusanka</small></div></div>
  <div class="tr">
    <button class="bellb" id="bell" type="button" hidden aria-label="Notifications" aria-haspopup="dialog" aria-expanded="false">${ic('bell')}<span class="nbadge" id="nbadge" hidden>0</span></button>
    <button class="theme" id="theme" aria-label="Dark or light mode"></button>
    <div class="me" id="me">
      <button class="avatar" id="avatar" aria-haspopup="true" aria-expanded="false">T</button>
      <div class="menu" id="menu" hidden>
        <div class="who"><b id="mName"></b><small id="mMail"></small></div>
        <button class="mi" data-go="dashboard">${ic('dash')}Home</button>
        <button class="mi" data-go="profile">${ic('profile')}My Profile</button>
        <button class="mi" data-go="qr">${ic('qr')}My QR Code</button>
        <a class="mi" id="hot">${ic('phone')}Contact Hotline</a>
        <button class="logout-red" id="logout">${ic('out')}LOG OUT</button>
      </div>
    </div>
  </div>
</header>
<nav class="dock glass" aria-label="Main menu">
  ${NAV.map(([k, c, i, l]) => `<button class="nav${k === CUR ? ' cur' : ''}" data-go="${k}" data-c="${c}" aria-label="${l}">${ic(i)}<span class="lbl">${l}</span></button>`).join('')}
  <span class="sep"></span>
  <button class="nav out" id="railOut" data-c="out" aria-label="Log out">${ic('out')}<span class="lbl">Log out</span></button>
</nav>
<div class="toast" id="toast"></div>`);

  /* icons: fill every <i data-ic="name"> on the page (works on all pages) */
  window.renderIcons = (root = document) => root.querySelectorAll('[data-ic]').forEach(el => {
    el.innerHTML = ICON[el.dataset.ic] || ''; el.classList.add('ico');
  });
  renderIcons();

  const toast = window.toast = m => {
    const t = $('#toast'); t.textContent = m; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1800);
  };

  /* theme */
  function setTheme(t) {
    root.dataset.theme = t;
    try { localStorage.setItem('lms_theme', t); } catch (e) {}
    $('#theme').innerHTML = ic(t === 'dark' ? 'sun' : 'moon');
  }
  let saved = 'light';
  try { saved = localStorage.getItem('lms_theme') || 'light'; } catch (e) {}
  setTheme(saved);
  $('#theme').onclick = () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');

  /* logo, user, menu */
  const im = new Image(); im.alt = 'Combined Class';
  im.onload = () => $('#logo').replaceChildren(im);
  im.src = C.brand.logo;
  const name = (p.name || '').trim();
  window.setAvatar = () => {
    const a = $('#avatar'); a.textContent = '';
    if (p.photo) { const i = new Image(); i.src = p.photo; i.alt = ''; a.appendChild(i); }
    else a.textContent = ((p.name || '?').trim()[0] || '?').toUpperCase();
  };
  setAvatar();
  $('#mName').textContent = name;
  $('#mMail').textContent = p.email || '';
  $('#hot').href = 'tel:' + C.brand.hotline;
  const av = $('#avatar'), menu = $('#menu');
  const closeMenu = () => { menu.hidden = true; av.setAttribute('aria-expanded', 'false'); };
  av.onclick = e => { e.stopPropagation(); const o = menu.hidden; menu.hidden = !o; av.setAttribute('aria-expanded', String(o)); };
  document.addEventListener('pointerdown', e => { if (!$('#me').contains(e.target)) closeMenu(); });

  /* navigation */
  const R = Object.assign({ dashboard: 'home.html' }, C.routes || {}), here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.go; closeMenu();
    const [pg, hs] = String(R[k] || '').split('#');
    if (!R[k]) toast('Coming soon');
    else if (!pg || pg === here) { const el = hs && document.getElementById(hs); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); else window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else location.href = R[k];
  }));

  /* dock: the name appears the moment an icon is pressed, then fades quickly */
  document.querySelectorAll('.nav').forEach(el => {
    const lb = el.querySelector('.lbl'); let t;
    el.addEventListener('pointerdown', () => {
      document.querySelectorAll('.nav.on').forEach(x => x !== el && x.classList.remove('on'));
      el.classList.add('on');
      const r = el.getBoundingClientRect(), w = lb.offsetWidth, cx = r.left + r.width / 2, m = 8;
      let dx = 0;
      if (cx - w / 2 < m) dx = m - (cx - w / 2); else if (cx + w / 2 > innerWidth - m) dx = innerWidth - m - (cx + w / 2);
      lb.style.setProperty('--dx', dx + 'px');
      clearTimeout(t); t = setTimeout(() => el.classList.remove('on'), 850);
    });
  });

  /* logout */
  const out = () => { if (window.LMS_BE && LMS_BE.ready) return LMS_BE.logout(); try { localStorage.removeItem('lms_session'); } catch (e) {} location.replace('index.html'); };
  $('#logout').onclick = out; $('#railOut').onclick = out;

  /* touch feedback icon */
  document.addEventListener('pointerdown', e => {
    const s = document.createElement('span');
    s.className = 'tap'; s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px';
    s.innerHTML = ic('spark');
    document.body.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
  }, { passive: true });

  /* student id: 2-digit year + 6 unique digits */
  const save = () => { try { localStorage.setItem('lms_profiles', JSON.stringify(all)); return true; } catch (e) { return false; } };
  function ensureId() {
    if (p.sid) return p.sid;
    let ids = {};
    try { ids = JSON.parse(localStorage.getItem('lms_ids') || '{}'); } catch (e) {}
    const yy = String(new Date(p.created || Date.now()).getFullYear()).slice(-2);
    let id;
    do { id = yy + String(Math.floor(Math.random() * 1e6)).padStart(6, '0'); } while (ids[id]);
    ids[id] = phone; p.sid = id; all[phone] = p;
    try { localStorage.setItem('lms_ids', JSON.stringify(ids)); } catch (e) {}
    save();
    return id;
  }
  const sid = ensureId();
  window.STU = { sid, p, phone, all, save };

  /* blue verify tick beside the name in the avatar menu (and a small badge on the avatar) */
  window.decorateMenu = () => {
    const K = window.LMS_CORE; if (!K) return;
    $('#mName').innerHTML = K.nameHtml(p.name || '', sid);
    const old = $('#me > .vt'); if (old) old.remove();
    if (K.isVerified(sid)) $('#me').insertAdjacentHTML('beforeend', K.tickAlways('mini'));
  };
  decorateMenu();
  if (window.LMS_STAFF) { const m = LMS_STAFF.me(); if (m.admin || m.analyze) $('#menu .mi[data-go="qr"]').insertAdjacentHTML('afterend', `<a class="mi" href="admin.html">${ic('profile')}Admin Panel</a>` + (m.owner ? `<a class="mi" href="owner.html">${ic('lock')}Owner Panel</a>` : '')); }
  window.addEventListener('lms-data', () => { decorateMenu(); const n = $('#idName'); if (n) n.innerHTML = LMS_CORE.nameHtml(p.name || '', sid); });

  /* premium ID card (used on Home and My Profile) */
  window.renderId = function () {
    const card = $('#idc'); if (!card) return;
    $('#sid').textContent = sid;
    $('#idName').innerHTML = window.LMS_CORE ? LMS_CORE.nameHtml(p.name || '', sid) : esc(p.name || '');
    $('#idYear').textContent = (p.year || '') + (p.attempt ? ' · ' + p.attempt : '');
    const ins = C.institutes[p.institute] || { a: '#fde68a', b: '#c8963a', glyph: 'sun' };
    $('#instName').textContent = p.institute || '';
    $('#badge').innerHTML = `<span class="badge" style="--a:${ins.a};--b:${ins.b}"><span class="core" style="color:${ins.b}">${GLYPH[ins.glyph]}</span></span>`;
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 12 + 'deg');
      card.style.setProperty('--rx', -((e.clientY - r.top) / r.height - .5) * 12 + 'deg');
    });
    ['pointerleave', 'pointerup', 'pointercancel'].forEach(ev => card.addEventListener(ev, () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); }));
    card.addEventListener('click', () => {
      if (navigator.clipboard) navigator.clipboard.writeText(sid).then(() => toast('Student ID copied'), () => toast('ID: ' + sid));
      else toast('ID: ' + sid);
    });
  };

  /* notification bell: notify.js watches payments, classes, marks, replies... and fills the bell (the bell stays hidden if the file is missing) */
  if (!window.LMS_NOTIFY && !document.querySelector('script[data-notify]')) {
    const s = document.createElement('script'); s.src = 'notify.js'; s.defer = true; s.dataset.notify = '1';
    document.body.appendChild(s);
  }
})();
