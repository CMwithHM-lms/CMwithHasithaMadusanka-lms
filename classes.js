/* My Classes: every class the student paid for (pending / approved / rejected), grouped by month.
   Inside a class: sessions (Theory, Revision...) each with a Live (Zoom) card and its recordings.
   Admin data comes from LMS_CONFIG.store.classes[].sessions (later: Admin Panel / backend).
   Orders live in localStorage 'lms_orders' (written by the Lesson Store). */
(function () {
  const S = window.STU; if (!S) return;
  const C = window.LMS_CONFIG, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const CLASSES = (C.store && C.store.classes) || [];
  const { sid } = S;
  const MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const HUES = [['#60a5fa', '#2563eb'], ['#a78bfa', '#6d28d9'], ['#f9a8d4', '#db2777'], ['#fdba74', '#ea580c'], ['#5eead4', '#0d9488'], ['#fcd34d', '#b7791f'],
    ['#7dd3fc', '#0369a1'], ['#c4b5fd', '#7c3aed'], ['#fda4af', '#e11d48'], ['#86efac', '#15803d'], ['#fde68a', '#c2410c'], ['#93c5fd', '#4338ca']];

  /* ---------- helpers ---------- */
  const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const safeImg = u => /^(https?:\/\/|data:image\/|[\w./-]+$)/i.test(u || '') ? u : '';
  const safeHttp = u => /^https:\/\//i.test(u || '') ? u : '';
  const mParts = m => { const [y, mo] = String(m).split('-'); return { y, mo: +mo - 1, name: MN[+mo - 1] || m }; };
  const hue = m => HUES[mParts(m).mo % 12] || HUES[0];
  const pad = n => String(n).padStart(2, '0');
  const two = s => pad(s);

  const LABEL = { pending: 'PENDING', active: 'ACTIVE', rejected: 'REJECTED' };
  const STIC = { pending: 'clock', active: 'check', rejected: 'cross' };
  const chip = k => `<span class="chip2 ${k}">${ic(STIC[k])}${LABEL[k]}</span>`;

  /* ---------- the student's classes ---------- */
  function stat(c, o) {
    if (o.status !== 'approved') return { k: o.status };
    const total = c.validDays ? c.validDays + (o.extra || 0) : 0;
    if (!total) return { k: 'active', left: null, total: 0 };
    const end = (o.approved || Date.now()) + total * 864e5, left = Math.ceil((end - Date.now()) / 864e5);
    return left <= 0 ? { k: 'expired' } : { k: 'active', left, total, end };
  }
  function entries() {
    const out = [];
    lsGet('lms_orders', []).forEach(o => {
      if (o.sid !== sid || !['pending', 'approved', 'rejected'].includes(o.status)) return;
      const c = CLASSES.find(x => x.id === o.classId); if (!c) return;
      const s = stat(c, o);
      if (s.k === 'expired') return;                 // valid days finished: removed from My Classes automatically
      out.push(Object.assign({ c, o }, s));
    });
    const order = e => CLASSES.indexOf(e.c);
    return out.sort((a, b) => (a.c.month < b.c.month ? 1 : a.c.month > b.c.month ? -1 : order(a) - order(b)));
  }
  let list = [], monFilter = 'all';

  /* ---------- animated title ---------- */
  (function title() {
    const h = $('#ktitle'), txt = 'My Classes';
    h.innerHTML = [...txt].map((ch, i) => ch === ' ' ? '<span class="sp">&nbsp;</span>' : `<span class="lt" style="--i:${i}">${esc(ch)}</span>`).join('');
    setTimeout(() => { h.classList.add('done'); h.textContent = txt; }, 1500);
  })();

  /* ---------- top stats + next live ---------- */
  function liveState(z) {
    const s = z && z.start ? new Date(z.start).getTime() : NaN;
    if (isNaN(s)) return { k: 'tba', chip: 'SCHEDULE TBA', txt: 'Time will be announced' };
    const e = s + (z.minutes || 120) * 6e4, n = Date.now();
    if (n > e) return { k: 'ended', chip: 'ENDED', txt: 'Session ended. Recording will appear below' };
    if (n >= s) return { k: 'live', chip: 'LIVE NOW', txt: 'Happening right now' };
    const d = s - n, dd = Math.floor(d / 864e5), hh = Math.floor(d % 864e5 / 36e5), mm = Math.floor(d % 36e5 / 6e4), ss = Math.floor(d % 6e4 / 1e3);
    const txt = 'Starts in ' + (dd > 0 ? `${dd}d ${two(hh)}h ${two(mm)}m` : hh > 0 ? `${hh}h ${two(mm)}m ${two(ss)}s` : `${two(mm)}m ${two(ss)}s`);
    return { k: d <= 15 * 6e4 ? 'soon' : 'up', chip: d <= 15 * 6e4 ? 'STARTING SOON' : 'UPCOMING', txt };
  }
  function nextLive() {
    let best = null;
    list.forEach(e => {
      if (e.k !== 'active' || !(e.c.includes || {}).zoom) return;
      (e.c.sessions || []).forEach(s => {
        const z = s.zoom, t = z && z.start ? new Date(z.start).getTime() : NaN;
        if (isNaN(t) || t + (z.minutes || 120) * 6e4 < Date.now()) return;
        if (!best || t < best.t) best = { t, s, z, e };
      });
    });
    return best;
  }
  function yearLive() {                              // next Zoom of the student's own A/L year, even before joining
    let best = null;
    CLASSES.filter(c => String(c.year) === String((S.p || {}).year) && (c.includes || {}).zoom).forEach(c => (c.sessions || []).forEach(s => {
      const z = s.zoom, t = z && z.start ? new Date(z.start).getTime() : NaN;
      if (isNaN(t) || t + (z.minutes || 120) * 6e4 < Date.now()) return;
      if (!best || t < best.t) best = { t, s, z, c };
    }));
    return best;
  }
  function stats() {
    const a = list.filter(e => e.k === 'active').length, pe = list.filter(e => e.k === 'pending').length, nx = nextLive();
    const st = nx ? liveState(nx.z) : null, yl = nx ? null : yearLive(), ys = yl ? liveState(yl.z) : null;
    $('#kstats').innerHTML = `
      <div class="kst"><span class="ki a">${ic('check')}</span><b>${a}</b><small>Active</small></div>
      <div class="kst"><span class="ki p">${ic('clock')}</span><b>${pe}</b><small>Pending</small></div>
      <div class="kst knx${st && st.k === 'live' ? ' live' : ''}"><span class="ki n">${ic('live')}</span>
        <b>${nx ? esc(nx.s.title) : yl ? esc(yl.c.title + ' · ' + yl.s.title) : 'No live yet'}</b><small>${nx ? esc(st.k === 'live' ? 'LIVE NOW' : st.txt) : yl ? esc(ys.txt + ' · join this class to attend') : 'Next live session'}</small></div>`;
  }

  /* ---------- cards ---------- */
  function stripHtml(e) {
    const inc = e.c.includes || {}, tot = e.total, left = e.left;
    const tile = (ico, name, ok) => `<div class="ks${ok ? ' on' : ' off'}">${ic(ico)}<b>${name}</b><small>${ok ? 'Included' : 'Not included'}</small></div>`;
    let days;
    if (e.k === 'active') days = left == null ? `<b>No limit</b><small>Valid</small>` : `<b>${left} ${left === 1 ? 'day' : 'days'}</b><small>left</small>`;
    else days = e.c.validDays ? `<b>${e.c.validDays} days</b><small>valid after approval</small>` : `<b>No limit</b><small>Valid</small>`;
    const pc = e.k === 'active' && left != null ? Math.max(4, Math.min(100, left / tot * 100)) : e.k === 'active' ? 100 : 0;
    return `<div class="kstrip">${tile('cam', 'Zoom', !!inc.zoom)}${tile('play', 'Video', !!inc.video)}
      <div class="ks d ${e.k === 'active' && left != null && left <= 5 ? 'warn' : ''}">${ic('clock')}${days}</div>
      ${e.k === 'active' ? `<div class="kbar"><i style="width:${pc}%"></i></div>` : ''}</div>`;
  }
  function cover(c) {
    const h = hue(c.month), ph = safeImg(c.photo), mp = mParts(c.month);
    return ph ? `<img src="${esc(ph)}" alt="" loading="lazy">`
      : `<div class="kcov" style="--a:${h[0]};--b:${h[1]}"><span class="kc1"></span><span class="kc2"></span><b>${esc(mp.name.slice(0, 3).toUpperCase())}</b></div>`;
  }
  function cardHtml(e, i) {
    const c = e.c, mp = mParts(c.month), n = (c.sessions || []).length, h = hue(c.month);
    const go = e.k === 'active' ? `Open class${ic('arrow')}` : e.k === 'pending' ? `${ic('clock')}Awaiting approval` : `${ic('cross')}View details`;
    return `<article class="kc ${e.k}" tabindex="0" role="button" data-id="${esc(c.id)}" style="--a:${h[0]};--b:${h[1]};--d:${i * 70}ms" aria-label="${esc(c.title)}, ${LABEL[e.k]}">
      <div class="kph">${cover(c)}<span class="kgr"></span>
        <span class="kmo">${ic('cal')}${esc(mp.name)} ${esc(mp.y)}</span>
        <span class="kss">${chip(e.k)}</span>
        <span class="kmd ${c.mode}">${c.mode === 'online' ? 'ONLINE' : 'PHYSICAL'}</span>
        ${e.k === 'pending' ? '<span class="kshim"></span>' : ''}</div>
      <div class="kbd"><h3 class="kt">${esc(c.title)}</h3>
        <p class="kmeta">A/L ${esc(c.year)}${n ? ` · ${n} ${n === 1 ? 'session' : 'sessions'}` : ''}</p>
        ${stripHtml(e)}
        <div class="kgo${e.k === 'active' ? ' hot' : ''}">${go}</div></div></article>`;
  }
  function renderMonths(months) {
    const box = $('#kmon');
    box.hidden = months.length < 2;
    box.innerHTML = ['all'].concat(months).map(m => {
      const lb = m === 'all' ? 'All months' : mParts(m).name + ' ' + mParts(m).y;
      return `<button class="kmc${monFilter === m ? ' on' : ''}" data-m="${esc(m)}">${esc(lb)}</button>`;
    }).join('');
  }
  function render() {
    list = entries();
    const months = [...new Set(list.map(e => e.c.month))];
    if (monFilter !== 'all' && !months.includes(monFilter)) monFilter = 'all';
    renderMonths(months);
    stats();
    const v = $('#kview');
    if (!list.length) {
      v.innerHTML = `<div class="kempty"><div class="eic">${ICON.book}</div><b>No classes yet</b><span>Join a class from the Lesson Store. Once you send your card or slip it appears here as PENDING, and unlocks after an admin approves it.</span>
        <a class="kbtn" href="${esc((C.routes || {}).store || 'store.html')}">${ic('store')}Go to Lesson Store</a></div>`;
      return;
    }
    const shown = months.filter(m => monFilter === 'all' || m === monFilter);
    let i = 0;
    v.innerHTML = shown.map(m => {
      const es = list.filter(e => e.c.month === m), mp = mParts(m);
      return `<section class="kgrp"><div class="kgh"><h2>${esc(mp.name)} <em>${esc(mp.y)}</em></h2><span>${es.length} ${es.length === 1 ? 'class' : 'classes'}</span></div>
        <div class="kgrid">${es.map(e => cardHtml(e, i++)).join('')}</div></section>`;
    }).join('');
  }
  /* ---------- bank details: always visible, read only ---------- */
  function bankRow(b) {
    const lg = safeImg(b.logo), ini = String(b.bank || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return `<div class="bk2"><span class="blogo" style="--bc:${/^#[0-9a-f]{3,8}$/i.test(b.color || '') ? b.color : '#7c3aed'}">${lg ? `<img src="${esc(lg)}" alt="${esc(b.bank)}">` : esc(ini)}</span>
      <span class="binfo"><b>${esc(b.bank)}</b><small>${esc(b.name || '')}${b.branch ? ' · ' + esc(b.branch) : ''}</small><code>${esc(b.account || '')}</code></span>
      <button class="cpy" data-act="bcopy" data-v="${esc(String(b.account || '').replace(/\s/g, ''))}" aria-label="Copy account number">${ic('copy')}</button></div>`;
  }
  function renderBanks() {
    const box = $('#kbank'), banks = ((window.LMS_CONFIG.store || {}).banks || []).filter(b => b && b.bank && b.account);
    if (!banks.length) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = `<div class="kbh">${ic('bank')}<b>Bank details for Online classes</b></div><p class="kbs">Pay the class fee to any account below, then send the slip from the Lesson Store.</p><div class="kbl">${banks.map(bankRow).join('')}</div>`;
  }
  $('#kbank').addEventListener('click', e => {
    const a = e.target.closest('[data-act="bcopy"]'); if (!a) return;
    const v = a.dataset.v; if (navigator.clipboard) navigator.clipboard.writeText(v).then(() => toast('Account number copied'), () => toast(v)); else toast(v);
  });
  $('#kmon').addEventListener('click', e => { const b = e.target.closest('.kmc'); if (b) { monFilter = b.dataset.m; render(); } });
  $('#kview').addEventListener('click', e => { const a = e.target.closest('.kc'); if (a) openClass(a.dataset.id); });
  $('#kview').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('kc')) { e.preventDefault(); openClass(e.target.dataset.id); } });

  /* ---------- zoom links ---------- */
  function zoomParts(link) {
    try {
      const u = new URL(link), id = (u.pathname.match(/\/j\/(\d{8,12})/) || [])[1], pwd = u.searchParams.get('pwd');
      const ok = /(^|\.)(zoom\.us|zoomgov\.com)$/i.test(u.hostname);
      if (!id || !ok) return { app: link, web: link, id: '', pwd: '' };
      const host = u.hostname;
      return { id, pwd,
        app: `zoommtg://${host}/join?action=join&confno=${id}` + (pwd ? `&pwd=${encodeURIComponent(pwd)}` : ''),
        web: `https://${host}/wc/join/${id}` + (pwd ? `?pwd=${encodeURIComponent(pwd)}` : '') };
    } catch (e) { return { app: '', web: '', id: '', pwd: '' }; }
  }
  const fmtId = id => id.replace(/(\d{3})(\d{3,4})(\d{3,4})/, '$1 $2 $3');
  const zoomBadge = () => {
    const lg = safeImg((C.brand || {}).zoomLogo);
    return lg ? `<span class="zlogo"><img src="${esc(lg)}" alt="Zoom"></span>`
      : `<span class="zlogo"><svg viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="13" fill="#2d8cff"/><rect x="9" y="15" width="19" height="18" rx="5" fill="#fff"/><path d="M31 21.5l8-5.2v15.4l-8-5.2z" fill="#fff"/></svg></span>`;
  };

  /* ---------- youtube ---------- */
  function ytId(u) {
    try {
      const x = new URL(u), h = x.hostname.replace(/^(www|m)\./, ''); let id = '';
      if (h === 'youtu.be') id = x.pathname.slice(1).split('/')[0];
      else if (h === 'youtube.com' || h === 'youtube-nocookie.com') id = x.searchParams.get('v') || ((x.pathname.match(/\/(embed|shorts|live)\/([\w-]{11})/) || [])[2] || '');
      return /^[\w-]{11}$/.test(id) ? id : '';
    } catch (e) { return ''; }
  }
  const TC = lsGet('lms_yt_titles', {});
  function fetchTitle(url) {
    if (TC[url]) return Promise.resolve(TC[url]);
    return fetch('https://noembed.com/embed?url=' + encodeURIComponent(url)).then(r => r.json()).then(j => {
      if (j && j.title) { TC[url] = j.title; lsSet('lms_yt_titles', TC); return j.title; }
      return '';
    }).catch(() => '');
  }

  /* ---------- class sheet ---------- */
  const sh = $('#sh'), car = $('#car');
  let cur = null, sIdx = 0, tick = null;

  function openClass(id) {
    cur = list.find(e => e.c.id === id); if (!cur) return;
    sIdx = 0;
    $('#shTitle').textContent = cur.c.title;
    $('#shSub').textContent = mParts(cur.c.month).name + ' ' + mParts(cur.c.month).y + ' · A/L ' + cur.c.year;
    $('#shTag').innerHTML = chip(cur.k);
    sh.hidden = false; document.body.style.overflow = 'hidden';
    drawSheet(); sh.querySelector('.shb').scrollTop = 0;
    clearInterval(tick); tick = setInterval(onTick, 1000);
  }
  function closeClass() { sh.hidden = true; document.body.style.overflow = ''; clearInterval(tick); tick = setInterval(onTick, 1000); cur = null; }

  function banner(e) {
    const what = e.c.mode === 'online' ? 'slip' : 'card';
    if (e.k === 'pending') return `<div class="ban pending">${ic('clock')}<div><b>Waiting for admin approval</b>Your ${what} is being checked. Live sessions and recordings unlock the moment it is approved.</div></div>`;
    if (e.k === 'rejected') return `<div class="ban rejected">${ic('cross')}<div><b>Not approved</b>${esc((e.o && e.o.note) || 'Please upload a clear ' + what + ' and submit again.')}</div></div>
      <a class="kbtn wide" href="${esc((C.routes || {}).store || 'store.html')}">${ic('store')}Upload again in Lesson Store</a>`;
    return e.left != null ? `<div class="ban active">${ic('check')}<div><b>Access unlocked</b>${e.left} ${e.left === 1 ? 'day' : 'days'} left · valid until ${new Date(e.end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div>`
      : `<div class="ban active">${ic('check')}<div><b>Access unlocked</b>Your access has no time limit.</div></div>`;
  }

  function drawSheet() {
    const e = cur, c = e.c, ses = c.sessions || [], ph = safeImg(c.photo);
    let h = '';
    if (ph) h += `<div class="khp"><img src="${esc(ph)}" alt=""><span></span></div>`;
    h += banner(e) + stripHtml(e);
    if (!ses.length) {
      h += `<div class="kempty in"><div class="eic">${ICON.film}</div><b>Content coming soon</b><span>Your live sessions and recordings will appear here as soon as the admin adds them.</span></div>`;
    } else {
      if (ses.length > 1) h += `<div class="seg kseg" id="ktabs" style="--i:${sIdx};--n:${ses.length}" role="tablist"><span class="thumb"></span>${ses.map((s, i) => `<button role="tab" class="${i === sIdx ? 'on' : ''}" data-act="tab" data-i="${i}" aria-selected="${i === sIdx}">${esc(s.title)}</button>`).join('')}</div>`;
      h += `<div id="ksess">${sessionHtml(e, ses[sIdx])}</div>`;
    }
    car.innerHTML = h;
    loadTitles();
  }

  function sessionHtml(e, s) {
    const locked = e.k !== 'active', inc = e.c.includes || {};
    return `<section class="ksb" data-k="${locked ? 'locked' : 'open'}">${liveCard(s, locked, !!inc.zoom)}${recList(s, locked, !!inc.video)}</section>`;
  }

  function liveCard(s, locked, included) {
    const z = s.zoom || {}, link = safeHttp(z.link), ls = liveState(z);
    const when = z.start && !isNaN(new Date(z.start)) ? (() => {
      const a = new Date(z.start), b = new Date(a.getTime() + (z.minutes || 120) * 6e4), tf = d => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `${a.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${tf(a)} – ${tf(b)}`;
    })() : '';
    const head = `<div class="klh">${zoomBadge()}<div class="klt"><small>LIVE SESSION</small><b>${esc(s.title)}</b></div>
      ${included && !locked ? `<span class="kls ${ls.k}" data-lst>${ls.k === 'live' ? '<i></i>' : ''}${ls.chip}</span>` : ''}</div>`;
    if (!included) return `<div class="klive off">${head}<div class="klk">${ic('lock')}<span>Live sessions are not included in this class.</span></div></div>`;
    if (locked) return `<div class="klive lk">${head}${when ? `<div class="klw">${ic('cal')}<span>${esc(when)}</span></div>` : ''}<div class="klk">${ic('lock')}<span>Unlocks after admin approval.</span></div></div>`;
    let h = `<div class="klive ${ls.k}" data-start="${esc(z.start || '')}" data-min="${z.minutes || 120}">${head}`;
    if (when) h += `<div class="klw">${ic('cal')}<span>${esc(when)}</span><em class="kcd" data-cd>${esc(ls.txt)}</em></div>`;
    if (z.notice) h += `<div class="kln">${ic('bell')}<p>${esc(z.notice)}</p></div>`;
    if (!link) return h + `<button class="kjoin" disabled>${ic('clock')}Meeting link coming soon</button><p class="kll">The admin will add the Zoom link before the class.</p></div>`;
    const zp = zoomParts(link);
    h += `<button class="kjoin" data-act="join">${ic('cam')}Join meeting<span class="kar">${ic('arrow')}</span></button>
      <div class="kch" hidden>
        <p>How do you want to join?</p>
        <a class="kopt app" href="${esc(zp.app)}">${zoomBadge()}<span><b>Open in Zoom app</b><small>Fastest. Needs the Zoom app on your device</small></span>${ic('arrow')}</a>
        <a class="kopt web" href="${esc(zp.web)}" target="_blank" rel="noopener noreferrer"><span class="gi">${ic('globe')}</span><span><b>Join from browser</b><small>No install needed. Works on any device</small></span>${ic('arrow')}</a>
        <div class="kcp">
          ${zp.id ? `<button data-act="copy" data-v="${esc(zp.id)}">${ic('hash')}<span><small>Meeting ID</small><b>${esc(fmtId(zp.id))}</b></span>${ic('copy')}</button>` : ''}
          ${z.passcode ? `<button data-act="copy" data-v="${esc(z.passcode)}">${ic('key')}<span><small>Passcode</small><b>${esc(z.passcode)}</b></span>${ic('copy')}</button>` : ''}
          <button data-act="copy" data-v="${esc(link)}">${ic('ext')}<span><small>Meeting link</small><b>Copy link</b></span>${ic('copy')}</button>
        </div></div>`;
    return h + '</div>';
  }

  function recList(s, locked, included) {
    const rs = s.recordings || [], pad2 = n => pad(n + 1);
    const hd = `<div class="krh">${ic('film')}<h4>Recordings</h4><span>${included ? rs.length : 0}</span></div>`;
    if (!included) return `<div class="krec">${hd}<div class="klk">${ic('lock')}<span>Recordings are not included in this class.</span></div></div>`;
    if (!rs.length) return `<div class="krec">${hd}<div class="krn">${ic('film')}<span>No recordings yet. New recordings appear here as soon as they are uploaded.</span></div></div>`;
    if (locked) return `<div class="krec">${hd}${rs.map((r, i) => `<div class="krc lk" style="--d:${i * 50}ms"><span class="kth"><i class="kplay">${ic('lock')}</i><em>${pad2(i)}</em></span><span class="kti"><b>Recording ${pad2(i)}</b><small>Unlocks after admin approval</small></span></div>`).join('')}</div>`;
    return `<div class="krec">${hd}${rs.map((r, i) => {
      const id = ytId(r.url), thumb = safeImg(r.thumb) || (id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : ''), t = r.title || TC[r.url] || '';
      const date = r.date && !isNaN(new Date(r.date)) ? new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      return `<button class="krc" data-act="rec" data-i="${i}" style="--d:${i * 60}ms">
        <span class="kth">${thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<i class="kplay">${ic('play')}</i><em>${pad2(i)}</em></span>
        <span class="kti"><b data-ti="${i}"${r.title ? '' : ' data-auto="1"'}>${esc(t || 'Recording ' + pad2(i))}</b><small>${esc(date)}${date ? ' · ' : ''}${id ? 'YouTube' : 'Video'}</small></span>
        <span class="kar">${ic('arrow')}</span></button>`;
    }).join('')}</div>`;
  }

  /* titles come from YouTube automatically unless the admin typed one */
  function loadTitles() {
    if (!cur || cur.k !== 'active') return;
    const s = (cur.c.sessions || [])[sIdx]; if (!s) return;
    (s.recordings || []).forEach((r, i) => {
      if (r.title || TC[r.url] || !ytId(r.url)) return;
      fetchTitle(r.url).then(t => { const el = t && car.querySelector(`[data-ti="${i}"][data-auto]`); if (el) el.textContent = t; });
    });
  }

  /* ---------- player ---------- */
  const kp = $('#kp');
  function play(r, i) {
    const id = ytId(r.url);
    if (!id) { const u = safeHttp(r.url); if (u) window.open(u, '_blank', 'noopener,noreferrer'); else toast('Link is not available'); return; }
    const el = car.querySelector(`[data-ti="${i}"]`), t = r.title || TC[r.url] || (el && el.textContent) || 'Recording';
    $('#kpTitle').textContent = t; $('#kpSub').textContent = (cur.c.sessions[sIdx].title) + ' · ' + cur.c.title;
    $('#kpOpen').href = 'https://www.youtube.com/watch?v=' + id;
    $('#kpf').innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1" title="${esc(t)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    kp.hidden = false;
  }
  function stop() { kp.hidden = true; $('#kpf').innerHTML = ''; }
  $('#kpX').onclick = stop;
  kp.addEventListener('pointerdown', e => { if (e.target === kp) stop(); });

  /* ---------- sheet events ---------- */
  $('#shX').onclick = closeClass;
  sh.addEventListener('pointerdown', e => { if (e.target === sh) closeClass(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!kp.hidden) stop(); else if (!sh.hidden) closeClass(); } });
  sh.addEventListener('click', e => {
    const a = e.target.closest('[data-act]'); if (!a || !cur) return;
    const act = a.dataset.act;
    if (act === 'tab') {
      sIdx = +a.dataset.i; $('#ktabs').style.setProperty('--i', sIdx);
      $$('#ktabs button').forEach((b, i) => { b.classList.toggle('on', i === sIdx); b.setAttribute('aria-selected', i === sIdx); });
      $('#ksess').innerHTML = sessionHtml(cur, cur.c.sessions[sIdx]); loadTitles();
    } else if (act === 'join') {
      const ch = a.parentElement.querySelector('.kch'), open = ch.hidden;
      ch.hidden = !open; a.classList.toggle('open', open);
      if (open) setTimeout(() => ch.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
    } else if (act === 'copy') {
      const v = a.dataset.v;
      if (navigator.clipboard) navigator.clipboard.writeText(v).then(() => toast('Copied'), () => toast(v)); else toast(v);
    } else if (act === 'rec') {
      const r = cur.c.sessions[sIdx].recordings[+a.dataset.i]; if (r) play(r, +a.dataset.i);
    }
  });

  /* ---------- live clock: countdown, LIVE NOW, expiry ---------- */
  function onTick() {
    stats();
    if (cur) {
      $$('.klive[data-start]').forEach(el => {
        const ls = liveState({ start: el.dataset.start, minutes: +el.dataset.min });
        const cd = el.querySelector('[data-cd]'), st = el.querySelector('[data-lst]');
        if (cd) cd.textContent = ls.txt;
        if (st) { st.className = 'kls ' + ls.k; st.innerHTML = (ls.k === 'live' ? '<i></i>' : '') + ls.chip; }
        el.className = 'klive ' + ls.k;
      });
    }
    // a class whose valid days just finished disappears by itself
    if (!sh.hidden || document.hidden) return;
    const now = entries().map(e => e.c.id + e.k).join();
    if (now !== list.map(e => e.c.id + e.k).join()) render();
  }
  tick = setInterval(onTick, 1000);
  window.addEventListener('storage', () => { if (sh.hidden) render(); });

  /* the admin approved / rejected on another device (or the Owner changed bank details): refresh without a reload */
  window.addEventListener('lms-data', () => { if (sh.hidden) { render(); renderBanks(); } });
  render(); renderBanks();
})();
