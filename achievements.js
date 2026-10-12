/* Achievements & Goals: my blue tick, all-island Top 3 (auto), my goals, verified students.
   All rules live in core.js. Everything here only draws and updates itself when marks change. */
(function () {
  const S = window.STU, K = window.LMS_CORE, C = window.LMS_CONFIG || {};
  if (!S || !K) return;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const { sid, p } = S, AT = K.VERIFY, f1 = K.f1;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HUES = [['#60a5fa', '#2563eb'], ['#a78bfa', '#6d28d9'], ['#f9a8d4', '#db2777'], ['#fdba74', '#ea580c'], ['#5eead4', '#0d9488'], ['#fcd34d', '#b7791f'], ['#7dd3fc', '#0369a1'], ['#fda4af', '#e11d48'], ['#86efac', '#15803d']];
  const hueOf = s => HUES[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];
  const ls = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const dfmt = d => { const t = new Date(d); return d && !isNaN(t) ? t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; };
  const safeImg = u => /^data:image\//i.test(u || '') || /^https:\/\//i.test(u || '') ? u : '';

  const st = { year: String(p.year || '2027'), paper: null, q: '', mineYear: false, shown: 8 };
  $('#gAt').textContent = AT; $$('.gat').forEach(e => e.textContent = AT); $('#gTarget').textContent = AT;

  /* avatar: photo, or the first letter on a soft colour */
  function av(w) {
    const ph = safeImg(w.photo), h = hueOf(w.sid || w.name);
    return ph ? `<img src="${esc(ph)}" alt="">` : `<span class="gi" style="--a:${h[0]};--b:${h[1]}">${esc(((w.name || '?').trim()[0] || '?').toUpperCase())}</span>`;
  }

  /* ---------- hero + my blue tick ---------- */
  function mineAll() {
    const L = K.mine(sid, String(p.year || '2027')), best = L.length ? Math.max(...L.map(x => x.t)) : 0;
    const br = L.length ? L.reduce((a, b) => a.rk.r / a.rk.n <= b.rk.r / b.rk.n ? a : b) : null;
    return { L, best, br, n: L.length };
  }
  function hero(m, V) {
    $('#gkpi').innerHTML = `<div><b>${V.length}</b><small>Verified</small></div><div><b>${m.n ? f1(m.best) : '-'}</b><small>My best</small></div><div><b>${m.br && m.br.rk.r ? '#' + m.br.rk.r : '-'}</b><small>Best rank</small></div>`;
  }
  let prevOk = null;
  function mineCard(m, V) {
    const mv = V.find(v => v.sid === sid), ok = !!mv, pc = ok ? 100 : Math.max(0, Math.min(100, m.best / AT * 100)), left = Math.max(0, Math.ceil((AT - m.best) * 10) / 10);
    $('#gmine').dataset.ok = ok ? '1' : '0';
    $('#gring').style.setProperty('--p', pc);
    $('#gav').innerHTML = av(Object.assign({ sid }, p));
    $('#gbadge').innerHTML = ok ? K.tickAlways('big') : `<span class="glock">${ic('lock')}</span>`;
    if (ok && prevOk === false && $('#gbadge').firstChild) $('#gbadge').firstChild.classList.add('stamp');
    prevOk = ok;
    $('#gname').innerHTML = K.nameInline(p.name || '', sid);
    $('#gState').className = 'gchip ' + (ok ? 'blue' : 'soft');
    $('#gState').innerHTML = ok ? ic('check') + 'VERIFIED' : (m.n ? left + ' TO GO' : 'NO PAPERS YET');
    $('#gline').textContent = ok ? (mv.manual ? 'Verified by your teacher.' : 'Verified' + (mv.date ? ' on ' + dfmt(mv.date) : '') + (mv.paper ? ' · ' + mv.paper : '')) :
      m.n ? `Your best is ${f1(m.best)}. Score ${left} more marks in a paper to earn your blue tick.` : 'Your first paper will start your progress.';
    $('#gfill').style.width = pc + '%';
    $('#gmk').style.left = Math.min(100, pc) + '%';
    $('#gmk').hidden = pc <= 0;
  }

  /* ---------- all-island top 3 ---------- */
  const MET = { 1: 'Gold', 2: 'Silver', 3: 'Bronze' };
  function top() {
    const years = K.years(), box = $('#gYears');
    box.hidden = years.length < 2;
    box.innerHTML = years.map(y => `<button class="${y === st.year ? 'on' : ''}" data-y="${esc(y)}">A/L ${esc(y)}</button>`).join('');
    const T = K.top3(st.year, st.paper), pb = $('#gPapers');
    pb.hidden = T.papers.length < 2;
    pb.innerHTML = T.papers.slice(0, 12).map(x => `<button class="${x.name === T.paper ? 'on' : ''}" data-p="${esc(x.name)}">${esc(x.name.replace(/^\d{4}\s+/, ''))}${x.name === T.latest ? '<em>LATEST</em>' : ''}</button>`).join('');
    $('#gMode').className = 'gchip ' + (T.manual ? 'gold' : 'soft');
    $('#gMode').innerHTML = T.manual ? ic('star') + 'SET BY TEACHER' : ic('spark') + 'AUTO';
    if (!T.papers.length) {
      $('#gpod').innerHTML = `<div class="gempty"><div class="eic">${ICON.crown}</div><b>Top 3 appears after the first paper</b><span>The best three students on the island are shown here automatically.</span></div>`;
      $('#gTopNote').textContent = ''; return;
    }
    const order = [1, 0, 2];
    $('#gpod').innerHTML = order.map((i, k) => {
      const e = T.list[i], r = i + 1, you = e && e.sid === sid;
      const body = e ? `<div class="gpa"><span class="gpr"></span><span class="gpv">${av(e.who)}</span><span class="gpm">${ic('medal')}</span>${r === 1 ? `<span class="gcrown">${ICON.crown}</span>` : ''}</div>
        <b class="gpn">${K.nameInline(e.who.name, e.sid, true)}</b>
        <small class="gpi">${esc((e.who.institute || '').replace(/^.*-\s*/, '') || 'A/L ' + (e.who.year || T.year))}</small>
        <span class="gps">${e.total == null ? '-' : `<i data-n="${e.total}">0</i>`}</span>${you ? '<span class="gyou">YOU</span>' : ''}`
        : `<div class="gpa"><span class="gpv none">?</span></div><b class="gpn dim">Waiting</b><small class="gpi">Not marked yet</small><span class="gps dim">-</span>`;
      return `<div class="gpd r${r}${e ? '' : ' none'}${you ? ' me' : ''}" style="--d:${k * 140}ms" aria-label="${MET[r]}">${body}<div class="gpb"><b>${r}</b><small>${MET[r].toUpperCase()}</small></div></div>`;
    }).join('');
    $$('#gpod [data-n]').forEach(el => {
      const v = +el.dataset.n, t0 = performance.now(); if (reduce) { el.textContent = f1(v); return; }
      (function stp(t) { const k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3); el.textContent = f1(v * e); if (k < 1) requestAnimationFrame(stp); })(t0);
    });
    $('#gTopNote').textContent = (T.manual ? 'Chosen by your teacher. ' : '') + T.n + (T.n === 1 ? ' student' : ' students') + ' marked in ' + T.paper + '. Ranked by total (Pure + Applied) ÷ 2. Updates by itself after every paper.';
  }
  $('#gYears').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { st.year = b.dataset.y; st.paper = null; top(); } });
  $('#gPapers').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { st.paper = b.dataset.p; top(); } });

  /* ---------- goals ---------- */
  const DEF = [
    { id: 'tick', icon: 'verified', title: 'Earn the blue tick', note: 'Score ' + AT + ' or more in a paper', metric: 'best', target: AT },
    { id: 'rise', icon: 'bolt', title: 'Beat your last paper', note: 'Get a higher total than your previous paper', metric: 'improve' },
    { id: 'top10', icon: 'crown', title: 'Reach the top 10%', note: 'Finish in the top 10% of the island in a paper', metric: 'toppct', target: 10 },
    { id: 'five', icon: 'target', title: 'Complete 5 papers', note: 'Attempt five papers', metric: 'papers', target: 5 }
  ];
  function goals(m) {
    const G = (C.goals && C.goals.length ? C.goals : DEF).map(g => Object.assign({}, g, { st: K.goal(g, m.L) }));
    const done = G.filter(g => g.st.done).length;
    $('#gDone').textContent = done + ' of ' + G.length + ' done';
    $('#goals').innerHTML = G.map((g, i) => `<div class="gg${g.st.done ? ' done' : ''}" style="--d:${i * 80}ms">
      <span class="gic">${g.st.done ? ic('check') : ic(g.icon || 'target')}</span>
      <div class="gb"><div class="gh"><b>${esc(g.title)}</b><em>${esc(g.st.text)}</em></div>
        <small>${esc(g.note || '')}</small>
        <div class="gbar sm"><i style="width:${g.st.pct}%"></i></div></div>
      ${g.st.done ? '<span class="gdn">DONE</span>' : ''}</div>`).join('');
  }

  /* ---------- verified students ---------- */
  function verifiedList(V) {
    const q = st.q.trim().toLowerCase(), myYr = String(p.year || '');
    let L = V.filter(v => (!q || v.who.name.toLowerCase().includes(q)) && (!st.mineYear || String(v.who.year) === myYr));
    $('#gCount').textContent = V.length + (V.length === 1 ? ' student' : ' students');
    const show = L.slice(0, st.shown);
    $('#gvlist').innerHTML = show.length ? show.map((v, i) => `<div class="gvr${v.sid === sid ? ' me' : ''}" style="--d:${Math.min(i, 12) * 40}ms">
        <span class="gva">${av(v.who)}</span>
        <span class="gvn"><b>${K.nameHtml(v.who.name, v.sid)}</b><small>${esc(v.who.year ? 'A/L ' + v.who.year : '')}${v.who.year && v.who.institute ? ' · ' : ''}${esc(v.who.institute || '')}</small></span>
        <span class="gvd">${v.sid === sid ? '<em>YOU</em>' : ''}<small>${esc(dfmt(v.date))}</small></span></div>`).join('')
      : `<div class="gempty sm"><div class="eic">${ICON.verified}</div><b>${V.length ? 'No match' : 'No verified students yet'}</b><span>${V.length ? 'Try a different name.' : 'Score ' + AT + ' or more in a paper to be the first.'}</span></div>`;
    $('#gmore').hidden = L.length <= st.shown;
    $('#gmore').textContent = 'Show more (' + (L.length - st.shown) + ' left)';
  }
  $('#gq').addEventListener('input', e => { st.q = e.target.value; st.shown = 8; paintVer(); });
  $('#gYr').addEventListener('change', e => { st.mineYear = e.target.checked; st.shown = 8; paintVer(); });
  $('#gmore').onclick = () => { st.shown += 10; paintVer(); };
  const paintVer = () => verifiedList(K.snap().V);

  /* ---------- celebration (first time only) ---------- */
  function confetti() {
    if (reduce) return;
    const cv = $('#gfx'), x = cv.getContext('2d'), W = cv.width = innerWidth, H = cv.height = innerHeight, col = ['#2d8cff', '#6fd0ff', '#f2c46d', '#c8963a', '#7c3aed', '#14b8a6', '#fb7185'];
    const P = Array.from({ length: 140 }, () => ({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .35, vx: (Math.random() - .5) * 11, vy: -Math.random() * 13 - 3, s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: col[Math.random() * col.length | 0] }));
    cv.style.display = 'block'; let t0 = performance.now();
    (function frame(t) {
      x.clearRect(0, 0, W, H);
      P.forEach(q => { q.vy += .28; q.vx *= .992; q.x += q.vx; q.y += q.vy; q.r += q.vr; x.save(); x.translate(q.x, q.y); x.rotate(q.r); x.fillStyle = q.c; x.fillRect(-q.s / 2, -q.s / 3, q.s, q.s * .6); x.restore(); });
      if (t - t0 < 3200) requestAnimationFrame(frame); else { x.clearRect(0, 0, W, H); cv.style.display = 'none'; }
    })(t0);
  }
  function celebrate(m, V) {
    const seen = ls('lms_seen', {}), msgs = [];
    if (V.some(v => v.sid === sid) && !seen[sid + ':tick']) { seen[sid + ':tick'] = 1; msgs.push('You earned your blue tick!'); }
    const T = K.top3(String(p.year || '2027')), me = T.list.find(e => e.sid === sid);
    if (me && T.paper && !seen[sid + ':top3:' + T.paper]) { seen[sid + ':top3:' + T.paper] = 1; msgs.push('You are in the island top 3: #' + me.rank); }
    if (!msgs.length) return;
    lsSet('lms_seen', seen); confetti(); setTimeout(() => window.toast && toast(msgs[0]), 400);
  }

  /* ---------- title letters (whole words never break in the middle) ---------- */
  (function () {
    const h = $('#gtitle'); if (reduce) return;
    let n = 0;
    h.innerHTML = ['Achievements', '&', 'Goals'].map((w, wi) => `<span class="gw">${[...w].map(c => `<span class="glt${wi === 2 ? ' g' : ''}" style="--i:${n++}">${esc(c)}</span>`).join('')}</span>`).join('');
  })();

  /* ---------- paint ---------- */
  let first = true;
  function paint() {
    const s = K.fresh(), m = mineAll();
    hero(m, s.V); mineCard(m, s.V); top(); goals(m); verifiedList(s.V);
    if (first) { first = false; setTimeout(() => celebrate(m, s.V), 900); }
  }
  window.addEventListener('lms-data', paint);
  window.addEventListener('storage', paint);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) paint(); });
  paint();
})();
