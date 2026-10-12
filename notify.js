/* notify.js: notification bell for every signed-in page (loaded by shell.js).

   WHAT IT DOES
   - Keeps a list of notifications for each student ('lms_notifs' in localStorage; the backend replaces this later).
   - WATCHES for changes and creates notifications by itself, so nothing else in the site has to call it:
       payment submitted / APPROVED / rejected / access extended / expiring / expired
       new class for the student's year + type, new session, Zoom link added or changed, class time changed,
       new recording, "class starts in 15 minutes", marks added, blue tick, island top 3, goal completed,
       new achievement, new notice, tute tracking updates, admin reply to a complaint, change-request result,
       new admin message / Telegram channel, attendance marked.
   - The first time a student opens the site it only takes a snapshot (no flood of old items) and sends a welcome message.
   - Bell shows an unread badge, swings when something new comes, and a small banner pops under it for a few seconds.

   CONSOLE HELPERS (until the Admin Panel exists; the backend will call the same push()):
     LMS_NOTIFY.send('26881376', 'Title', 'Message', 'classes.html')   -> one student
     LMS_NOTIFY.broadcast('Title', 'Message', 'home.html')              -> every student
     LMS_NOTIFY.list()  LMS_NOTIFY.unread()  LMS_NOTIFY.check()  LMS_NOTIFY.clear()  LMS_NOTIFY.demo() */
(function () {
  const S = window.STU, K = window.LMS_CORE;
  if (!S || window.LMS_NOTIFY) return;
  const C = window.LMS_CONFIG || {}, NC = Object.assign({ enabled: true, soonMinutes: 15, expiryWarnDays: 3, bannerSeconds: 6, keep: 300 }, C.notifications || {});
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const ic = n => `<i class="ico">${typeof ICON !== 'undefined' ? (ICON[n] || ICON.bell || '') : ''}</i>`;
  const sid = S.sid;
  const NK = 'lms_notifs', SK = 'lms_nstate', SNAP = 'lms_nsnap_' + sid;
  const ls = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const f1 = v => Math.round(v * 10) / 10;
  const R = k => (C.routes || {})[k] || ({ dashboard: 'home.html', classes: 'classes.html', store: 'store.html', analyze: 'analyze.html', achievements: 'achievements.html', profile: 'profile.html', contact: 'contact.html' })[k] || '';
  const prof = () => (ls('lms_profiles', {})[S.phone]) || S.p || {};
  const hash = s => { let h = 5381; for (const c of String(s)) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); };
  const monthLabel = m => { const [y, mo] = String(m || '').split('-'); return MN[+mo - 1] ? MN[+mo - 1] + ' ' + y : ''; };
  const when = t => new Date(t).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });

  /* ====================================================== storage ====== */
  const all = () => { const a = ls(NK, []); return Array.isArray(a) ? a : []; };
  const stAll = () => ls(SK, {});
  const st = () => { const s = stAll()[sid] || {}; return { read: s.read || {}, del: s.del || {} }; };
  const stSave = s => { const a = stAll(); a[sid] = s; lsSet(SK, a); };
  const mine = () => { const s = st(); return all().filter(n => (n.sid === sid || n.sid === '*') && !s.del[n.id]).sort((a, b) => b.ts - a.ts); };
  const unreadList = () => { const s = st(); return mine().filter(n => !s.read[n.id]); };

  function push(to, n) {
    if (NC.enabled === false) return 0;
    const a = all(), added = [];
    (Array.isArray(to) ? to : [to]).forEach(t => {
      t = String(t);
      if (n.key && a.some(x => x.sid === t && x.key === n.key)) return;
      const rec = { id: uid(), sid: t, type: n.type || 'info', icon: n.icon || 'bell', title: String(n.title || '').slice(0, 120), body: String(n.body || '').slice(0, 320), link: n.link || '', key: n.key || '', ts: Date.now() };
      a.push(rec); added.push(rec);
    });
    if (!added.length) return 0;
    if (a.length > NC.keep) a.splice(0, a.length - NC.keep);
    if (!lsSet(NK, a)) { a.splice(0, Math.ceil(a.length / 2)); lsSet(NK, a); }
    window.dispatchEvent(new Event('lms-notify'));
    return added.length;
  }

  /* ============================================ change detection ====== */
  /* collect() describes the student's world as { key, value, fn } rows.
     fn(previousValue) runs only when that key is new or its value changed since the last snapshot, and returns a notification or null. */
  function collect() {
    const out = [], add = (k, v, fn) => out.push({ k, v: String(v), fn });
    const p = prof(), yr = String(p.year || ''), mode = p.institute === 'ONLINE' ? 'online' : 'physical';
    const classes = (C.store && C.store.classes) || [], orders = ls('lms_orders', []).filter(o => o.sid === sid);
    const ordOf = id => orders.find(o => o.classId === id);
    const stat = (c, o) => {
      if (!o || o.status !== 'approved') return { k: o ? o.status : 'none' };
      const total = c.validDays ? c.validDays + (o.extra || 0) : 0; if (!total) return { k: 'active', left: null };
      const left = Math.ceil(((o.approved || Date.now()) + total * 864e5 - Date.now()) / 864e5);
      return left <= 0 ? { k: 'expired' } : { k: 'active', left };
    };
    const label = c => (c ? [monthLabel(c.month), c.title].filter(Boolean).join(' · ') : 'your class');

    /* --- payments (slip / card) --- */
    orders.forEach(o => {
      const c = classes.find(x => x.id === o.classId), what = (c && c.mode === 'online') || o.kind === 'slip' ? 'slip' : 'card', inc = (c && c.includes) || {};
      add('ord:' + o.classId, [o.status, o.extra || 0, o.approved || 0, o.submitted || 0, o.note || ''].join('|'), prev => {
        const pv = prev ? prev.split('|') : [], ps = pv[0], pe = +pv[1] || 0;
        if (o.status === 'approved' && ps !== 'approved') {
          const parts = [inc.zoom ? 'Zoom' : '', inc.video ? 'recordings' : ''].filter(Boolean);
          return { type: 'ok', icon: 'check', title: 'Payment approved', link: R('classes'),
            body: label(c) + ' is now active.' + (parts.length ? ' ' + parts.join(' and ') + ' unlocked.' : '') + (c && c.validDays ? ' Valid for ' + (c.validDays + (o.extra || 0)) + ' days.' : '') };
        }
        if (o.status === 'approved' && ps === 'approved' && (o.extra || 0) > pe)
          return { type: 'gold', icon: 'clock', title: 'Access extended', link: R('classes'), body: (o.extra - pe) + ' extra days were added to ' + label(c) + '.' };
        if (o.status === 'rejected' && ps !== 'rejected')
          return { type: 'bad', icon: 'cross', title: 'Payment not approved', link: R('store'), body: (o.note ? o.note + ' ' : '') + 'Upload a clear ' + what + ' for ' + label(c) + ' and submit again.' };
        if (o.status === 'pending' && ps !== 'pending')
          return { type: 'info', icon: 'clock', title: 'Submitted for review', link: R('classes'), body: 'Your ' + what + ' for ' + label(c) + ' is with the admin. We will notify you the moment it is approved.' };
        return null;
      });
      if (c && o.status === 'approved') {
        const s = stat(c, o);
        if (s.k === 'expired') add('ordx:' + o.classId + ':' + (o.approved || 0) + ':' + (o.extra || 0), '1', () => ({ type: 'bad', icon: 'clock', title: 'Class access expired', link: R('store'), body: label(c) + ' has ended. Upload a new ' + what + ' in Lesson Store to renew.' }));
        else if (s.left != null && s.left <= NC.expiryWarnDays)
          add('exp:' + o.classId + ':' + s.left, '1', () => ({ type: 'warn', icon: 'clock', title: s.left === 1 ? 'Last day of your class access' : s.left + ' days of access left', link: R('store'), body: label(c) + ' will end soon. Renew in Lesson Store to keep your Zoom and recordings.' }));
      }
    });

    /* --- classes, sessions, Zoom, recordings --- */
    classes.forEach(c => {
      const match = String(c.year) === yr && c.mode === mode, o = ordOf(c.id), act = !!o && stat(c, o).k === 'active', inc = c.includes || {};
      add('cls:' + c.id, '1', () => match ? { type: 'violet', icon: 'book', title: 'New class available', link: R('store'), body: label(c) + (c.fee > 0 ? ' · LKR ' + Number(c.fee).toLocaleString('en-US') : '') + '. Open Lesson Store to join.' } : null);
      (c.sessions || []).forEach(s => {
        const z = s.zoom || {}, base = c.id + ':' + s.id;
        add('ses:' + base, '1', () => act ? { type: 'violet', icon: 'cam', title: 'New session added', link: R('classes'), body: s.title + ' is now in ' + label(c) + '.' } : null);
        add('zl:' + base, z.link || '', prev => (act && inc.zoom && prev !== undefined && z.link)
          ? { type: 'info', icon: 'cam', title: prev ? 'Zoom link updated' : 'Zoom link added', link: R('classes'), body: s.title + (z.start ? ' · ' + when(z.start) : '') + '. Open My Classes to join.' } : null);
        add('zs:' + base, z.start || '', prev => (act && inc.zoom && prev !== undefined && z.start && prev !== z.start)
          ? { type: 'warn', icon: 'cal', title: prev ? 'Class time changed' : 'Class scheduled', link: R('classes'), body: s.title + ' is now on ' + when(z.start) + '.' } : null);
        (s.recordings || []).forEach(r => add('rec:' + base + ':' + r.url, '1', () => (act && inc.video)
          ? { type: 'violet', icon: 'play', title: 'New recording', link: R('classes'), body: (r.title || s.title) + ' · ' + label(c) } : null));
        const t = z.start ? new Date(z.start).getTime() : NaN, d = t - Date.now();
        if (act && inc.zoom && z.link && !isNaN(t) && d > 0 && d <= NC.soonMinutes * 6e4)
          add('soon:' + base + ':' + z.start, '1', () => ({ type: 'warn', icon: 'live', title: 'Class starts in ' + Math.max(1, Math.round(d / 6e4)) + ' min', link: R('classes'), body: s.title + ' · ' + label(c) + '. Tap to join.' }));
      });
    });

    /* --- marks, blue tick, top 3, goals --- */
    if (K) {
      try {
        K.fresh();
        const L = K.mine(sid, yr || undefined), weak = C.weakBelow || 40, short = n => String(n).replace(/^\d{4}\s+/, '');
        L.forEach(r => add('mk:' + r.paper, r.pure + '/' + r.applied, prev => ({
          type: r.t < weak ? 'warn' : 'info', icon: 'analyze', link: R('analyze'),
          title: (prev ? 'Marks updated: ' : 'Marks added: ') + short(r.paper),
          body: 'Pure ' + r.pure + ' · Applied ' + r.applied + ' · Total ' + f1(r.t) + (r.rk && r.rk.n >= 5 ? ' · Rank #' + r.rk.r + ' of ' + r.rk.n : '') + (r.t < weak ? '. Ask your teacher for extra help.' : '')
        })));
        const has = K.isVerified(sid);
        add('tick', has ? '1' : '0', prev => has && prev !== '1' ? { type: 'blue', icon: 'verified', title: 'You earned the blue tick!', link: R('achievements'), body: 'Congratulations. Your name now shows the verified tick everywhere.' } : null);
        const T = K.top3(yr || undefined), me = T && T.list.find(e => e.sid === sid);
        if (T && T.paper) add('top3:' + T.paper, me ? me.rank : 0, prev => me && prev !== String(me.rank)
          ? { type: ['gold', 'silver', 'bronze'][me.rank - 1], icon: 'medal', title: 'Island top 3: #' + me.rank, link: R('achievements'), body: 'You are ' + ['1st', '2nd', '3rd'][me.rank - 1] + ' in ' + short(T.paper) + '. Well done!' } : null);
        (C.goals || []).forEach(g => { const gs = K.goal(g, L); add('goal:' + g.id, gs.done ? '1' : '0', prev => gs.done && prev !== '1' ? { type: 'ok', icon: g.icon || 'target', title: 'Goal completed', link: R('achievements'), body: g.title } : null); });
      } catch (e) {}
    }
    const ach = (C.achievements || {})[sid] || (C.achievements || {})['*'] || [];
    ach.forEach(a => add('ach:' + a.title + '|' + (a.date || ''), '1', () => ({ type: a.type === 'blue' ? 'blue' : 'gold', icon: a.icon || 'achieve', title: 'New achievement: ' + a.title, link: R('achievements'), body: a.note || '' })));

    /* --- notices, tute, attendance --- */
    (C.notices || []).forEach(n => add('nt:' + n.title + '|' + (n.date || ''), '1', () => ({ type: 'warn', icon: 'bell', title: 'New notice', link: R('dashboard'), body: n.title })));
    const tr = (C.tute || {})[sid];
    add('tute', tr ? (tr.confirmed ? 1 : 0) + '|' + (tr.stage || 1) + '|' + (tr.courierId || '') : 'none', prev => {
      if (!tr || !tr.confirmed) return null;
      const stage = ['Dispatched', 'At courier hub', 'Delivered'][(tr.stage || 1) - 1] || 'Updated', was = prev && prev.split('|');
      if (!was || was[0] !== '1') return { type: 'ok', icon: 'truck', title: 'Tute tracking activated', link: R('dashboard'), body: 'Status: ' + stage + (tr.courierId ? ' · Courier ID ' + tr.courierId : '') + '.' };
      return { type: tr.stage === 3 ? 'ok' : 'info', icon: 'truck', title: 'Tute update: ' + stage, link: R('dashboard'), body: [tr.courier, tr.courierId ? 'ID ' + tr.courierId : '', tr.center].filter(Boolean).join(' · ') };
    });
    if (window.LMS_ATT) LMS_ATT.list(sid).slice(0, 30).forEach(r => add('att:' + r.date + ':' + (r.classId || ''), '1', () => ({ type: 'ok', icon: 'check', title: 'Attendance marked', link: R('profile'), body: 'You were marked present on ' + new Date(r.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }) + '.' })));

    /* --- contact: replies, requests, admin messages --- */
    if (K && K.complaints) K.complaints().filter(c => c.sid === sid).forEach(c => add('cmp:' + c.id, (c.status || 'new') + '|' + (c.reply ? 1 : 0), prev => {
      if (prev === undefined) return null;
      if (c.reply && prev.split('|')[1] !== '1') return { type: 'ok', icon: 'chat', title: 'Admin replied to ' + c.ref, link: R('contact'), body: String(c.reply).slice(0, 140) };
      if (c.status === 'review') return { type: 'info', icon: 'clock', title: c.ref + ' is in review', link: R('contact'), body: 'An admin is looking into your complaint.' };
      if (c.status === 'resolved') return { type: 'ok', icon: 'check', title: c.ref + ' resolved', link: R('contact'), body: 'Open Contact Us to read the reply.' };
      return null;
    }));
    ls('lms_requests', []).filter(r => r.sid === sid).forEach(r => add('req:' + r.id, r.status, prev => {
      if (prev === undefined || r.status === 'pending') return null;
      const ok = r.status === 'approved';
      return { type: ok ? 'ok' : 'bad', icon: ok ? 'check' : 'cross', title: 'Change request ' + (ok ? 'approved' : r.status), link: R('profile'), body: r.label + (ok ? ' was updated to ' + r.value + '.' : ' request was not accepted.') };
    }));
    if (K && K.contact) {
      const d = K.contact(), nt = d.notice || {};
      add('cnotice', nt.text ? hash(nt.text) : '', prev => prev !== undefined && nt.text ? { type: 'warn', icon: 'bell', title: nt.title || 'Message from the admin', link: R('contact'), body: String(nt.text).slice(0, 140) } : null);
      (d.channels || []).forEach(ch => add('chn:' + ch.url, '1', () => ({ type: 'info', icon: 'send', title: 'New Telegram channel', link: R('contact'), body: ch.name + (ch.desc ? ' · ' + ch.desc : '') })));
    }
    return out;
  }

  let busy = false;
  function check() {
    if (busy || NC.enabled === false) return; busy = true;
    try {
      const rows = collect(), now = {}; rows.forEach(r => { now[r.k] = r.v; });
      const old = ls(SNAP, null); lsSet(SNAP, now);
      if (old === null) push(sid, { key: 'welcome', type: 'violet', icon: 'spark', title: 'Welcome to Combined Maths', body: 'You will get a notification here for payments, classes, recordings, marks and replies.', link: R('dashboard') });
      else rows.forEach(r => {
        const had = Object.prototype.hasOwnProperty.call(old, r.k);
        if (had && old[r.k] === r.v) return;
        let n = null; try { n = r.fn(had ? old[r.k] : undefined); } catch (e) {}
        if (n) push(sid, Object.assign({ key: r.k + '|' + r.v }, n));
      });
    } catch (e) {}
    busy = false;
  }

  /* ================================================================ UI ====== */
  const bell = $('#bell'); if (!bell) { window.LMS_NOTIFY = { push, check, send: () => 0, broadcast: () => 0 }; return; }
  const baseTitle = document.title;
  document.body.insertAdjacentHTML('beforeend', `
<section class="npanel" id="npanel" role="dialog" aria-label="Notifications" aria-modal="false" hidden>
  <header class="nph"><div class="npt"><h2>Notifications</h2><small id="nSub"></small></div>
    <div class="npa"><button class="nact" id="nAll" type="button" title="Mark all as read">${ic('check')}<span>Read all</span></button><button class="nact danger" id="nClr" type="button" title="Clear all">${ic('trash')}<span>Clear</span></button><button class="nact icon" id="nX" type="button" aria-label="Close">${ic('cross')}</button></div></header>
  <div class="nseg" id="nSeg" role="tablist"><span class="nth"></span><button role="tab" data-f="all" class="on">All</button><button role="tab" data-f="unread">Unread <em id="nUn"></em></button></div>
  <div class="nlist" id="nList" tabindex="-1"></div>
</section>
<div class="nbanner" id="nbanner" role="status" aria-live="polite" hidden></div>`);
  const panel = $('#npanel'), list = $('#nList'), banner = $('#nbanner');
  const stt = { open: false, f: 'all', clr: 0 };
  let known = new Set(mine().map(n => n.id)), bt = 0;

  const ago = t => {
    const d = Date.now() - t; if (d < 45e3) return 'Just now'; if (d < 36e5) return Math.max(1, Math.round(d / 6e4)) + ' min ago';
    if (d < 864e5) return Math.round(d / 36e5) + ' h ago';
    const dd = Math.floor(d / 864e5); if (dd === 1) return 'Yesterday'; if (dd < 7) return dd + ' days ago';
    return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };
  const dayKey = t => { const a = new Date(t), b = new Date(), c = new Date(); c.setDate(b.getDate() - 1); const s = d => d.toDateString(); return s(a) === s(b) ? 'Today' : s(a) === s(c) ? 'Yesterday' : 'Earlier'; };
  const TY = { ok: 'ok', bad: 'bad', info: 'info', warn: 'warn', gold: 'gold', silver: 'silver', bronze: 'bronze', violet: 'violet', blue: 'blue' };

  function item(n, un) {
    return `<li class="ni t-${TY[n.type] || 'info'}${un ? ' un' : ''}" data-id="${esc(n.id)}"><button class="nib" type="button" data-act="open"><span class="nic">${ic(n.icon)}</span>
      <span class="nit"><b>${esc(n.title)}</b>${n.body ? `<span>${esc(n.body)}</span>` : ''}<small>${esc(ago(n.ts))}</small></span>${un ? '<i class="ndot" aria-label="Unread"></i>' : ''}</button>
      <button class="nx" type="button" data-act="del" aria-label="Dismiss notification">${ic('cross')}</button></li>`;
  }
  function paintBadge() {
    const u = unreadList().length;
    const b = $('#nbadge'); b.hidden = !u; b.textContent = u > 9 ? '9+' : u;
    bell.classList.toggle('has', u > 0);
    bell.setAttribute('aria-label', u ? 'Notifications, ' + u + ' unread' : 'Notifications');
    document.title = (u ? '(' + (u > 9 ? '9+' : u) + ') ' : '') + baseTitle;
    return u;
  }
  function paint() {
    const u = paintBadge(), s = st(), L = mine(), show = stt.f === 'unread' ? L.filter(n => !s.read[n.id]) : L;
    $('#nSub').textContent = u ? u + ' unread' : L.length ? 'You are all caught up' : '';
    $('#nUn').textContent = u ? u : ''; $('#nUn').hidden = !u;
    $('#nAll').disabled = !u; $('#nClr').disabled = !L.length;
    if (!panel.hidden) {
      if (!show.length) list.innerHTML = `<div class="nempty"><span class="nei">${ic('bell')}</span><b>${stt.f === 'unread' ? 'No unread notifications' : 'No notifications yet'}</b><span>${stt.f === 'unread' ? 'You have read everything.' : 'Payment approvals, new classes, recordings and marks will show up here.'}</span></div>`;
      else { let g = '', h = ''; show.forEach(n => { const k = dayKey(n.ts); if (k !== g) { g = k; h += `${h ? '</ul>' : ''}<h3 class="ngh">${k}</h3><ul>`; } h += item(n, !s.read[n.id]); }); list.innerHTML = h + '</ul>'; }
    }
  }
  function ring() { bell.classList.remove('ring'); void bell.offsetWidth; bell.classList.add('ring'); }

  /* open / close */
  function setOpen(o) {
    stt.open = o; panel.hidden = !o; bell.setAttribute('aria-expanded', String(o)); bell.classList.toggle('open', o);
    if (o) { hideBanner(); paint(); list.scrollTop = 0; $('#nX').focus({ preventScroll: true }); clearTimeout(tm); tm = setInterval(() => { if (!panel.hidden) paint(); }, 30000); }
    else clearInterval(tm);
  }
  let tm = 0;
  bell.addEventListener('click', e => { e.stopPropagation(); setOpen(!stt.open); if (!stt.open) bell.focus({ preventScroll: true }); });
  $('#nX').onclick = () => { setOpen(false); bell.focus({ preventScroll: true }); };
  document.addEventListener('pointerdown', e => { if (stt.open && !panel.contains(e.target) && !bell.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && stt.open) { setOpen(false); bell.focus({ preventScroll: true }); } });
  const av = $('#avatar'); if (av) av.addEventListener('pointerdown', () => { if (stt.open) setOpen(false); });

  /* actions */
  const markRead = id => { const s = st(); if (s.read[id]) return; s.read[id] = 1; stSave(s); };
  function go(link) {
    if (!link) return;
    const here = location.pathname.split('/').pop() || 'index.html', [pg, hs] = link.split('#');
    if (!pg || pg === here) { const el = hs && document.getElementById(hs); if (el) el.scrollIntoView({ behavior: 'smooth' }); else window.scrollTo({ top: 0, behavior: 'smooth' }); } else location.href = link;
  }
  list.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return; const li = b.closest('.ni'), id = li.dataset.id;
    if (b.dataset.act === 'del') {
      const n = all().find(x => x.id === id), s = st(); s.del[id] = 1; stSave(s);
      if (n && n.sid === sid) lsSet(NK, all().filter(x => x.id !== id));
      li.classList.add('out'); setTimeout(paint, 220); paintBadge();
    } else { const n = mine().find(x => x.id === id); markRead(id); setOpen(false); paint(); if (n) go(n.link); }
  });
  $('#nAll').onclick = () => { const s = st(); mine().forEach(n => { s.read[n.id] = 1; }); stSave(s); paint(); };
  $('#nClr').onclick = e => {
    const b = e.currentTarget;
    if (!stt.clr) { stt.clr = 1; b.classList.add('sure'); b.querySelector('span').textContent = 'Sure?'; setTimeout(() => { stt.clr = 0; b.classList.remove('sure'); b.querySelector('span').textContent = 'Clear'; }, 3000); return; }
    stt.clr = 0; b.classList.remove('sure'); b.querySelector('span').textContent = 'Clear';
    const s = st(), mineIds = new Set(mine().map(n => n.id)); mineIds.forEach(id => { s.del[id] = 1; }); stSave(s);
    lsSet(NK, all().filter(n => !(n.sid === sid && mineIds.has(n.id)))); paint();
  };
  $('#nSeg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; stt.f = b.dataset.f;
    $$('#nSeg button').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
    $('#nSeg').style.setProperty('--i', stt.f === 'unread' ? 1 : 0); paint();
  });

  /* pop-up banner under the bell for a brand-new notification */
  function hideBanner() { clearTimeout(bt); banner.classList.remove('show'); setTimeout(() => { if (!banner.classList.contains('show')) banner.hidden = true; }, 260); }
  function showBanner(fresh) {
    if (stt.open || !fresh.length) return;
    const n = fresh[0], more = fresh.length - 1;
    banner.dataset.id = n.id; banner.dataset.link = n.link || '';
    banner.className = 'nbanner t-' + (TY[n.type] || 'info');
    banner.innerHTML = `<button class="nbm" type="button"><span class="nic">${ic(n.icon)}</span><span class="nit"><b>${esc(n.title)}</b><span>${esc(more ? more + ' more new notification' + (more > 1 ? 's' : '') : n.body)}</span></span></button><button class="nbx" type="button" aria-label="Close">${ic('cross')}</button><i class="nbt" style="animation-duration:${NC.bannerSeconds}s"></i>`;
    banner.hidden = false; void banner.offsetWidth; banner.classList.add('show');
    clearTimeout(bt); bt = setTimeout(hideBanner, NC.bannerSeconds * 1000);
  }
  banner.addEventListener('click', e => {
    if (e.target.closest('.nbx')) return hideBanner();
    if (e.target.closest('.nbm')) { const id = banner.dataset.id, link = banner.dataset.link; hideBanner(); if (fresh1(id)) markRead(id); paint(); if (link) go(link); else setOpen(true); }
  });
  const fresh1 = id => mine().some(n => n.id === id);
  banner.addEventListener('pointerenter', () => clearTimeout(bt));
  banner.addEventListener('pointerleave', () => { if (banner.classList.contains('show')) bt = setTimeout(hideBanner, 2500); });

  /* react to data changes (this tab, other tabs, the clock) */
  function sync() {
    const L = mine(), s = st(), fresh = L.filter(n => !known.has(n.id) && !s.read[n.id]);
    L.forEach(n => known.add(n.id));
    paint();
    if (fresh.length) { ring(); showBanner(fresh); }
  }
  window.addEventListener('lms-notify', sync);
  const recheck = () => { check(); sync(); };
  ['lms-data', 'lms-contact'].forEach(ev => window.addEventListener(ev, recheck));
  window.addEventListener('storage', e => { if (!e.key || /^lms_/.test(e.key)) recheck(); });
  window.addEventListener('focus', recheck);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) recheck(); });
  setInterval(() => { if (!document.hidden) recheck(); }, 15000);

  /* ---------- public api ---------- */
  window.LMS_NOTIFY = {
    push, check: recheck,
    send: (to, title, body, link) => push(to, { type: 'info', icon: 'bell', title, body, link: link || '' }),
    broadcast: (title, body, link) => push('*', { type: 'info', icon: 'bell', title, body, link: link || '', key: 'bc:' + uid() }),
    list: () => mine(), unread: () => unreadList().length,
    clear: () => { lsSet(NK, all().filter(n => n.sid !== sid)); const s = st(); mine().forEach(n => { s.del[n.id] = 1; }); stSave(s); sync(); return 'cleared'; },
    demo: () => {
      [{ type: 'ok', icon: 'check', title: 'Payment approved', body: 'October 2026 · Theory + Revision Class is now active. Zoom and recordings unlocked. Valid for 31 days.', link: R('classes') },
       { type: 'info', icon: 'cam', title: 'Zoom link added', body: 'Theory Class · Wed, 14 Oct, 6:00 PM. Open My Classes to join.', link: R('classes') },
       { type: 'violet', icon: 'play', title: 'New recording', body: 'Limits - Part 3 · Theory Class', link: R('classes') },
       { type: 'info', icon: 'analyze', title: 'Marks added: Paper No 14', body: 'Pure 71 · Applied 80 · Total 75.5 · Rank #9 of 61', link: R('analyze') },
       { type: 'warn', icon: 'live', title: 'Class starts in 15 min', body: 'Revision Class · Tap to join.', link: R('classes') }]
        .forEach((n, i) => push(sid, Object.assign({ key: 'demo:' + uid() + i }, n)));
      return 'demo notifications added';
    }
  };

  bell.hidden = false;
  paint();
  check(); sync();
})();
