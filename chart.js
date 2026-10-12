/* Paper Mark Analyze: stats, chart, notices */
(function () {
  const C = window.LMS_CONFIG, box = document.getElementById('chartSvg'), tip = document.getElementById('tip'), wrap = box.parentElement;
  const f1 = v => Math.round(v * 10) / 10, tot = r => (r.pure + r.applied) / 2;
  /* same marks as the Mark Analyze page (sample + anything the teacher adds), newest last */
  const loadP = () => window.LMS_CORE && window.STU ? LMS_CORE.mine(STU.sid).map(r => ({ no: r.paper, pure: r.pure, applied: r.applied })) : (C.papers || []);
  let P = loadP();

  /* stats with count-up */
  function stats(anim) {
    const T = P.map(tot), S = { n: P.length, avg: T.length ? T.reduce((a, b) => a + b, 0) / T.length : 0, best: T.length ? Math.max(...T) : 0 };
    document.querySelectorAll('[data-n]').forEach(el => {
      const v = S[el.dataset.n], dec = el.dataset.n === 'n' ? 0 : 1, t0 = performance.now();
      if (!anim) { el.textContent = v.toFixed(dec); return; }
      (function step(t) {
        const k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3);
        el.textContent = (v * e).toFixed(dec);
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
  }
  stats(true);

  function draw() {
    if (!P.length) { box.innerHTML = '<p class="empty">No marks yet</p>'; return; }
    const W = Math.max(wrap.clientWidth, P.length * 96 + 40), H = wrap.clientWidth > 640 ? 300 : 236, T0 = 14, B = 46, L = 30, R = 8;
    const ph = H - T0 - B, gw = (W - L - R) / P.length, bw = Math.min(wrap.clientWidth > 640 ? 26 : 16, (gw - 18) / 3);
    const y = v => T0 + ph - (Math.min(100, Math.max(0, v)) / 100) * ph;
    let g = '';
    for (let v = 0; v <= 100; v += 20) g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 6}" y="${y(v) + 3.5}" text-anchor="end">${v}</text>`;
    P.forEach((r, i) => {
      const cx = L + gw * i + gw / 2;
      [['Pure', r.pure], ['Applied', r.applied], ['Total', tot(r)]].forEach(([n, v], k) => {
        const h = Math.max(0, Math.min(100, v) / 100 * ph), x = cx + (k - 1) * (bw + 3) - bw / 2;
        g += `<rect class="bar k${k + 1}" data-tip="${n}: ${f1(v)} / 100" x="${x}" y="${T0 + ph - h}" width="${bw}" height="${h}" rx="4" style="animation-delay:${i * 90 + k * 70}ms"/>`;
      });
      g += `<text class="lab" x="${cx}" y="${H - 16}" text-anchor="middle">${esc(r.no)}</text>`;
    });
    box.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${g}</svg>`;
  }
  box.addEventListener('pointerdown', e => {
    const t = e.target;
    if (!t.dataset || !t.dataset.tip) return;
    const r = t.getBoundingClientRect(), b = wrap.getBoundingClientRect();
    tip.textContent = t.dataset.tip;
    tip.style.left = (r.left - b.left + r.width / 2) + 'px';
    tip.style.top = (r.top - b.top) + 'px';
    tip.hidden = false; clearTimeout(tip._t); tip._t = setTimeout(() => { tip.hidden = true; }, 1500);
  });
  draw();
  const again = () => { P = loadP(); stats(false); draw(); };
  window.addEventListener('lms-data', again); window.addEventListener('storage', again);
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(draw, 200); });

  /* notices */
  const nb = document.getElementById('notices');
  const getN = () => { try { const v = JSON.parse(localStorage.getItem('lms_notices')); if (v && Array.isArray(v.list)) return v.list; } catch (e) {} return C.notices || []; };
  const drawN = () => {
    const N = getN();
    nb.innerHTML = N.length
      ? `<div class="nrail" role="list" tabindex="0" aria-label="Notices. Swipe sideways">${N.map(n => { const l = /^https?:\/\//i.test(n.link || '') ? n.link : '', t = l ? 'a' : 'div'; return `<${t} class="ncard" role="listitem"${l ? ` href="${esc(l)}" target="_blank" rel="noopener"` : ''}><span class="nico">${ic('bell')}</span><b>${esc(n.title)}</b>${n.body ? `<span class="nbd">${esc(n.body)}</span>` : ''}<small>${esc(n.date || '')}</small></${t}>`; }).join('')}</div>${N.length > 1 ? '<p class="nhint">Swipe sideways for more</p>' : ''}`
      : '<p class="empty">No notices yet</p>';
  };
  drawN(); window.addEventListener('lms-data', drawN); window.addEventListener('storage', drawN);
})();
