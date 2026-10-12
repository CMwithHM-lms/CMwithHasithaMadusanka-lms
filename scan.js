/* Admin QR scanner: scan a student's QR (or type the Student ID) and see everything that matters at the desk:
   details, fees, latest paper, blue tick and whether they attended LAST WEEK. Can also mark today's attendance.
   Data comes from the same localStorage keys the student pages write; the backend replaces them later. */
(function () {
  const C = window.LMS_CONFIG || {}, K = window.LMS_CORE, $ = s => document.querySelector(s), root = document.documentElement;
  const PREFIX = (C.qr && C.qr.prefix) || 'LMS:';
  const ls = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2000); };
  const pad = n => String(n).padStart(2, '0');
  const dLong = s => new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const dShort = s => new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  /* theme + logo */
  const setTheme = t => { root.dataset.theme = t; try { localStorage.setItem('lms_theme', t); } catch (e) {} $('#theme').innerHTML = `<i class="ico">${ICON[t === 'dark' ? 'sun' : 'moon']}</i>`; };
  { let t = 'light'; try { t = localStorage.getItem('lms_theme') || 'light'; } catch (e) {} setTheme(t); }
  $('#theme').onclick = () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
  { const im = new Image(); im.alt = 'Combined Class'; im.onload = () => $('#logo').replaceChildren(im); im.src = (C.brand || {}).logo || ''; }
  window.renderIcons = (r = document) => r.querySelectorAll('[data-ic]').forEach(el => { el.innerHTML = ICON[el.dataset.ic] || ''; el.classList.add('ico'); });
  renderIcons();

  const err = t => { const e = $('#scErr'); e.textContent = t || ''; e.hidden = !t; };

  /* ---------- gather everything about one student ---------- */
  function lookup(raw) {
    let id = String(raw || '').trim(); if (id.toUpperCase().startsWith(PREFIX.toUpperCase())) id = id.slice(PREFIX.length); id = id.trim();
    const p = Object.values(ls('lms_profiles', {})).find(x => x && x.sid === id);
    if (!p) return { ok: false, id };
    const year = String(p.year || '2027'), tot = r => (r.pure + r.applied) / 2;
    const rows = K.load(year, id).filter(r => r.sid === id).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
    const last = rows[rows.length - 1];
    let rank = null;
    if (last) { const cohort = K.load(year, id).filter(r => r.year === year && r.paper === last.paper); rank = { r: 1 + cohort.filter(x => tot(x) > tot(last)).length, n: cohort.length }; }
    const ov = (window.LMS_ACH ? LMS_ACH.status().verify : {})[id], earned = rows.find(r => tot(r) >= K.VERIFY);
    const verified = ov === true || (ov !== false && !!earned);
    const orders = ls('lms_orders', []).filter(o => o.sid === id).map(o => {
      const c = ((C.store || {}).classes || []).find(x => x.id === o.classId) || { title: o.classId, month: '' };
      let k = o.status, left = null;
      if (o.status === 'approved') { const end = (o.approved || Date.now()) + ((c.validDays || 0) + (o.extra || 0)) * 864e5; left = Math.ceil((end - Date.now()) / 864e5); k = c.validDays && left <= 0 ? 'expired' : 'active'; }
      return { c, k, left, o };
    }).sort((a, b) => String(b.c.month).localeCompare(String(a.c.month)));
    return { ok: true, id, p, year, last, rank, verified, orders, att: { lastWeek: LMS_ATT.week(id, -1), thisWeek: LMS_ATT.week(id, 0), recent: LMS_ATT.recent(id, 5) } };
  }

  /* ---------- draw ---------- */
  const row = (k, v) => `<div class="scf"><small>${k}</small><b>${v ? esc(v) : '-'}</b></div>`;
  const CH = { active: ['ACTIVE', 'ok'], pending: ['PENDING', 'wait'], rejected: ['REJECTED', 'no'], expired: ['EXPIRED', 'no'], draft: ['NOT SUBMITTED', 'idle'] };
  function draw(d) {
    const box = $('#scRes');
    if (!d.ok) { box.innerHTML = ''; return err('No student with ID "' + d.id + '" was found on this device.'); }
    err(''); const { p, att } = d, lw = att.lastWeek, tw = att.thisWeek, today = K.ymd(new Date());
    const av = p.photo ? `<img src="${esc(p.photo)}" alt="">` : esc(((p.name || '?').trim()[0] || '?').toUpperCase());
    const mk = d.last ? K.tot(d.last) : null, weak = mk != null && mk < (C.weakBelow || 40);
    const markedToday = LMS_ATT.list(d.id).some(r => r.date === today);
    box.innerHTML = `
    <article class="c glass scc" style="--acc:linear-gradient(90deg,#7c3aed,#3b82f6)">
      <div class="scwho"><span class="scav">${av}</span>
        <div><b class="scn"><span class="nm">${esc(p.name || '')}</span>${d.verified ? K.tickAlways('') : ''}</b>
        <small>ID ${esc(d.id)}${p.institute ? ' · ' + esc(p.institute) : ''}</small></div></div>
      <div class="scgrid">${row('A/L year', p.year)}${row('Attempt', p.attempt)}${row('Phone', p.phone)}${row('WhatsApp', p.whatsapp)}${row('Telegram', p.telegram ? '@' + p.telegram : '')}${row('School', p.school)}</div>
    </article>

    <article class="c glass scatt ${lw.attended ? 'yes' : 'no'}">
      <div class="scah"><span class="scai"><i data-ic="${lw.attended ? 'check' : 'cross'}"></i></span>
        <div><small>LAST WEEK · ${dShort(lw.from)} to ${dShort(lw.to)}</small><b>${lw.attended ? 'Attended last week' : 'Did NOT attend last week'}</b>
        <span>${lw.attended ? lw.dates.map(dLong).join(', ') : 'No attendance recorded'}</span></div></div>
      <div class="scwk">${att.recent.map(w => `<span class="${w.attended ? 'y' : 'n'}${w.offset === 0 ? ' now' : ''}" title="${dShort(w.from)} to ${dShort(w.to)}"><i>${w.attended ? '✓' : '–'}</i><small>${w.offset === 0 ? 'This wk' : dShort(w.from)}</small></span>`).join('')}</div>
      <button class="gold scmark" id="scMark" type="button" data-id="${esc(d.id)}"${markedToday ? ' disabled' : ''}><i data-ic="check"></i><span>${markedToday ? 'Marked present today' : 'Mark present today'}</span></button>
      ${markedToday ? `<button class="link scundo" id="scUndo" type="button" data-id="${esc(d.id)}">Undo today</button>` : ''}
    </article>

    <article class="c glass scc" style="--acc:linear-gradient(90deg,#10b981,#14b8a6)">
      <div class="rowh"><h3><i data-ic="card"></i>Fees</h3></div>
      ${d.orders.length ? `<ul class="scfee">${d.orders.map(x => { const ch = CH[x.k] || CH.draft; const m = String(x.c.month).split('-');
        return `<li><span><b>${esc(x.c.title)}</b><small>${m[1] ? MN[+m[1] - 1] + ' ' + m[0] : ''}${x.k === 'active' && x.left != null ? ' · ' + x.left + ' days left' : ''}</small></span><em class="sch ${ch[1]}">${ch[0]}</em></li>`; }).join('')}</ul>` : '<p class="empty">No class payments from this student yet.</p>'}
    </article>

    <article class="c glass scc" style="--acc:linear-gradient(90deg,#f59e0b,#f97316)">
      <div class="rowh"><h3><i data-ic="analyze"></i>Latest paper</h3></div>
      ${d.last ? `<div class="scmk"><div><small>${esc(d.last.paper)}${d.last.date ? ' · ' + dShort(d.last.date) : ''}</small><b>${K.f1(mk)}<em>/100</em></b></div>
        <div class="scsp"><span>Pure <b>${d.last.pure}</b></span><span>Applied <b>${d.last.applied}</b></span>${d.rank ? `<span>Rank <b>${d.rank.r}</b>/${d.rank.n}</span>` : ''}</div>
        ${weak ? '<p class="scweak">Below the weak line. Talk to this student.</p>' : ''}</div>` : '<p class="empty">No paper marks yet.</p>'}
    </article>`;
    renderIcons(box);
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  const show = raw => { const d = lookup(raw); draw(d); return d.ok; };

  $('#scRes').addEventListener('click', e => {
    const m = e.target.closest('#scMark'), u = e.target.closest('#scUndo');
    if (m) { const r = LMS_ATT.mark(m.dataset.id); toast(r === 'marked' ? 'Attendance marked' : r); show(m.dataset.id); }
    if (u) { LMS_ATT.unmark(u.dataset.id, K.ymd(new Date())); toast('Removed'); show(u.dataset.id); }
  });
  $('#scForm').addEventListener('submit', e => { e.preventDefault(); const v = $('#scId').value.trim(); if (!v) return err('Type a Student ID first.'); show(v); });

  /* ---------- camera ---------- */
  let stream = null, raf = 0, det = null, busy = false;
  const vid = $('#scVid'), v = $('#scVideo');
  function stop() { cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; v.srcObject = null; vid.hidden = true; $('#scStart').disabled = false; }
  function loadJsQR() {
    return window.jsQR ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js'; s.onload = res; s.onerror = () => rej(new Error('scanner library')); document.head.appendChild(s); });
  }
  async function start() {
    err('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return err('Camera is not available here. The page must be opened over HTTPS. You can type the Student ID instead.');
    $('#scStart').disabled = true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
      if ('BarcodeDetector' in window) { try { det = new BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { det = null; } }
      if (!det) await loadJsQR();
    } catch (e) { stop(); return err(e && e.name === 'NotAllowedError' ? 'Camera permission was denied. Allow the camera, or type the Student ID.' : 'Could not start the camera. You can type the Student ID instead.'); }
    v.srcObject = stream; vid.hidden = false; try { await v.play(); } catch (e) {}
    const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
    let lastT = 0;
    const tick = async t => {
      raf = requestAnimationFrame(tick);
      if (busy || t - lastT < 140 || v.readyState < 2) return; lastT = t; busy = true;
      try {
        let txt = '';
        if (det) { const r = await det.detect(v); txt = r[0] ? r[0].rawValue : ''; }
        else { const w = v.videoWidth, h = v.videoHeight, s = Math.min(1, 640 / w); cv.width = w * s; cv.height = h * s; cx.drawImage(v, 0, 0, cv.width, cv.height); const q = window.jsQR(cx.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height); txt = q ? q.data : ''; }
        if (txt) { if (txt.toUpperCase().startsWith(PREFIX.toUpperCase())) { stop(); if (navigator.vibrate) navigator.vibrate(60); show(txt); } else { $('#scHint').textContent = 'That is not a student QR code'; } }
      } catch (e) {} busy = false;
    };
    raf = requestAnimationFrame(tick);
  }
  $('#scStart').onclick = start; $('#scStop').onclick = stop;
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });

  /* open a student directly: scan.html?id=26881376 */
  const q = new URLSearchParams(location.search).get('id'); if (q) { $('#scId').value = q; show(q); }
})();
