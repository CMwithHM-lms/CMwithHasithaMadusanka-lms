/* Lesson Store: month boxes, class details, card / slip upload and submit.
   Admin data comes from LMS_CONFIG.store (later: Admin Panel / backend).
   Student submissions live in localStorage 'lms_orders' until the backend exists. */
(function () {
  const S = window.STU; if (!S) return;
  const C = window.LMS_CONFIG, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const ST = C.store || {}, CLASSES = ST.classes || [], BANKS = ST.banks || [];
  const { p, sid, phone } = S;
  const MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const YEARS = ['2026', '2027', '2028', '2029'];
  const HUES = [['#60a5fa', '#2563eb'], ['#a78bfa', '#6d28d9'], ['#f9a8d4', '#db2777'], ['#fdba74', '#ea580c'], ['#5eead4', '#0d9488'], ['#fcd34d', '#b7791f'],
    ['#7dd3fc', '#0369a1'], ['#c4b5fd', '#7c3aed'], ['#fda4af', '#e11d48'], ['#86efac', '#15803d'], ['#fde68a', '#c2410c'], ['#93c5fd', '#4338ca']];


  /* ---------- storage helpers ---------- */
  const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const allOrders = () => lsGet('lms_orders', []);
  const getO = id => allOrders().find(o => o.sid === sid && o.classId === id);
  const putO = o => lsSet('lms_orders', allOrders().filter(x => !(x.sid === sid && x.classId === o.classId)).concat(o));
  const delO = id => lsSet('lms_orders', allOrders().filter(x => !(x.sid === sid && x.classId === id)));

  /* ---------- state ---------- */
  const saved = lsGet('lms_store_filter', {});
  const st = {
    tab: 'classes',
    mode: saved.mode === 'online' || saved.mode === 'physical' ? saved.mode : (p.institute === 'ONLINE' ? 'online' : 'physical'),
    year: YEARS.includes(saved.year) ? saved.year : (YEARS.includes(String(p.year)) ? String(p.year) : '2027'),
    mine: !!saved.mine
  };
  const persist = () => lsSet('lms_store_filter', { mode: st.mode, year: st.year, mine: st.mine });
  let openMonth = null, curId = null, confirmId = null;

  /* ---------- small helpers ---------- */
  const money = n => n > 0 ? 'LKR ' + Number(n).toLocaleString('en-US') : 'Free';
  const dfmt = t => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const safeUrl = u => /^(https?:\/\/|data:image\/|[\w./-]+$)/i.test(u || '') ? u : '';
  const mParts = m => { const [y, mo] = String(m).split('-'); return { y, mo: +mo - 1, name: MN[+mo - 1] || m }; };
  const mLabel = m => { const x = mParts(m); return x.name + ' ' + x.y; };
  const hue = m => HUES[mParts(m).mo % 12] || HUES[0];

  function stat(c) {
    const o = getO(c.id); if (!o) return { k: 'none' };
    if (o.status === 'approved') {
      if (!c.validDays) return { k: 'active', o, left: null };
      const end = (o.approved || Date.now()) + (c.validDays + (o.extra || 0)) * 864e5, left = Math.ceil((end - Date.now()) / 864e5);
      return left <= 0 ? { k: 'expired', o, end } : { k: 'active', o, left, end };
    }
    return { k: o.status, o };
  }
  const LABEL = { none: 'NOT JOINED', draft: 'DRAFT', pending: 'PENDING', active: 'ACTIVE', rejected: 'REJECTED', expired: 'EXPIRED' };
  const STIC = { pending: 'clock', active: 'check', rejected: 'cross', expired: 'clock' };
  const canUp = k => k === 'none' || k === 'draft' || k === 'rejected' || k === 'expired';

  function listFor() {
    return CLASSES.filter(c => c.mode === st.mode && String(c.year) === st.year)
      .filter(c => !st.mine || ['pending', 'active', 'expired'].includes(stat(c).k));
  }

  /* ---------- tabs ---------- */
  function setSeg(el, i) { el.style.setProperty('--i', i); }
  function setTab(t) {
    st.tab = t;
    $$('#tabs button').forEach((b, i) => { const on = b.dataset.tab === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); if (on) setSeg($('#tabs'), i); });
    render();
  }
  $$('#tabs button').forEach(b => b.onclick = () => setTab(b.dataset.tab));

  /* ---------- filter ---------- */
  const fpop = $('#fpop'), fbtn = $('#fbtn');
  const fOpen = o => { fpop.hidden = !o; fbtn.setAttribute('aria-expanded', String(o)); };
  fbtn.onclick = e => { e.stopPropagation(); fOpen(fpop.hidden); };
  document.addEventListener('pointerdown', e => { if (!fpop.hidden && !fpop.contains(e.target) && !fbtn.contains(e.target) && !e.target.closest('#fsum')) fOpen(false); });
  $('#yrs').innerHTML = YEARS.map(y => `<button data-y="${y}">${y}</button>`).join('');
  function syncFilter() {
    $$('#modeSeg button').forEach((b, i) => { const on = b.dataset.mode === st.mode; b.classList.toggle('on', on); if (on) setSeg($('#modeSeg'), i); });
    $$('#yrs button').forEach(b => b.classList.toggle('on', b.dataset.y === st.year));
    $('#fmine').checked = st.mine;
    $('#fdot').hidden = !st.mine;
    $('#fsum').innerHTML = `<button data-f="open">Type <b>${st.mode === 'online' ? 'Online' : 'Physical'}</b></button><button data-f="open">A/L <b>${st.year}</b></button>` +
      (st.mine ? '<button data-f="open">Only my enrolments</button>' : '');
    persist();
  }
  $$('#modeSeg button').forEach(b => b.onclick = () => { st.mode = b.dataset.mode; syncFilter(); render(); });
  $$('#yrs button').forEach(b => b.onclick = () => { st.year = b.dataset.y; syncFilter(); render(); });
  $('#fmine').onchange = e => { st.mine = e.target.checked; syncFilter(); render(); };
  $('#freset').onclick = () => { st.mode = p.institute === 'ONLINE' ? 'online' : 'physical'; st.year = YEARS.includes(String(p.year)) ? String(p.year) : '2027'; st.mine = false; syncFilter(); render(); };
  $('#fsum').addEventListener('click', e => { if (e.target.closest('[data-f]')) fOpen(true); });

  /* ---------- month boxes ---------- */
  function render() {
    const v = $('#view');
    $('#fsum').style.display = st.tab === 'classes' ? '' : 'none';
    if (st.tab === 'store') {
      v.innerHTML = `<div class="sempty"><div class="eic">${ICON.store}</div><b>Store is coming soon</b><span>New items will appear here.</span></div>`;
      return;
    }
    const cl = listFor(), months = [...new Set(cl.map(c => c.month))].sort().reverse();
    if (!months.length) {
      v.innerHTML = `<div class="sempty"><div class="eic">${ICON.book}</div><b>${st.mine ? 'No enrolments yet' : 'No classes yet'}</b><span>${st.mine ? 'Join a class and it will show up here.' : 'No ' + (st.mode === 'online' ? 'Online' : 'Physical') + ' classes for A/L ' + st.year + ' yet. Try another type or year.'}</span></div>`;
      return;
    }
    v.innerHTML = '<div class="mgrid">' + months.map((m, i) => {
      const cs = cl.filter(c => c.month === m), ss = cs.map(stat).map(x => x.k), hd = hue(m), photo = cs.map(c => safeUrl(c.photo)).find(Boolean);
      const best = ss.includes('active') ? 'active' : ss.includes('pending') ? 'pending' : ss.includes('rejected') ? 'rejected' : ss.includes('expired') ? 'expired' : '';
      return `<button class="mb" data-m="${esc(m)}" style="--a:${hd[0]};--b:${hd[1]};animation-delay:${i * 60}ms">${photo ? `<span class="ph" style="--ph:url('${esc(photo)}')"></span>` : ''}<span class="sc"></span>
        <span class="mtop"><span class="mtag ${st.mode}">${st.mode === 'online' ? 'ONLINE' : 'PHYSICAL'}</span>${best ? `<span class="mst ${best}">${ic(STIC[best])}${LABEL[best]}</span>` : ''}</span>
        <span class="mc"><span class="mname">${esc(mParts(m).name)}</span><span class="mmeta">${esc(mParts(m).y)}</span></span></button>`;
    }).join('') + '</div>';
  }
  $('#view').addEventListener('click', e => { const b = e.target.closest('.mb'); if (b) openSheet(b.dataset.m); });

  /* ---------- month sheet: class list -> class detail ---------- */
  const sh = $('#sh'), car = $('#car');
  let multi = false;
  const csOf = m => listFor().filter(c => c.month === m);
  const top0 = () => { sh.querySelector('.shb').scrollTop = 0; };
  function openSheet(m) {
    const cs = csOf(m); if (!cs.length) return;
    openMonth = m; multi = cs.length > 1; confirmId = null;
    $('#shTitle').textContent = mLabel(m);
    const tg = $('#shTag'); tg.textContent = st.mode === 'online' ? 'ONLINE' : 'PHYSICAL'; tg.className = 'mtag ' + st.mode;
    sh.hidden = false; document.body.style.overflow = 'hidden';
    if (multi) showList(); else showDetail(cs[0].id);
  }
  function showList() {
    curId = null; confirmId = null;
    $('#shSub').textContent = 'A/L ' + st.year + ' · Choose a class';
    $('#cnav').hidden = true;
    car.innerHTML = '<div class="clist">' + csOf(openMonth).map((c, i) => {
      const s = stat(c), inc = c.includes || {};
      return `<button class="ci" data-id="${esc(c.id)}" style="animation-delay:${i * 60}ms"><span class="cin"><b>${esc(c.title)}</b><span class="cif">${money(c.fee)}</span>
        <span class="cim"><span class="${inc.zoom ? '' : 'off'}">${ic('cam')}Zoom</span><span class="${inc.video ? '' : 'off'}">${ic('play')}Video</span></span></span>
        ${s.k !== 'none' ? chip(s.k) : ''}<span class="cia">${ic('arrow')}</span></button>`;
    }).join('') + '</div>';
    top0();
  }
  function showDetail(id) {
    const c = CLASSES.find(x => x.id === id); if (!c) return;
    curId = id; confirmId = null;
    $('#shSub').textContent = 'A/L ' + st.year;
    $('#cnav').hidden = !multi;
    car.innerHTML = `<article class="cp" data-id="${esc(id)}">${panel(c)}</article>`;
    top0();
  }
  function closeSheet() { sh.hidden = true; document.body.style.overflow = ''; confirmId = null; render(); }
  $('#shX').onclick = closeSheet;
  $('#back').onclick = showList;
  car.addEventListener('click', e => { const b = e.target.closest('.ci'); if (b) showDetail(b.dataset.id); });
  sh.addEventListener('pointerdown', e => { if (e.target === sh) closeSheet(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#lb').hidden) $('#lb').hidden = true; else if (!sh.hidden) closeSheet(); else fOpen(false); } });

  /* ---------- panel markup ---------- */
  function stepper(s, hasImg) {
    const done = s.k === 'active' || s.k === 'expired' ? 4 : s.k === 'pending' ? 3 : hasImg ? 2 : 1;
    const names = ['Select', 'Upload', 'Submit', 'Verified'];
    return `<div class="stp">${names.map((n, i) => `<div class="sp1${i < done ? ' done' : ''}${i === done && done < 4 ? ' cur' : ''}"><i>${ic('check')}</i><small>${n}</small></div>`).join('')}</div>`;
  }
  function banner(c, s) {
    const what = c.mode === 'online' ? 'slip' : 'card';
    if (s.k === 'pending') return `<div class="ban pending">${ic('clock')}<div><b>Under review</b>Your ${what} is being checked by an admin. Recordings in My Classes stay locked until it is approved.</div></div>`;
    if (s.k === 'active') return `<div class="ban active">${ic('check')}<div><b>Verified. Access unlocked</b>${s.left != null ? `${s.left} ${s.left === 1 ? 'day' : 'days'} left · valid until ${dfmt(s.end)}` : 'Access is active.'}</div></div>`;
    if (s.k === 'rejected') return `<div class="ban rejected">${ic('cross')}<div><b>Not approved</b>${esc((s.o && s.o.note) || 'Please upload a clear ' + what + ' and submit again.')}</div></div>`;
    if (s.k === 'expired') return `<div class="ban expired">${ic('clock')}<div><b>Expired on ${dfmt(s.end)}</b>Upload a new ${what} to renew access.</div></div>`;
    return `<div class="ban hint">${ic('info')}<div><b>Before you submit</b>After you submit, an admin will check your ${what}. Recordings in My Classes stay locked until it is approved.</div></div>`;
  }
  function tiles(c) {
    const inc = c.includes || {};
    const t = (ico, lab, ok) => `<div class="tl${ok ? '' : ' no'}">${ic(ico)}<span class="yn ${ok ? 'yes' : 'nope'}">${ok ? 'INCLUDED' : 'NOT INCLUDED'}</span><small>${lab}</small></div>`;
    return `<div class="tiles">${t('cam', 'Zoom', !!inc.zoom)}${t('play', 'Video', !!inc.video)}
      <div class="tl">${ic('clock')}<b>${c.validDays ? c.validDays + ' days' : 'No limit'}</b><small>Valid</small></div>
      <div class="tl">${ic('cal')}<b>${esc(st.year)}</b><small>A/L year</small></div></div>`;
  }
  function uploadBlock(c, s, kind) {
    const o = s.o, img = o && o.img && s.k !== 'expired' ? o.img : '', up = canUp(s.k), lbl = kind === 'slip' ? 'Slip' : 'Card';
    let h = `<div class="med${img ? ' has' : ''}"${img ? ' data-act="zoom"' : ''}>${img ? `<img src="${esc(img)}" alt="${lbl}">` : `<div class="eic">${ICON.image}<span>No ${lbl.toLowerCase()} added yet</span></div>`}${img && s.k === 'draft' ? `<button class="rmv" data-act="rm" aria-label="Remove">${ic('trash')}</button>` : ''}</div>`;
    if (up) h += `<button class="dz" data-act="up">${ic('upload')}<span>${img ? 'Replace' : 'Upload'} ${lbl}<small>Tap to choose or drop a clear photo</small></span></button>`;
    else h += `<div class="lockrow">${ic('lock')}Locked while it is being reviewed.</div>`;
    if (s.k === 'draft' && img) {
      h += confirmId === c.id
        ? `<div class="cfm"><b>Submit this ${lbl.toLowerCase()}?</b><br>After you submit, an admin will check it. Recordings in My Classes stay locked until it is approved.<div class="row"><button class="gbtn sec" data-act="cancel">Cancel</button><button class="gbtn" data-act="submit">${ic('check')}Submit</button></div></div>`
        : `<button class="gbtn" data-act="ask">${ic('arrow')}Submit for verification</button>`;
    }
    return h;
  }
  const chip = k => `<span class="chip2 ${k}">${STIC[k] ? ic(STIC[k]) : ''}${LABEL[k]}</span>`;

  function panel(c) {
    const s = stat(c), photo = safeUrl(c.photo), hasImg = !!(s.o && s.o.img && s.k !== 'expired');
    let h = '';
    if (photo) h += `<div class="hero" data-act="zoomsrc" data-src="${esc(photo)}"><img src="${esc(photo)}" alt=""></div>`;
    h += `<h3 class="ctitle">${esc(c.title)}</h3>` + stepper(s, hasImg) + banner(c, s) + tiles(c);
    if (c.mode === 'physical') {
      h += `<div class="bar" style="--acc:linear-gradient(90deg,#f5d27a,#c8963a)"><div class="fee"><small>Class fee</small><b>${money(c.fee)}</b></div></div>`;
      if (c.notice) h += `<div class="bar" style="--acc:linear-gradient(90deg,#f43f5e,#f59e0b)"><div class="bh"><h4>${ic('bell')}Notice</h4></div><p class="ntext">${esc(c.notice)}</p></div>`;
      h += `<div class="bar" style="--acc:linear-gradient(90deg,#7c3aed,#3b82f6)"><div class="bh"><h4>${ic('card')}Physical Card</h4>${chip(s.k === 'none' ? 'none' : s.k)}</div>${uploadBlock(c, s, 'card')}</div>`;
    } else {
      const lines = String(c.instructions || '').split(/\n+/).map(x => x.trim()).filter(Boolean);
      h += `<div class="bar" style="--acc:linear-gradient(90deg,#14b8a6,#10b981)"><div class="bh"><h4>${ic('book')}${esc(c.title)}</h4></div>${lines.length ? `<ol class="ins">${lines.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : '<p class="ntext">No instructions yet.</p>'}</div>`;
      h += `<div class="bar" style="--acc:linear-gradient(90deg,#f5d27a,#c8963a)"><div class="fee" style="margin-bottom:6px"><small>Class fee</small><b>${money(c.fee)}</b></div><div class="bh" style="margin-top:12px"><h4>${ic('bank')}Bank details</h4></div>` +
        (BANKS.length ? BANKS.map((b, i) => bankRow(b, i)).join('') : '<p class="ntext">Bank details will be added soon.</p>') + '</div>';
      h += `<div class="bar" style="--acc:linear-gradient(90deg,#7c3aed,#3b82f6)"><div class="bh"><h4>${ic('card')}Online Slip</h4>${chip(s.k === 'none' ? 'none' : s.k)}</div>${uploadBlock(c, s, 'slip')}</div>`;
    }
    return h;
  }
  function bankRow(b, i) {
    const lg = safeUrl(b.logo), ini = String(b.bank || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return `<div class="bk2"><span class="blogo" style="--bc:${/^#[0-9a-f]{3,8}$/i.test(b.color || '') ? b.color : '#7c3aed'}">${lg ? `<img src="${esc(lg)}" alt="${esc(b.bank)}">` : esc(ini)}</span>
      <span class="binfo"><b>${esc(b.bank)}</b><small>${esc(b.name || '')}${b.branch ? ' · ' + esc(b.branch) : ''}</small><code>${esc(b.account || '')}</code></span>
      <button class="cpy" data-act="copy" data-v="${esc(String(b.account || '').replace(/\s/g, ''))}" aria-label="Copy account number">${ic('copy')}</button></div>`;
  }
  function refresh(id) {
    const c = CLASSES.find(x => x.id === id), el = car.querySelector(`.cp[data-id="${CSS.escape(id)}"]`);
    if (c && el) el.innerHTML = panel(c);
  }

  /* ---------- actions ---------- */
  const fin = $('#fin'); let target = null;
  function compress(file) {
    return new Promise((res, rej) => {
      if (!/^image\//.test(file.type)) return rej('Please choose an image');
      if (file.size > 15 * 1024 * 1024) return rej('Image is too large (max 15 MB)');
      const r = new FileReader();
      r.onerror = () => rej('Could not read that file');
      r.onload = () => {
        const im = new Image();
        im.onerror = () => rej('Could not read that image');
        im.onload = () => {
          const k = Math.min(1, 1100 / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
          const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', .8));
        };
        im.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }
  async function addImage(id, file) {
    const c = CLASSES.find(x => x.id === id); if (!c || !file) return;
    const s = stat(c); if (!canUp(s.k)) return;
    try {
      const img = await compress(file);
      const o = { id: Date.now().toString(36), sid, phone, name: p.name, classId: id, kind: c.mode === 'online' ? 'slip' : 'card', img, status: 'draft', year: st.year, created: Date.now() };
      if (!putO(o)) return toast('Not enough space to save the image');
      confirmId = null; refresh(id); toast((c.mode === 'online' ? 'Slip' : 'Card') + ' added');
    } catch (e) { toast(String(e)); }
  }
  fin.onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (target) addImage(target, f); };
  sh.addEventListener('dragover', e => { if (e.target.closest('.dz')) { e.preventDefault(); e.target.closest('.dz').classList.add('over'); } });
  sh.addEventListener('dragleave', e => { const d = e.target.closest('.dz'); if (d) d.classList.remove('over'); });
  sh.addEventListener('drop', e => {
    const d = e.target.closest('.dz'); if (!d) return; e.preventDefault(); d.classList.remove('over');
    addImage(d.closest('.cp').dataset.id, e.dataTransfer.files[0]);
  });

  const lb = $('#lb');
  const zoom = src => { if (!src) return; $('#lbImg').src = src; lb.hidden = false; };
  lb.onclick = () => { lb.hidden = true; };

  sh.addEventListener('click', e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const cp = a.closest('.cp'), id = cp && cp.dataset.id, act = a.dataset.act;
    if (act === 'rm') { e.stopPropagation(); delO(id); confirmId = null; refresh(id); toast('Removed'); }
    else if (act === 'up') { target = id; fin.click(); }
    else if (act === 'zoom') { const i = a.querySelector('img'); if (i) zoom(i.src); }
    else if (act === 'zoomsrc') zoom(a.dataset.src);
    else if (act === 'ask') { confirmId = id; refresh(id); }
    else if (act === 'cancel') { confirmId = null; refresh(id); }
    else if (act === 'submit') {
      const o = getO(id); if (!o || !o.img) return;
      o.status = 'pending'; o.submitted = Date.now(); delete o.note; delete o.approved; delete o.expires; delete o.extra;
      if (!putO(o)) return toast('Could not save. Try again.');
      confirmId = null; refresh(id); toast('Submitted. Waiting for admin');
      sh.querySelector('.shb').scrollTo({ top: 0, behavior: 'smooth' });
    }
    else if (act === 'copy') {
      const v = a.dataset.v;
      if (navigator.clipboard) navigator.clipboard.writeText(v).then(() => toast('Account number copied'), () => toast(v));
      else toast(v);
    }
  });

  /* Temporary helpers until the Admin Panel exists (run in the browser console):
     LMS_STORE.orders()  → everything submitted on this device
     LMS_STORE.approve(orderId)  /  LMS_STORE.reject(orderId, 'reason')
     LMS_STORE.extend(orderId, days)  → valid days manually extend (students never see this) */
  window.LMS_STORE = {
    orders: () => allOrders().map(o => ({ id: o.id, student: o.name, sid: o.sid, classId: o.classId, status: o.status })),
    approve: id => LMS_ORDERS.approve(id),
    extend: (id, days) => LMS_ORDERS.extend(id, days),
    reject: (id, note) => LMS_ORDERS.reject(id, note)
  };

  /* the admin approves or rejects on another device: refresh by itself */
  window.addEventListener('lms-data', () => { try { render(); if (!sh.hidden && curId && confirmId == null) refresh(curId); } catch (e) {} });
  syncFilter(); render();
})();
