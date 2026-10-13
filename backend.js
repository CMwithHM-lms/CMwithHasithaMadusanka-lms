/* backend.js: Firebase layer. Pages keep reading/writing localStorage as before; this file mirrors those keys to Firestore (and data-URL photos to Storage) and keeps them live.
   Login stays Phone + Password: phones/{phone} -> email, then Firebase Auth email+password. */
(function () {
  const F = window.firebase, CFG = window.FIREBASE_CONFIG;
  if (!F || !CFG || !CFG.apiKey || /^PASTE/.test(CFG.apiKey)) { window.LMS_BE = { ready: false, why: F ? 'config' : 'sdk' }; console.warn('Firebase is not configured: running on this device only.'); return; }
  let auth, db;
  try { F.initializeApp(CFG); auth = F.auth(); db = F.firestore(); } catch (e) { window.LMS_BE = { ready: false, why: 'init', err: String((e && e.message) || e) }; console.warn(e); return; }
  try { db.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (e) {}   // local cache: repeat visits cost far fewer reads
  const OWNER = 'thiran.anujitha07@gmail.com', lsRaw = Storage.prototype.setItem;
  const ls = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  let mute = false;
  const setLocal = (k, v) => { mute = true; try { lsRaw.call(localStorage, k, JSON.stringify(v)); } finally { mute = false; } };
  const clean = o => JSON.parse(JSON.stringify(o));
  const sid = s => String(s).replace(/\//g, '_');
  const LIVE = new Set(['lms_site_cfg', 'lms_classes', 'lms_notices', 'lms_sessions', 'lms_contact', 'lms_ach_admin']);   // settings the page reads once at load: reload (when idle) so students see changes at once

  /* what is mirrored. arr = array of records (one doc each), map = object keyed by something, kv = one doc per key */
  const SPEC = {
    lms_marks: { t: 'arr', col: 'marks', id: r => [r.sid, r.year, r.paper].join('|') },
    lms_att: { t: 'arr', col: 'att', id: r => [r.sid, r.date, r.classId || ''].join('|') },
    lms_orders: { t: 'arr', col: 'orders', id: (r, u) => (r._uid || u) + '_' + r.classId, own: 1 },
    lms_complaints: { t: 'arr', col: 'complaints', id: (r, u) => (r._uid || u) + '_' + (r.id || r.ref), own: 1 },
    lms_requests: { t: 'arr', col: 'requests', id: (r, u) => (r._uid || u) + '_' + r.id, own: 1 },
    lms_sessions: { t: 'map', col: 'sessions' },
    lms_email_req: { t: 'arr', col: 'emailreq', id: r => r.old },
    lms_staff: { t: 'arr', col: 'staff', id: r => r.email + '__' + r.role, wrap: 'list' },
    lms_profiles: { t: 'map', col: 'profiles' },
    lms_kyc: { t: 'map', col: 'kyc', key: k => k.replace('|', '__') },
    lms_site_cfg: { t: 'kv' }, lms_contact: { t: 'kv' }, lms_notices: { t: 'kv' }, lms_classes: { t: 'kv' }, lms_ach_admin: { t: 'kv' }, lms_ctrl_pw: { t: 'kv' }, lms_kyc_pw: { t: 'kv' }
  };
  const last = {}; let user = null, staff = false, role = '', unsubs = [], subSes = new Set();
  const adm = () => role === 'admin' || role === 'owner';

  /* Photos are shrunk, saved in Firestore (img/{id}) and replaced by 'imgref/ID'. The reference is turned back into the picture by the observer below. */
  const shrink = (url, px, kb) => new Promise(res => { const i = new Image(); i.onerror = () => res(url); i.onload = () => { const s = Math.min(1, px / Math.max(i.width, i.height)), c = document.createElement('canvas'); c.width = Math.max(1, i.width * s); c.height = Math.max(1, i.height * s); c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); let q = .8, d; do { d = c.toDataURL('image/jpeg', q); q -= .1; } while (d.length * .75 > kb * 1024 && q > .25); res(d); }; i.src = url; });
  async function img(o, uid, kind, key) {
    if (typeof o === 'string') {
      if (!o.startsWith('data:image')) return o;
      const small = key === 'photo', d = await shrink(o, small ? 240 : 900, small ? 15 : 90), id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      await db.collection('img').doc(id).set({ d, _uid: uid, k: kind === 'kyc' ? 'kyc' : kind === 'pub' ? 'pub' : '' });
      return 'imgref/' + id;
    }
    if (Array.isArray(o)) return Promise.all(o.map(x => img(x, uid, kind, key)));
    if (o && typeof o === 'object') { const out = {}; for (const k in o) out[k] = await img(o[k], uid, kind, k); return out; }
    return o;
  }
  const IM = new Map();
  async function resolve(el) {
    const s = el.getAttribute && el.getAttribute('src'); if (!s || !s.startsWith('imgref/')) return;
    const id = s.slice(7); let d = IM.get(id) || sessionStorage.getItem('im:' + id);
    if (!d) { try { d = (await db.collection('img').doc(id).get()).data().d; } catch (e) { return; } if (d.length < 40000) try { sessionStorage.setItem('im:' + id, d); } catch (e) {} }
    IM.set(id, d); if (el.getAttribute('src') === s) el.src = d;
  }
  const scan = n => { if (n.nodeType !== 1) return; if (n.tagName === 'IMG') resolve(n); n.querySelectorAll && n.querySelectorAll('img[src^="imgref/"]').forEach(resolve); };
  new MutationObserver(ms => ms.forEach(m => { if (m.type === 'attributes') resolve(m.target); else m.addedNodes.forEach(scan); })).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
  document.addEventListener('DOMContentLoaded', () => scan(document.body));

  /* Per paper summary (stats/{year|paper}): every student's marks for ranks, plus the top 3 with names. Staff devices write it; students read only their own year (about 20 reads instead of thousands). */
  async function pushStats(items) {
    const prev = last.stats || (last.stats = {}), prof = Object.values(ls('lms_profiles', {})), G = {};
    items.forEach(r => { const k = r.year + '|' + r.paper; (G[k] = G[k] || { year: String(r.year), paper: r.paper, date: '', rows: [] }); const g = G[k]; g.rows.push(r.full != null ? [r.sid, r.pure, r.applied, r.full] : [r.sid, r.pure, r.applied]); if (r.date && (!g.date || r.date < g.date)) g.date = r.date; });
    const seen = new Set();
    for (const k of Object.keys(G)) {
      const g = G[k], id = sid(k); seen.add(id);
      g.top = g.rows.slice().sort((a, b) => (b[1] + b[2]) - (a[1] + a[2]) || b[2] - a[2] || b[1] - a[1]).slice(0, 3).map(x => { const p = prof.find(q => q && q.sid === x[0]) || {}; return { sid: x[0], name: p.name || '', institute: p.institute || '' }; });
      const j = JSON.stringify(g); if (j !== prev[id]) { await db.collection('stats').doc(id).set(g); prev[id] = j; }
    }
    for (const id of Object.keys(prev)) if (!seen.has(id)) { await db.collection('stats').doc(id).delete(); delete prev[id]; }
  }
  const timers = {};
  const fail = (key, e) => { console.warn('sync', key, e.code || e); try { window.dispatchEvent(new CustomEvent('lms-sync-error', { detail: { key, code: (e && e.code) || String(e) } })); } catch (x) {} };
  function push(key) { clearTimeout(timers[key]); timers[key] = setTimeout(() => doPush(key).catch(e => fail(key, e)), 350); }
  async function doPush(key) {
    const s = SPEC[key], u = auth.currentUser; if (!s || !u) return;
    let v = ls(key, null); if (v == null) return;
    if (s.t === 'kv') { if (!staff) return; const nv = await img(clean(v), u.uid, 'pub'); if (JSON.stringify(nv) !== JSON.stringify(v)) setLocal(key, nv); return db.collection('kv').doc(key).set({ v: JSON.stringify(nv) }); }
    const prev = last[key] || (last[key] = {}), col = db.collection(s.col);
    if (s.t === 'arr') {
      const items = s.wrap ? (v.list || []) : v, out = [], ids = new Set();
      for (const r of items) {
        let x = clean(r); if (s.own && !x._uid) x._uid = u.uid;
        const id = sid(s.id(x, u.uid)); ids.add(id);
        if (JSON.stringify(x) !== prev[id]) { x = await img(x, u.uid, s.col); await col.doc(id).set(x); prev[id] = JSON.stringify(x); }
        out.push(prev[id] ? JSON.parse(prev[id]) : x);
      }
      if (staff || s.own) for (const id of Object.keys(prev)) if (!ids.has(id)) { await col.doc(id).delete(); delete prev[id]; }
      setLocal(key, s.wrap ? Object.assign({}, v, { list: out }) : out);
      if (key === 'lms_marks' && staff) await pushStats(out);
    } else {
      for (const k of Object.keys(v).filter(k => !k.startsWith('top_'))) {
        const id = sid(s.key ? s.key(k) : k); let x = Object.assign(clean(v[k]), { _k: k }); if (s.col === 'profiles') x.uid = x.uid || u.uid;
        if (JSON.stringify(x) !== prev[id]) { x = await img(x, u.uid, s.col); await col.doc(id).set(x); prev[id] = JSON.stringify(x); v[k] = Object.assign(clean(x), {}); delete v[k]._k; }
      }
      if (staff) for (const id of Object.keys(prev)) if (!Object.keys(v).some(k => sid(s.key ? s.key(k) : k) === id)) { await col.doc(id).delete(); delete prev[id]; }
      setLocal(key, v);
    }
  }
  const pend = new Set();   // keys written before the saved login was restored (e.g. the Student ID created on page load)
  Storage.prototype.setItem = function (k, v) { lsRaw.call(this, k, v); if (!mute && this === localStorage && SPEC[k]) { if (auth.currentUser) push(k); else pend.add(k); } };

  function apply(key, val) {
    if (JSON.stringify(ls(key, null)) === JSON.stringify(val)) return;
    setLocal(key, val);
    ['lms-data', 'lms-contact'].forEach(n => window.dispatchEvent(new Event(n)));
    const f = 'rl:' + location.pathname, pg = location.pathname.split('/').pop();
    if (!sessionStorage.getItem(f) && !/^(index|register|reset)/.test(pg)) { sessionStorage.setItem(f, '1'); location.reload(); }
    else if (LIVE.has(key) && !staff && !/^(index|register|reset)/.test(pg)) idleReload();
  }
  let idleT = 0;
  function idleReload() {   // reload only when the student is not typing or looking at a pop-up, and at most once a minute
    clearTimeout(idleT);
    const go = () => { const a = document.activeElement, busy = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName), open = document.querySelector('.sh:not([hidden]),.kp:not([hidden]),.sheet:not([hidden]),.ov:not([hidden])'), t = +sessionStorage.getItem('rl:t') || 0;
      if (busy || open || document.hidden || Date.now() - t < 60000) return idleT = setTimeout(go, 4000);
      sessionStorage.setItem('rl:t', Date.now()); location.reload(); };
    idleT = setTimeout(go, 1200);
  }
  function listen(q, key, cb) {
    const s = SPEC[key];
    unsubs.push(q.onSnapshot(snap => {
      const prev = last[key] = {}, docs = [];
      snap.forEach(d => { const x = d.data(); prev[d.id] = JSON.stringify(x); docs.push(x); });
      if (cb) cb(docs);
      if (s.t === 'arr') apply(key, s.wrap ? { list: docs } : docs);
      else { const o = {}, L = ls(key, {}); let keep = false;
        docs.forEach(x => { const k = x._k; const c = Object.assign({}, x); delete c._k;
          if (key === 'lms_profiles' && !c.sid && L[k] && L[k].sid) { c.sid = L[k].sid; keep = true; }   // Student ID is created on this device first: never let an older server copy erase it
          o[k] = c; });
        apply(key, Object.assign({}, L, o)); if (keep) push(key); }
    }, e => console.warn('listen', key, e.code)));
  }
  const kvDocs = C => ['lms_site_cfg', 'lms_contact', 'lms_notices', 'lms_classes', 'lms_ach_admin'].forEach(k => unsubs.push(C('kv').doc(k).onSnapshot(d => { if (d.exists) try { apply(k, JSON.parse(d.data().v)); } catch (e) {} }, () => {})));
  function kvListen() { unsubs.push(db.collection('kv').onSnapshot(snap => snap.forEach(d => { try { apply(d.id, JSON.parse(d.data().v)); } catch (e) {} }), () => {})); }
  /* a student only receives the Zoom link / recordings of classes whose payment is approved (the rules enforce it too) */
  function sessionsFor(docs) {
    docs.filter(o => o.status === 'approved' && o.classId && !subSes.has(o.classId)).forEach(o => {
      subSes.add(o.classId);
      unsubs.push(db.collection('sessions').doc(sid(o.classId)).onSnapshot(d => { if (!d.exists) return; const m = Object.assign({}, ls('lms_sessions', {})); m[o.classId] = { list: d.data().list || [] }; apply('lms_sessions', m); }, () => { subSes.delete(o.classId); }));
    });
  }
  function start() {
    unsubs.forEach(f => f()); unsubs = []; subSes = new Set(); const uid = user.uid, mail = (user.email || '').toLowerCase(), C = n => db.collection(n);
    if (staff) {
      listen(C('marks'), 'lms_marks'); listen(C('profiles'), 'lms_profiles'); kvDocs(C);
      if (adm()) { ['orders', 'complaints', 'emailreq', 'staff', 'requests', 'sessions'].forEach(c => listen(C(c), Object.keys(SPEC).find(k => SPEC[k].col === c)));
        listen(C('att').where('date', '>=', new Date(Date.now() - 35 * 864e5).toISOString().slice(0, 10)), 'lms_att'); }
      if (role === 'owner') { listen(C('kyc'), 'lms_kyc'); ['lms_ctrl_pw', 'lms_kyc_pw'].forEach(k => unsubs.push(C('kv').doc(k).onSnapshot(d => { if (d.exists) try { apply(k, JSON.parse(d.data().v)); } catch (e) {} }, () => {}))); }
    } else {
      listen(C('profiles').where('uid', '==', uid), 'lms_profiles'); listen(C('orders').where('_uid', '==', uid), 'lms_orders', sessionsFor); listen(C('complaints').where('_uid', '==', uid), 'lms_complaints'); listen(C('requests').where('_uid', '==', uid), 'lms_requests');
      const me = Object.values(ls('lms_profiles', {})).find(p => p && p.uid === uid) || {};
      unsubs.push(C('stats').where('year', '==', String(me.year || '2027')).onSnapshot(snap => {
        const rows = [], all = ls('lms_profiles', {});
        snap.forEach(d => { const g = d.data(); g.rows.forEach(x => rows.push({ sid: x[0], year: g.year, paper: g.paper, pure: x[1], applied: x[2], full: x[3] != null ? x[3] : undefined, date: g.date || '' })); (g.top || []).forEach(t => { if (t.sid !== me.sid) all['top_' + t.sid] = { sid: t.sid, name: t.name, year: g.year, institute: t.institute }; }); });
        apply('lms_marks', rows); apply('lms_profiles', all);
      }, e => console.warn('stats', e.code)));
      listen(C('att').where('_uid', '==', uid), 'lms_att'); listen(C('staff').where('email', '==', mail), 'lms_staff');
      kvDocs(C);
    }
  }
  auth.onAuthStateChanged(async u => {
    user = u; if (!u) { unsubs.forEach(f => f()); unsubs = [];
      /* signed out (expired / removed account) on a page that needs login: clear the stale session so the user is not stuck */
      const pg = location.pathname.split('/').pop() || 'index.html';
      if (!/^(index|register|reset)(\.html)?$/.test(pg) && localStorage.getItem('lms_session')) { Object.keys(SPEC).concat(['lms_session']).forEach(k => localStorage.removeItem(k)); sessionStorage.clear(); location.replace('index.html'); }
      return; }
    const mail = (u.email || '').toLowerCase(); role = ''; staff = false;
    if (u.emailVerified && mail === OWNER) role = 'owner';
    if (pend.size) { const ks = [...pend]; pend.clear(); await Promise.all(ks.map(k => doPush(k).catch(e => console.warn('sync', k, e.code || e)))); }
    if (!role && u.emailVerified) { try { const r = (await db.collection('staff').where('email', '==', mail).get()).docs.map(d => d.data()).filter(d => d.status === 'accepted').map(d => d.role); role = r.includes('owner') ? 'owner' : r.includes('admin') ? 'admin' : r.includes('analyze') ? 'analyze' : ''; } catch (e) {} }
    staff = !!role; if (window.LMS_BE) window.LMS_BE.role = role; start(); if (!staff) setTimeout(healSid, 4000);
  });

  /* public site settings are readable before login (institutes on the register form, notices...) */
  db.collection('kv').doc('lms_site_cfg').get().then(d => { if (d.exists) try { apply('lms_site_cfg', JSON.parse(d.data().v)); } catch (e) {} }).catch(() => {});

  const TRACK = Object.keys(SPEC).concat(['lms_session']);
  /* Student ID = 2 digits of the year + 6 digits, reserved in sids/{id} so two students can never get the same one */
  /* A reserved ID can be refused for two reasons: the ID is already taken (rare, just try another) or the Firestore rules do not allow sids/{id}
     (then EVERY try is refused). Several different IDs refused in a row = the rules are the problem. */
  const newSid = async uid => { const yy = String(new Date().getFullYear()).slice(-2); let last = '', denied = 0;
    for (let i = 0; i < 12; i++) { const id = yy + String(Math.floor(Math.random() * 1e6)).padStart(6, '0'); try { await db.collection('sids').doc(id).set({ uid }); return id; } catch (e) { last = (e && e.code) || String(e); if (last === 'permission-denied') denied++; } }
    throw { code: denied >= 3 ? 'sid-rules' : 'sid-failed', detail: last }; };
  /* If a student was registered while the rules were missing, the ID is reserved the next time they sign in (after the rules are published). */
  async function healSid() {
    if (!user || staff) return;
    const all = ls('lms_profiles', {}), k = Object.keys(all).find(x => all[x] && all[x].uid === user.uid), p = k && all[k];
    if (!p || !p.sidLocal || !p.sid) return;
    try { await db.collection('sids').doc(p.sid).set({ uid: user.uid }); delete p.sidLocal; localStorage.setItem('lms_profiles', JSON.stringify(all)); } catch (e) { /* rules still missing, or the ID is taken: try again at the next sign in */ }
  }
  window.LMS_BE = {
    ready: true, auth, db, role: '',
    /* write a key to the server now and tell the caller if it worked (the Admin Panel uses this for approve / reject) */
    async sync(key) { clearTimeout(timers[key]); if (!auth.currentUser) return { ok: false, code: 'not-signed-in' }; try { await doPush(key); return { ok: true }; } catch (e) { fail(key, e); return { ok: false, code: (e && e.code) || String(e) }; } },
    /* staff console: students who share a Student ID (only possible if they registered while the sids rule was missing) */
    sidAudit() { const by = {}; Object.keys(ls('lms_profiles', {})).forEach(k => { const p = ls('lms_profiles', {})[k]; if (p && p.sid && !k.startsWith('top_')) (by[p.sid] = by[p.sid] || []).push((p.name || '') + ' ' + (p.phone || k)); }); return Object.keys(by).filter(k => by[k].length > 1).map(k => ({ sid: k, students: by[k] })); },
    async findStudent(id) { try { const s = await db.collection('profiles').where('sid', '==', String(id)).limit(1).get(); if (s.empty) return null; const x = s.docs[0].data(); delete x._k; return x; } catch (e) { return null; } },
    async login(phone, pass) {
      const d = await db.collection('phones').doc(phone).get(); if (!d.exists) throw { code: 'auth/user-not-found' };
      await auth.signInWithEmailAndPassword(d.data().email, pass);
      const p = await db.collection('profiles').doc(phone).get(); const all = ls('lms_profiles', {});
      if (p.exists) { const x = p.data(); delete x._k; all[phone] = x; setLocal('lms_profiles', all); }
      sessionStorage.clear(); lsRaw.call(localStorage, 'lms_session', phone);
    },
    async register(phone, email, pass, profile) {
      if ((await db.collection('phones').doc(phone).get()).exists) throw { code: 'phone-taken' };
      const c = await auth.createUserWithEmailAndPassword(email, pass);
            try {
        let id = '';
        try { id = await newSid(c.user.uid); }
        catch (e) { if (!e || e.code !== 'sid-rules') throw e; console.warn('Student ID could not be reserved: publish firestore.rules (the sids/{id} rule). The ID is created on this device and reserved at the next sign in.'); }
        await db.collection('phones').doc(phone).set({ email: email.toLowerCase(), uid: c.user.uid });
        await db.collection('profiles').doc(phone).set(Object.assign(clean(profile), { _k: phone, uid: c.user.uid }, id ? { sid: id } : { sidLocal: true }));
      } catch (e) { try { await c.user.delete(); } catch (x) {} throw e; }
      try { c.user.sendEmailVerification(); } catch (e) {}
      await auth.signOut();
    },
    async resendVerify() { if (auth.currentUser) await auth.currentUser.sendEmailVerification(); },
    async reset(phone, email) {
      const d = await db.collection('phones').doc(phone).get();
      if (!d.exists || d.data().email !== String(email).trim().toLowerCase()) throw { code: 'no-match' };
      await auth.sendPasswordResetEmail(d.data().email);
    },
    async logout() { try { await auth.signOut(); } catch (e) {} TRACK.forEach(k => localStorage.removeItem(k)); sessionStorage.clear(); location.replace('index.html'); }
  };
})();
