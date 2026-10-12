/* core.js: shared data + rules used by every signed-in page.
   - marks (this student's sample + admin entries + demo cohort)
   - blue verify tick: a student who scores config.verifyAt (80) or more in ANY paper gets a blue tick, shown beside their name everywhere
   - all-island Top 3 per paper (auto), with admin override
   Later the backend replaces load() / directory() / admin() and everything else keeps working.

   Console helpers until the Admin Panel exists (work on any page):
     LMS_MARKS.add(studentId, 'Paper No 14', pure, applied, 'YYYY-MM-DD', '2027')
     LMS_MARKS.weak()                    -> students below config.weakBelow in their latest paper
     LMS_ACH.verify(studentId)           -> give the blue tick by hand      LMS_ACH.unverify(studentId) -> take it away
     LMS_ACH.auto(studentId)             -> go back to automatic for that student
     LMS_ACH.setTop3('2027', [id1, id2, id3], 'Paper No 14')  -> choose the Top 3 by hand
     LMS_ACH.clearTop3('2027')           -> back to automatic
     LMS_ACH.status()                    -> what is overridden right now
     LMS_ATT.mark(studentId, 'YYYY-MM-DD')  -> attendance (the QR scanner page does this)   LMS_ATT.week(studentId, -1) -> last week
     LMS_CONTACT.*                       -> Contact Us data + complaints (full list in the block near the bottom of this file) */
(function () {
  const C = window.LMS_CONFIG || {};
  const ls = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const esc = window.esc || (s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])));
  const VERIFY = Number(C.verifyAt) || 80, WEAK = C.weakBelow || 40;
  const f1 = v => Math.round(v * 10) / 10, tot = r => (r.pure + r.applied) / 2, clamp = v => Math.max(3, Math.min(100, Math.round(v)));
  const key = r => r.sid + '|' + r.year + '|' + r.paper;
  const today = () => new Date().toISOString().slice(0, 10);

  /* ---------- who is this device's student (for sample marks) ---------- */
  let me = { sid: '', year: '2027' };
  function who() {
    try {
      const ph = localStorage.getItem('lms_session'), all = JSON.parse(localStorage.getItem('lms_profiles') || '{}'), p = ph && all[ph];
      if (p) me = { sid: p.sid || '', year: String(p.year || '2027') };
    } catch (e) {}
    return me;
  }

  /* ---------- demo cohort (only while config.demo is not false) ---------- */
  const FIRST = ['Kasun', 'Nimali', 'Sahan', 'Dilini', 'Tharindu', 'Hansika', 'Ravindu', 'Sanduni', 'Chamod', 'Ishara', 'Lakshan', 'Menaka', 'Pasindu', 'Rashmi', 'Dinuka', 'Thisari', 'Nuwan', 'Sachini', 'Kavindu', 'Oshadi', 'Janith', 'Amaya', 'Isuru', 'Pavani', 'Dulan', 'Nethmi', 'Yasiru', 'Hirushi', 'Charith', 'Vidusha'];
  const LAST = ['Perera', 'Silva', 'Fernando', 'Jayasinghe', 'Wickramasinghe', 'Bandara', 'Rajapaksha', 'Gunawardena', 'Herath', 'Dissanayake', 'Senanayake', 'Ratnayake', 'Weerasinghe', 'Karunaratne', 'Amarasinghe'];
  const demoName = i => FIRST[i % 30] + ' ' + LAST[(i * 4 + Math.floor(i / 30) * 7) % 15];

  /* ---------- admin overrides (Admin Panel will write these) ---------- */
  const admin = () => { const a = ls('lms_ach_admin', {}); a.verify = a.verify || {}; a.top3 = a.top3 || {}; return a; };

  /* ---------- marks ---------- */
  function load(yr, myId) {
    const M = new Map(), put = r => M.set(key(r), r);
    const adm = ls('lms_marks', []), cp = C.papers || [];
    yr = String(yr || who().year); myId = myId || who().sid;
    const names = [...new Set(cp.map(p => p.no).concat(adm.filter(r => String(r.year) === yr).map(r => r.paper)))];
    const pd = {};
    cp.forEach(p => { if (p.date && !pd[p.no]) pd[p.no] = p.date; });
    adm.forEach(r => { if (r.date && String(r.year) === yr && (!pd[r.paper] || r.date < pd[r.paper])) pd[r.paper] = r.date; });
    if (C.demo !== false) {                         // demo cohort: every mark depends only on (student, paper), so adding a paper never reshuffles old ones
      const hash = str => { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
      const rng = seed => { let s = seed % 2147483647 || 1; s = s * 16807 % 2147483647; return () => (s = s * 16807 % 2147483647) / 2147483647; };
      for (let i = 0; i < 60; i++) {
        const b = 30 + rng(hash('base' + i))() * 48;
        names.forEach(n => { const r = rng(hash(i + '|' + n)); put({ sid: 'D' + i, year: yr, paper: n, pure: clamp(b + (r() - .5) * 30), applied: clamp(b + (r() - .5) * 30), date: pd[n] || '', demo: 1 }); });
      }
    }
    if (myId) cp.forEach(p => put({ sid: myId, year: yr, paper: p.no, pure: p.pure, applied: p.applied, date: p.date || '' }));
    adm.forEach(r => put(Object.assign({}, r, { year: String(r.year) })));
    return [...M.values()];
  }

  /* ---------- people ---------- */
  function directory() {
    const D = {}, insts = Object.keys(C.institutes || {});
    if (C.demo !== false) for (let i = 0; i < 60; i++) D['D' + i] = { sid: 'D' + i, name: demoName(i), year: who().year, institute: insts[i % insts.length] || '', demo: 1 };
    const all = ls('lms_profiles', {});
    Object.values(all).forEach(p => { if (p && p.sid) D[p.sid] = { sid: p.sid, name: p.name || '', year: String(p.year || ''), institute: p.institute || '', photo: p.photo || '', school: p.school || '' }; });
    return D;
  }
  const person = (D, sid) => D[sid] || { sid, name: 'Student ' + sid, year: '', institute: '' };

  /* ---------- papers + rank ---------- */
  const byDate = (a, b) => (a.date || '9999').localeCompare(b.date || '9999');
  function papersOf(rows, year) {
    const m = {};
    rows.filter(r => r.year === String(year)).forEach(r => { const o = m[r.paper] || (m[r.paper] = { name: r.paper, date: '', n: 0 }); o.n++; if (r.date && (!o.date || r.date < o.date)) o.date = r.date; });
    return Object.values(m).sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.name.localeCompare(a.name, undefined, { numeric: true }));
  }
  const cmp = (a, b) => tot(b) - tot(a) || b.applied - a.applied || b.pure - a.pure || String(a.sid).localeCompare(String(b.sid));
  const rankOf = (rows, year, paper, sid) => {
    const c = rows.filter(r => r.year === String(year) && r.paper === paper), mine = c.find(r => r.sid === sid);
    if (!mine) return { r: 0, n: c.length };
    return { r: 1 + c.filter(x => tot(x) > tot(mine)).length, n: c.length };
  };

  /* ---------- blue tick ---------- */
  function verified(rows, D) {
    const A = admin(), by = {};
    rows.forEach(r => { if (tot(r) >= VERIFY) { const o = by[r.sid]; if (!o || (r.date || '9999') < (o.date || '9999')) by[r.sid] = { sid: r.sid, date: r.date || '', paper: r.paper, total: tot(r), manual: false }; } });
    Object.keys(A.verify).forEach(sid => { if (A.verify[sid] === true && !by[sid]) by[sid] = { sid, date: A.verify[sid + ':date'] || today(), paper: '', total: 0, manual: true }; if (A.verify[sid] === false) delete by[sid]; });
    return Object.values(by).map(v => Object.assign(v, { who: person(D, v.sid) })).sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.who.name.localeCompare(b.who.name));
  }

  /* ---------- all-island top 3 ---------- */
  function top3(rows, D, year, paper) {
    year = String(year);
    const ps = papersOf(rows, year); if (!ps.length) return { year, paper: '', papers: [], list: [], manual: false, n: 0 };
    const latest = ps[0].name; paper = paper && ps.some(p => p.name === paper) ? paper : latest;
    const A = admin(), ov = A.top3[year];
    const cohort = rows.filter(r => r.year === year && r.paper === paper).sort(cmp);
    let list, manual = false;
    if (ov && ov.sids && ov.sids.length && (paper === latest || paper === ov.paper)) {
      manual = true;
      list = ov.sids.slice(0, 3).map((sid, i) => { const r = cohort.find(x => x.sid === sid); return { sid, rank: i + 1, total: r ? tot(r) : null, pure: r ? r.pure : null, applied: r ? r.applied : null, who: person(D, sid) }; });
    } else list = cohort.slice(0, 3).map((r, i) => ({ sid: r.sid, rank: i + 1, total: tot(r), pure: r.pure, applied: r.applied, who: person(D, r.sid) }));
    return { year, paper, latest, papers: ps, list, manual, n: cohort.length };
  }

  /* ---------- one student's own list ---------- */
  function mine(rows, sid, year) {
    year = String(year);
    return rows.filter(r => r.sid === sid && r.year === year).sort(byDate).map(r => {
      const rk = rankOf(rows, year, r.paper, sid);
      return Object.assign({}, r, { t: tot(r), rk, pct: rk.n ? rk.r / rk.n * 100 : 100 });
    });
  }

  /* ---------- goals (tasks) ---------- */
  function goalState(g, L) {
    const n = L.length, T = Number(g.target) || 0, best = n ? Math.max(...L.map(x => x.t)) : 0;
    const clampP = v => Math.max(0, Math.min(100, v));
    switch (g.metric) {
      case 'best': { const t = T || VERIFY; return { pct: clampP(best / t * 100), done: best >= t, text: n ? f1(best) + ' / ' + t : '0 / ' + t, left: Math.max(0, f1(t - best)) }; }
      case 'avg': { const a = n ? L.reduce((x, y) => x + y.t, 0) / n : 0; return { pct: clampP(a / T * 100), done: a >= T, text: f1(a) + ' / ' + T }; }
      case 'papers': return { pct: clampP(n / T * 100), done: n >= T, text: n + ' / ' + T };
      case 'toppct': { const b = n ? Math.min(...L.map(x => x.pct)) : 100; return { pct: clampP((100 - b) / (100 - T) * 100), done: n > 0 && b <= T, text: n ? 'Best: Top ' + Math.max(1, Math.round(b)) + '%' : 'No papers yet' }; }
      case 'improve': { if (n < 2) return { pct: 0, done: false, text: 'Needs 2 papers' }; const d = L[n - 1].t - L[n - 2].t; return { pct: d > 0 ? 100 : clampP(100 + d * 4), done: d > 0, text: (d >= 0 ? '+' : '') + f1(d) + ' marks' }; }
      default: return { pct: 0, done: false, text: '' };
    }
  }

  /* ---------- blue tick markup ---------- */
  function seal() {
    let d = ''; for (let i = 0; i <= 200; i++) { const a = i / 200 * Math.PI * 2, r = 9.7 + 1.05 * Math.cos(10 * a); d += (i ? 'L' : 'M') + (12 + r * Math.cos(a)).toFixed(2) + ' ' + (12 + r * Math.sin(a)).toFixed(2); }
    return d + 'Z';
  }
  function sprite() {
    if (document.getElementById('vtsprite') || !document.body) return;
    document.body.insertAdjacentHTML('afterbegin', `<svg id="vtsprite" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><defs>
      <linearGradient id="vtg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6fd0ff"/><stop offset=".55" stop-color="#2d8cff"/><stop offset="1" stop-color="#1558e8"/></linearGradient>
      <symbol id="vts" viewBox="0 0 24 24"><path d="${seal()}" fill="url(#vtg)"/><path d="M5.5 7.2c2.4-2.6 6.4-3.2 9.4-1.2" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.3" stroke-linecap="round"/><path d="M7.5 12.4l3 3.1 6.1-6.7" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></symbol></defs></svg>`);
  }
  const tickRaw = (cls, tip) => `<span class="vt${cls ? ' ' + cls : ''}" role="img" aria-label="Verified student" title="${esc(tip || 'Verified student · scored ' + VERIFY + '+')}"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#vts"/></svg></span>`;

  /* ---------- public api ---------- */
  let cache = null;
  function snap() {
    if (cache && cache.t > Date.now() - 400) return cache;
    const w = who(), rows = load(w.year, w.sid), D = directory(), V = verified(rows, D);
    return (cache = { t: Date.now(), rows, D, V, vset: new Set(V.map(v => v.sid)), me: w });
  }
  const fresh = () => { cache = null; return snap(); };
  const api = {
    VERIFY, tot, f1, esc, load, snap, fresh,
    isVerified: sid => snap().vset.has(sid),
    verifiedList: () => snap().V,
    tick: (sid, cls) => { sprite(); const s = snap(); if (!s.vset.has(sid)) return ''; const v = s.V.find(x => x.sid === sid); return tickRaw(cls, v && v.manual ? 'Verified by your teacher' : ''); },
    nameInline: (name, sid, short) => { let w = String(name || '').trim().split(/\s+/); if (short && w.length > 2) w = [w[0], w[w.length - 1]]; const last = w.pop() || '', t = api.tick(sid); return (w.length ? esc(w.join(' ')) + ' ' : '') + `<span class="nb">${esc(last)}${t}</span>`; },
    tickAlways: cls => { sprite(); return tickRaw(cls); },
    nameHtml: (name, sid, cls) => `<span class="nmt"><span class="nm">${esc(name)}</span>${api.tick(sid, cls)}</span>`,
    top3: (year, paper) => { const s = snap(); return top3(s.rows, s.D, year, paper); },
    years: () => { const s = snap(), ys = [...new Set(s.rows.map(r => r.year))].sort(); if (!ys.includes(s.me.year)) ys.push(s.me.year); return ys.sort(); },
    mine: (sid, year) => { const s = snap(); return mine(s.rows, sid, year || s.me.year); },
    goal: goalState,
    person: sid => person(snap().D, sid)
  };
  window.LMS_CORE = api;

  /* ---------- admin helpers (temporary, until the Admin Panel) ---------- */
  const save = a => { lsSet('lms_ach_admin', a); cache = null; window.dispatchEvent(new Event('lms-data')); return 'saved'; };
  window.LMS_ACH = {
    verify: id => { const a = admin(); a.verify[String(id)] = true; a.verify[id + ':date'] = today(); return save(a); },
    unverify: id => { const a = admin(); a.verify[String(id)] = false; return save(a); },
    auto: id => { const a = admin(); delete a.verify[String(id)]; delete a.verify[id + ':date']; return save(a); },
    setTop3: (year, sids, paper) => { const a = admin(); a.top3[String(year)] = { paper: paper || '', sids: sids.map(String).slice(0, 3) }; return save(a); },
    clearTop3: year => { const a = admin(); delete a.top3[String(year)]; return save(a); },
    status: () => admin()
  };
  window.LMS_MARKS = {
    add: (id, paper, pure, applied, date, year) => {
      const a = ls('lms_marks', []), y = String(year || who().year), i = a.findIndex(r => r.sid === String(id) && String(r.year) === y && r.paper === paper);
      const rec = { sid: String(id), year: y, paper, pure: +pure, applied: +applied, date: date || today() };
      if (i >= 0) a[i] = rec; else a.push(rec);
      if (!lsSet('lms_marks', a)) return 'could not save'; cache = null; window.dispatchEvent(new Event('lms-data')); return 'added';
    },
    /* Full marks (one mark out of 100 for the whole paper): list = [{sid, mark}], empty mark = remove that student's mark */
    setMany: (year, paper, date, list) => {
      const a = ls('lms_marks', []), y = String(year); let n = 0;
      list.forEach(({ sid, mark }) => {
        const i = a.findIndex(r => r.sid === String(sid) && String(r.year) === y && r.paper === paper);
        if (mark === '' || mark == null) { if (i >= 0) { a.splice(i, 1); n++; } return; }
        const m = Math.round(Number(mark) * 10) / 10; if (!(m >= 0 && m <= 100)) return;
        const rec = { sid: String(sid), year: y, paper, pure: m, applied: m, full: m, date: date || today() };
        if (i >= 0) a[i] = Object.assign({}, a[i], rec, { date: a[i].date || rec.date }); else a.push(rec); n++;
      });
      if (!lsSet('lms_marks', a)) return 'could not save'; cache = null; window.dispatchEvent(new Event('lms-data')); return n + ' saved';
    },
    all: () => ls('lms_marks', []),
    weak: () => {
      const s = fresh(), by = {};
      s.rows.filter(r => !r.demo).forEach(r => { (by[r.sid + '|' + r.year] = by[r.sid + '|' + r.year] || []).push(r); });
      return Object.values(by).map(a => a.sort(byDate).pop()).filter(r => tot(r) < WEAK)
        .map(r => { const q = Object.values(ls('lms_profiles', {})).find(x => x.sid === r.sid) || {}; return { sid: r.sid, name: q.name || '', phone: q.phone || '', whatsapp: q.whatsapp || '', paper: r.paper, total: tot(r) }; });
    }
  };

  /* ---------- Telegram username rules ----------
     Format check only (works offline). The backend repeats this check and can also confirm the account really exists. */
  const tgClean = raw => String(raw || '').trim().replace(/^(https?:\/\/)?(www\.)?(t\.me|telegram\.me|telegram\.dog)\//i, '').replace(/^@+/, '').replace(/[/?#].*$/, '').trim();
  function tgFormat(u) {
    if (!u) return 'Enter your Telegram username.';
    if (/\s/.test(u)) return 'A username cannot contain spaces.';
    if (!/^[A-Za-z0-9_]+$/.test(u)) return 'Use only English letters, numbers and underscores (_).';
    if (u.length < 5) return 'A Telegram username has at least 5 characters.';
    if (u.length > 32) return 'A Telegram username has at most 32 characters.';
    if (!/^[A-Za-z]/.test(u)) return 'The username must start with a letter.';
    if (/_$/.test(u)) return 'The username cannot end with an underscore.';
    if (/__/.test(u)) return 'The username cannot have two underscores in a row.';
    return '';
  }
  const tgCheck = (raw, selfPhone) => new Promise(res => {
    const u = tgClean(raw), why = tgFormat(u);
    if (why) return res({ ok: false, msg: why });
    const taken = Object.values(ls('lms_profiles', {})).find(p => p && p.telegram && p.telegram.toLowerCase() === u.toLowerCase() && p.phone !== selfPhone);
    if (taken) return res({ ok: false, msg: 'This username is already connected to another student.' });
    res({ ok: true, user: u });
  });

  /* ---------- attendance (the admin QR scanner writes this; weeks run Monday to Sunday) ---------- */
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const monday = (d, off) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7) + (off || 0) * 7); return x; };
  const attAll = () => ls('lms_att', []);
  function attWeek(sid, off, now) {
    const s = monday(now || new Date(), off), e = new Date(s); e.setDate(e.getDate() + 6);
    const a = ymd(s), b = ymd(e), rows = attAll().filter(r => r.sid === String(sid) && r.date >= a && r.date <= b).sort((x, y) => x.date.localeCompare(y.date));
    return { offset: off, from: a, to: b, attended: rows.length > 0, dates: rows.map(r => r.date), rows };
  }
  window.LMS_ATT = {
    mark: (sid, date, classId, uidHint) => {
      const a = attAll(), d = date || ymd(new Date()), c = classId || '';
      if (a.some(r => r.sid === String(sid) && r.date === d && (r.classId || '') === c)) return 'already marked';
      const pr = Object.values(ls('lms_profiles', {})).find(x => x && x.sid === String(sid)) || {};
      a.push({ sid: String(sid), date: d, classId: c, t: Date.now(), _uid: pr.uid || uidHint || '' });
      if (!lsSet('lms_att', a)) return 'could not save'; window.dispatchEvent(new Event('lms-data')); return 'marked';
    },
    unmark: (sid, date) => { lsSet('lms_att', attAll().filter(r => !(r.sid === String(sid) && r.date === date))); return 'removed'; },
    week: (sid, off, now) => attWeek(sid, off || 0, now),
    recent: (sid, n, now) => { const out = []; for (let i = -(n || 4) + 1; i <= 0; i++) out.push(attWeek(sid, i, now)); return out; },
    list: sid => attAll().filter(r => r.sid === String(sid)).sort((a, b) => b.date.localeCompare(a.date))
  };

  /* ---------- Contact Us data (Admin Panel edits this; defaults come from config.contact) ---------- */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const CT_LISTS = { telegram: 't', whatsapp: 'w', channels: 'c', faqs: 'f' };
  function ctGet() {
    const src = ls('lms_contact', null) || C.contact || {}, d = Object.assign({ telegram: [], whatsapp: [], channels: [], faqs: [], notice: { title: '', text: '' }, hours: '' }, JSON.parse(JSON.stringify(src)));
    Object.keys(CT_LISTS).forEach(k => { d[k] = (Array.isArray(d[k]) ? d[k] : []).map((x, i) => Object.assign({ id: CT_LISTS[k] + i }, x)); });
    d.notice = Object.assign({ title: '', text: '' }, d.notice || {});
    return d;
  }
  const ctSave = d => { const ok = lsSet('lms_contact', d); window.dispatchEvent(new Event('lms-contact')); return ok ? 'saved' : 'could not save'; };
  const waNorm = n => { let d = String(n || '').replace(/\D/g, ''); if (/^94\d{9}$/.test(d)) d = '0' + d.slice(2); return /^0\d{9}$/.test(d) ? d : ''; };
  const chanUrl = raw => {
    let u = String(raw || '').trim(); if (!u) return '';
    if (/^@[A-Za-z][\w]{3,}$/.test(u)) return 'https://t.me/' + u.slice(1);
    if (/^(www\.)?(t\.me|telegram\.me)\//i.test(u)) u = 'https://' + u;
    return /^https:\/\/(www\.)?(t\.me|telegram\.me)\/[\w+\-\/]{3,}$/i.test(u) ? u : '';
  };
  const ccAll = () => ls('lms_complaints', []);
  const delFrom = (k, key) => { const d = ctGet(), n = d[k].length; d[k] = d[k].filter(x => x.id !== key && (x.user || x.number || x.name || '') !== key); return d[k].length === n ? 'not found' : ctSave(d); };
  const addTo = (k, item) => { const d = ctGet(); d[k].push(Object.assign({ id: uid() }, item)); return ctSave(d); };
  Object.assign(api, { tgClean, tgFormat, tgCheck, waNorm, chanUrl, ymd, contact: ctGet, complaints: ccAll,
    addComplaint: rec => { const a = ccAll(); a.push(rec); return lsSet('lms_complaints', a); } });

  /* Console helpers for Contact Us until the Admin Panel exists:
     LMS_CONTACT.addTelegram('username', 'Label')    LMS_CONTACT.removeTelegram('username')
     LMS_CONTACT.addWhatsApp('0771234567', 'Label')  LMS_CONTACT.removeWhatsApp('0771234567')
     LMS_CONTACT.setNotice('Text', 'Title')          LMS_CONTACT.clearNotice()
     LMS_CONTACT.addChannel('Name', 'https://t.me/xxx', 'Short description')   LMS_CONTACT.removeChannel('Name')
     LMS_CONTACT.addFaq('Question', 'Answer')        LMS_CONTACT.setHours('Mon - Sat · 8.00 AM - 8.00 PM')
     LMS_CONTACT.complaints()                        -> every complaint with the full student details, newest first
     LMS_CONTACT.reply(complaintId, 'Reply text')    LMS_CONTACT.setStatus(complaintId, 'new' | 'review' | 'resolved')
     LMS_CONTACT.telegramLinks()                     -> students who connected a Telegram username
     LMS_CONTACT.reset()                             -> forget all admin edits and go back to config.contact */
  window.LMS_CONTACT = {
    data: ctGet,
    addTelegram: (user, label) => { const u = tgClean(user), why = tgFormat(u); if (why) return why; if (ctGet().telegram.some(x => x.user.toLowerCase() === u.toLowerCase())) return 'already added'; return addTo('telegram', { user: u, label: label || '' }); },
    removeTelegram: key => delFrom('telegram', tgClean(key)),
    addWhatsApp: (number, label) => { const n = waNorm(number); if (!n) return 'Enter a valid number like 0771234567'; if (ctGet().whatsapp.some(x => x.number === n)) return 'already added'; return addTo('whatsapp', { number: n, label: label || '' }); },
    removeWhatsApp: key => delFrom('whatsapp', waNorm(key) || key),
    setNotice: (text, title) => { const d = ctGet(); d.notice = { title: title || d.notice.title || '', text: String(text || '').trim(), date: ymd(new Date()) }; return ctSave(d); },
    clearNotice: () => { const d = ctGet(); d.notice = { title: '', text: '' }; return ctSave(d); },
    addChannel: (name, url, desc) => { const u = chanUrl(url); if (!String(name || '').trim()) return 'Enter a channel name'; if (!u) return 'Enter a Telegram link like https://t.me/yourchannel'; return addTo('channels', { name: String(name).trim(), url: u, desc: desc || '' }); },
    removeChannel: key => delFrom('channels', key),
    addFaq: (q, a) => (q && a) ? addTo('faqs', { q, a }) : 'Enter both question and answer',
    removeFaq: key => { const d = ctGet(); const n = d.faqs.length; d.faqs = d.faqs.filter(x => x.id !== key && x.q !== key); return d.faqs.length === n ? 'not found' : ctSave(d); },
    setHours: t => { const d = ctGet(); d.hours = String(t || '').trim(); return ctSave(d); },
    complaints: () => ccAll().slice().sort((a, b) => (a.created || 0) - (b.created || 0)).map((c, i) => Object.assign({ no: i + 1 }, c)).reverse(),
    reply: (id, text) => { const a = ccAll(), c = a.find(x => x.id === id || x.ref === id); if (!c) return 'not found'; c.reply = String(text || '').trim(); c.repliedAt = Date.now(); c.status = 'resolved'; lsSet('lms_complaints', a); window.dispatchEvent(new Event('lms-contact')); return 'replied'; },
    setStatus: (id, status) => { const a = ccAll(), c = a.find(x => x.id === id || x.ref === id); if (!c) return 'not found'; c.status = status; lsSet('lms_complaints', a); window.dispatchEvent(new Event('lms-contact')); return 'updated'; },
    telegramLinks: () => Object.values(ls('lms_profiles', {})).filter(p => p && p.telegram).map(p => ({ sid: p.sid, name: p.name, phone: p.phone, whatsapp: p.whatsapp || '', telegram: '@' + p.telegram, connected: p.telegramAt ? new Date(p.telegramAt).toLocaleString('en-GB') : '' })),
    reset: () => { try { localStorage.removeItem('lms_contact'); } catch (e) {} window.dispatchEvent(new Event('lms-contact')); return 'back to config defaults'; }
  };


  /* ---------- Payments (orders): the Admin Panel uses this ---------- */
  const oAll = () => ls('lms_orders', []);
  const clsOf = id => ((window.LMS_CONFIG && LMS_CONFIG.store && LMS_CONFIG.store.classes) || []).find(c => c.id === id);
  const expiresOf = o => { const c = clsOf(o.classId) || {}; return c.validDays ? (o.approved || Date.now()) + (c.validDays + (o.extra || 0)) * 864e5 : null; };
  const oEdit = (id, fn) => { const a = oAll(), o = a.find(x => x.id === id); if (!o) return 'not found'; const r = fn(o); if (!lsSet('lms_orders', a)) return 'could not save'; window.dispatchEvent(new Event('lms-data')); if (window.LMS_NOTIFY) try { LMS_NOTIFY.check(); } catch (e) {} return r; };
  window.LMS_ORDERS = {
    list: () => oAll().slice().sort((a, b) => (b.submitted || b.created || 0) - (a.submitted || a.created || 0)),
    classOf: clsOf,
    classTitle: id => { const c = clsOf(id); return c ? c.title + ' · ' + c.month + ' · ' + c.mode : id; },
    approve: id => oEdit(id, o => { o.status = 'approved'; o.approved = Date.now(); o.expires = expiresOf(o); delete o.note; return 'approved'; }),
    reject: (id, note) => oEdit(id, o => { o.status = 'rejected'; o.note = note || ''; delete o.expires; return 'rejected'; }),
    extend: (id, days) => oEdit(id, o => { o.extra = (o.extra || 0) + Number(days || 0); if (o.status === 'approved') o.expires = expiresOf(o); return 'extended by ' + days + ' days (total extra ' + o.extra + ')'; })
  };
  window.addEventListener('storage', () => { cache = null; });
  if (document.body) sprite(); else document.addEventListener('DOMContentLoaded', sprite);
})();
