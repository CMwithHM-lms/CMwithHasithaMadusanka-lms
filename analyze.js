/* Mark Analyze: marks, all-island rank, Z-score, progress chart.
   Data = LMS_CONFIG.papers (this student, sample) + localStorage 'lms_marks' (admin entries for ALL students) + demo cohort.
   Rank and Z-score are recomputed from every registered student of the same A/L year, so they update the moment marks are added.
   Console helpers (LMS_MARKS.add / LMS_MARKS.weak) now live in core.js so they work on every page. */
(function () {
  const S = window.STU; if (!S) return;
  const C = window.LMS_CONFIG, $ = s => document.querySelector(s), sid = S.sid, yr = String(S.p.year || '2027');
  const ls = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const WEAK = C.weakBelow || 40, f1 = v => Math.round(v * 10) / 10, tot = r => (r.pure + r.applied) / 2;
  const key = r => r.sid + '|' + r.year + '|' + r.paper;

  /* ---------- data (shared with every page: core.js) ---------- */
  const load = () => LMS_CORE.load(yr, sid);
  let R = load();
  const mineList = () => R.filter(r => r.sid === sid && r.year === yr).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const cohort = p => R.filter(r => r.year === yr && r.paper === p);
  function stats(p, f) {
    const v = cohort(p).map(f), n = v.length, m = v.reduce((a, b) => a + b, 0) / (n || 1);
    return { n, m, sd: Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (n || 1)) };
  }
  const zOf = (x, st) => st.sd ? (x - st.m) / st.sd : 0;
  const erf = x => { const t = 1 / (1 + .3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const cdf = z => .5 * (1 + erf(z / Math.SQRT2));
  const rankOf = (p, f, me) => { const v = cohort(p).map(f); return { r: 1 + v.filter(x => x > me).length, n: v.length }; };
  const band = z => z >= 1 ? ['zb3', 'Excellent'] : z >= 0 ? ['zb2', 'Above average'] : z >= -1 ? ['zb1', 'Below average'] : ['zb0', 'Needs attention'];
  const sg = z => (z >= 0 ? '+' : '') + z.toFixed(2);

  let L = [];
  function compute() {
    R = load();
    L = mineList().map(r => {
      const t = tot(r), sT = stats(r.paper, tot), sP = stats(r.paper, x => x.pure), sA = stats(r.paper, x => x.applied);
      return Object.assign({}, r, { t, rk: rankOf(r.paper, tot, t), rp: rankOf(r.paper, x => x.pure, r.pure), ra: rankOf(r.paper, x => x.applied, r.applied),
        zT: zOf(t, sT), zP: zOf(r.pure, sP), zA: zOf(r.applied, sA), avg: sT.m });
    });
  }

  /* ---------- title ---------- */
  const T = 'Mark Analyze';
  $('#atitle').innerHTML = [...T].map((c, i) => c === ' ' ? '<span class="sp"></span>' : `<span class="lt${i > 4 ? ' g' : ''}" style="--i:${i}">${c}</span>`).join('');

  /* ---------- 1. KPIs + marks ---------- */
  function marks() {
    const rev = L.slice().reverse(), best = L.length ? Math.max(...L.map(x => x.t)) : 0;
    const br = L.length ? L.reduce((a, b) => a.rk.r / a.rk.n <= b.rk.r / b.rk.n ? a : b) : null;
    $('#akpi').innerHTML = `<div><b>${L.length}</b><small>Papers</small></div><div><b>${L.length ? f1(L.reduce((a, b) => a + b.t, 0) / L.length) : 0}</b><small>Average</small></div><div><b>${br ? '#' + br.rk.r : '-'}</b><small>Best rank</small></div>`;
    $('#marks').innerHTML = rev.length ? rev.map((r, i) => {
      const tg = [r.t === best ? ['', 'BEST'] : null, i === 0 ? ['', 'LATEST'] : null, r.t < WEAK ? ['wk', 'WEAK'] : null].filter(Boolean), m = /^(\d{4})\s+(.*)$/.exec(r.paper);
      return `<div class="amc${r.t === best ? ' best' : ''}"><div class="pn"><b>${esc(m ? m[2] : r.paper)}</b>${m ? `<small>A/L ${m[1]}</small>` : ''}</div>
      <div class="tgs">${tg.map(t => `<span class="atag ${t[0]}">${t[1]}</span>`).join('')}</div>
      <div class="ring" style="--p:${r.t};--c:${r.t < WEAK ? '#e11d48' : r.t >= 75 ? '#10b981' : '#7c3aed'}"><b>${f1(r.t)}</b></div>
      <div class="pa"><span>Pure</span><b>${r.pure}</b></div><div class="pa"><span>Applied</span><b>${r.applied}</b></div></div>`;
    }).join('')
      : '<p class="empty">No marks yet. They appear here once your teacher adds them.</p>';
  }

  /* ---------- 2. ranks ---------- */
  function ranks() {
    const all = $('#rkAll').checked, rev = L.slice().reverse(), show = all ? rev : rev.slice(0, 1);
    $('#rkNote').textContent = L.length ? (all ? 'All papers, newest first. Ranks among every student of A/L ' + yr + '.' : 'Latest paper. Turn on All papers to see older ranks.') : '';
    $('#ranks').innerHTML = show.length ? show.map(r => {
      const i = L.indexOf(r), prev = L[i - 1], pc = r.rk.r / r.rk.n * 100, pp = prev ? prev.rk.r / prev.rk.n * 100 : null;
      const d = pp == null ? '' : pc < pp - .5 ? '<span class="atr up">▲ Up</span>' : pc > pp + .5 ? '<span class="atr dn">▼ Down</span>' : '<span class="atr eq">— Same</span>';
      const m = /^(\d{4})\s+(.*)$/.exec(r.paper), tp = Math.max(1, Math.round(pc));
      return `<div class="ark${r.rk.r <= 3 ? ' m' + r.rk.r : ''}"><div class="arn">${r.rk.n < 5 ? '<b class="na">–</b>' : `<b>${r.rk.r}</b>`}<small>${r.rk.n < 5 ? 'soon' : 'of ' + r.rk.n}</small></div>
        <div class="arb"><div class="arh"><strong>${esc(m ? m[2] : r.paper)}</strong>${d}</div>
        <div class="bar2"><i data-w="${Math.min(100, 100 - pc + 100 / r.rk.n)}"></i></div>
        <div class="arm">${r.rk.n < 5 ? '<span>Rank appears when more students are marked</span>' : `<span class="mp">Top ${tp}%</span><span>Pure #${r.rp.r}</span><span>Applied #${r.ra.r}</span>`}</div></div></div>`;
    }).join('') : '<p class="empty">Your rank appears after your first paper is marked.</p>';
    requestAnimationFrame(() => document.querySelectorAll('.bar2 i').forEach(e => e.style.width = Math.min(100, e.dataset.w) + '%'));
  }
  $('#rkAll').onchange = ranks;

  /* ---------- 3. Z-score ---------- */
  let zi = -1;
  function zscore() {
    if (!L.length) { $('#zChips').innerHTML = ''; $('#zView').innerHTML = '<p class="empty">Z-score appears after your first paper is marked.</p>'; return; }
    if (zi < 0 || zi >= L.length) zi = L.length - 1;
    $('#zChips').innerHTML = L.map((r, i) => [r, i]).reverse().map(([r, i]) => `<button class="${i === zi ? 'on' : ''}" data-i="${i}">${esc(r.paper)}</button>`).join('');
    const r = L[zi], z = r.zT, [bc, bt] = band(z), Wd = 320, H = 150, x = v => 20 + (v + 3.5) / 7 * 280, y = v => 128 - Math.exp(-v * v / 2) * 100;
    let pts = [], area = [];
    for (let v = -3.5; v <= 3.5001; v += .1) pts.push((pts.length ? 'L' : 'M') + x(v).toFixed(1) + ' ' + y(v).toFixed(1));
    const zc = Math.max(-3.5, Math.min(3.5, z));
    for (let v = -3.5; v <= zc; v += .1) area.push((area.length ? 'L' : 'M') + x(v).toFixed(1) + ' ' + y(v).toFixed(1));
    area.push('L' + x(zc).toFixed(1) + ' 128L' + x(-3.5) + ' 128Z');
    const ticks = [-3, -2, -1, 0, 1, 2, 3].map(v => `<line class="gl" x1="${x(v)}" x2="${x(v)}" y1="128" y2="${v ? 132 : 28}"/><text class="ax" x="${x(v)}" y="145" text-anchor="middle">${v}</text>`).join('');
    $('#zView').innerHTML = `<div class="zbig"><div><span class="zv">${sg(z)}</span><small>Z-score · ${esc(r.paper)}</small></div><span class="zband ${bc}">${bt}</span></div>
      <svg class="bell" viewBox="0 0 ${Wd} ${H}"><defs><linearGradient id="bg" x1="0" x2="1"><stop offset="0" stop-color="#14b8a6" stop-opacity=".5"/><stop offset="1" stop-color="#7c3aed" stop-opacity=".55"/></linearGradient></defs>
      <line class="gl" x1="10" x2="310" y1="128" y2="128"/>${ticks}<path class="area" d="${area.join('')}"/><path class="crv" d="${pts.join('')}"/>
      <g class="me"><line x1="${x(zc)}" x2="${x(zc)}" y1="${y(zc) - 6}" y2="128" stroke="#c8963a" stroke-width="2" stroke-dasharray="3 3"/><circle cx="${x(zc)}" cy="${y(zc)}" r="6" fill="#f2c46d" stroke="#fff" stroke-width="2"/>
      <text x="${x(zc) > 160 ? x(zc) - 11 : x(zc) + 11}" y="${Math.max(12, y(zc) - 6)}" text-anchor="${x(zc) > 160 ? 'end' : 'start'}" font-size="11" font-weight="700" fill="#c8963a">You</text></g></svg>
      <div class="zrow"><div><b>${sg(r.zP)}</b><small>Pure Z</small></div><div><b>${sg(r.zA)}</b><small>Applied Z</small></div><div><b>${Math.round(cdf(z) * 100)}%</b><small>Students below you</small></div></div>
      <p class="note" style="margin-top:10px">Class average ${f1(r.avg)} · Your mark ${f1(r.t)} · ${r.rk.n} students.${r.zP < r.zA - .4 ? ' Pure Maths needs more focus.' : r.zA < r.zP - .4 ? ' Applied Maths needs more focus.' : ''}</p>`;
  }
  $('#zChips').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { zi = +b.dataset.i; zscore(); } });

  /* ---------- 4. progress chart ---------- */
  const SER = { Pure: ['#7c3aed', r => r.pure], Applied: ['#14b8a6', r => r.applied], Total: ['#c8963a', r => r.t] }, on = { Pure: 1, Applied: 1, Total: 1 };
  $('#chSer').innerHTML = Object.keys(SER).map(k => `<button class="on" data-k="${k}" style="--c:${SER[k][0]}">${k}</button>`).join('');
  $('#chSer').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const k = b.dataset.k; on[k] = on[k] ? 0 : 1; b.classList.toggle('on', !!on[k]); chart(); });
  $('#chAvg').onchange = chart;
  let drawn = 0, lastW = 0;
  function chart() {
    const box = $('#lineBox'), w = $('#cwrap'), n = L.length;
    if (!n) { box.innerHTML = '<p class="empty">Your progress chart appears after your first paper.</p>'; return; }
    const W = Math.max(w.clientWidth, n * 62 + 24), H = 230, B = 40, Tp = 12, ph = H - Tp - B, gx = i => n === 1 ? W / 2 : 22 + i * (W - 44) / (n - 1), gy = v => Tp + ph - Math.max(0, Math.min(100, v)) / 100 * ph;
    let g = '', ya = '';
    for (let v = 0; v <= 100; v += 20) { g += `<line class="grid" x1="0" x2="${W}" y1="${gy(v)}" y2="${gy(v)}"/>`; ya += `<text class="ax" x="24" y="${gy(v) + 3.5}" text-anchor="end">${v}</text>`; }
    $('#yax').innerHTML = `<svg width="30" height="${H}">${ya}</svg>`;
    g += `<line x1="0" x2="${W}" y1="${gy(WEAK)}" y2="${gy(WEAK)}" stroke="#e11d48" stroke-opacity=".4" stroke-dasharray="2 4"/>`;
    L.forEach((r, i) => g += `<text class="ax" x="${gx(i)}" y="${H - 18}" text-anchor="middle">${esc(r.paper.replace(/^.*?(\d+)\s*$/, 'P$1'))}</text>`);
    if ($('#chAvg').checked) g += `<path class="ln avg" d="${L.map((r, i) => (i ? 'L' : 'M') + gx(i) + ' ' + gy(r.avg)).join('')}"/>`;
    Object.keys(SER).filter(k => on[k]).forEach(k => {
      const [c, f] = SER[k], d = L.map((r, i) => (i ? 'L' : 'M') + gx(i).toFixed(1) + ' ' + gy(f(r)).toFixed(1)).join('');
      g += `<path class="ln" style="--l:2000${drawn ? ';animation:none;stroke-dashoffset:0' : ''}" pathLength="2000" d="${d}" stroke="${c}"/>` + L.map((r, i) => `<circle class="adot" cx="${gx(i)}" cy="${gy(f(r))}" r="5" fill="${c}" stroke="#fff" stroke-width="2" data-t="${k}: ${f1(f(r))} · ${esc(r.paper)}"/>`).join('');
    });
    box.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${g}</svg>`;
    w.scrollLeft = w.scrollWidth; drawn = 1; lastW = w.clientWidth;
  }
  $('#cwrap').addEventListener('pointerdown', e => {
    const t = e.target, tip = $('#ltip'); if (!t.dataset || !t.dataset.t) return;
    const r = t.getBoundingClientRect(), b = $('#cwrap').getBoundingClientRect();
    tip.textContent = t.dataset.t; tip.style.left = (r.left - b.left + $('#cwrap').scrollLeft + r.width / 2) + 'px'; tip.style.top = (r.top - b.top) + 'px';
    tip.hidden = false; clearTimeout(tip._t); tip._t = setTimeout(() => tip.hidden = true, 1800);
  });

  /* insights */
  function insights() {
    const o = [], n = L.length; if (n) {
      const a = L[n - 1], p = L[n - 2];
      if (p) { const d = a.t - p.t; o.push(['spark', d >= 0 ? `Your total went up ${f1(d)} marks since the last paper.` : `Your total dropped ${f1(-d)} marks since the last paper. Check the weaker part below.`]); }
      o.push(['analyze', a.pure >= a.applied ? `Applied (${a.applied}) is your weaker part in the latest paper. Practise more there.` : `Pure (${a.pure}) is your weaker part in the latest paper. Practise more there.`]);
      o.push(['achieve', a.t >= WEAK ? `You are ${f1(a.t - a.avg) >= 0 ? f1(a.t - a.avg) + ' above' : f1(a.avg - a.t) + ' below'} the class average.` : `Your total is below ${WEAK}. Ask your teacher for extra help.`]);
    }
    $('#insights').innerHTML = o.map(([i, t]) => `<div>${ic(i)}<span>${esc(t)}</span></div>`).join('');
  }

  function paint() { compute(); marks(); ranks(); zscore(); chart(); insights(); }
  window.addEventListener('storage', paint);
  window.addEventListener('lms-data', paint);
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if ($('#cwrap').clientWidth !== lastW) chart(); }, 200); });
  paint();
})();
