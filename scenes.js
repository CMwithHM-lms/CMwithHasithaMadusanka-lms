/* Greeting scenes: layered, animated skies (SVG; animations live in cards.css) */
(function () {
  const E = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
  const cloud = (y, s, d, off, c, o) => `<g transform="translate(0 ${y})" opacity="${o}"><g class="cl" style="animation-duration:${d}s;animation-delay:-${off}s" fill="${c}">${E(0,0,30*s,9*s)}${E(-16*s,-6*s,16*s,10*s)}${E(6*s,-11*s,18*s,12*s)}${E(24*s,-4*s,14*s,8*s)}</g></g>`;
  const bird = (y, d, off, c) => `<g transform="translate(0 ${y})"><g class="fly" style="animation-duration:${d}s;animation-delay:-${off}s"><path class="flap" d="M0 0q3-4.5 6 0q3-4.5 6 0" fill="none" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/></g></g>`;
  const hills = (a, b) => `<path d="M0 116C50 94 105 98 165 112S292 90 400 106V150H0z" fill="${a}"/><path d="M0 134C70 117 132 126 202 134S332 119 400 130V150H0z" fill="${b}"/>`;
  const stars = l => l.map(([x, y, r, d]) => `<circle class="tw" cx="${x}" cy="${y}" r="${r}" fill="#fff" style="animation-delay:${d}s"/>`).join('');
  const sky = st => `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${st.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  const glow = (id, c, o) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${o}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  const orb = (a, b) => `<radialGradient id="sc"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;
  const rays = (x, y, n, len, c) => {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = i * Math.PI * 2 / n;
      s += `<line x1="${(x + Math.cos(a) * 26).toFixed(1)}" y1="${(y + Math.sin(a) * 26).toFixed(1)}" x2="${(x + Math.cos(a) * len).toFixed(1)}" y2="${(y + Math.sin(a) * len).toFixed(1)}"/>`;
    }
    return `<g class="rays" stroke="${c}" stroke-width="2.2" stroke-linecap="round" opacity=".28">${s}</g>`;
  };
  const sun = (x, y, r, rc, len, cls) => `<circle class="glow" cx="${x}" cy="${y}" r="${r * 4.4}" fill="url(#sg)"/>${rays(x, y, 14, len, rc)}<circle class="${cls || 'sun'}" cx="${x}" cy="${y}" r="${r}" fill="url(#sc)"/>`;
  const moonDefs = (cx, cy, r, col) => `<mask id="mk"><rect width="400" height="150" fill="#fff"/><circle cx="${cx + r * .5}" cy="${cy - r * .25}" r="${r * .88}" fill="#000"/></mask>${glow('mg', col, .55)}`;
  const moon = (cx, cy, r, col) => `<circle class="halo" cx="${cx}" cy="${cy}" r="${r * 3.4}" fill="url(#mg)"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}" mask="url(#mk)"/>`;
  const shoot = (x, y, d) => `<g transform="translate(${x} ${y})"><g class="shoot" style="animation-delay:${d}s"><path d="M0 0L28-10" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></g></g>`;
  const flies = l => l.map(([x, y, dx, dy, d]) => `<circle class="ff" cx="${x}" cy="${y}" r="1.6" fill="#fde68a" style="--x:${dx}px;--y:${dy}px;animation-delay:${d}s"/>`).join('');
  const wrap = (defs, inner) => `<svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs><rect width="400" height="150" fill="url(#sky)"/>${inner}</svg>`;

  window.SCENE = {
    morning: wrap(sky([[0, '#2f6fe0'], [.55, '#7cc2ff'], [.92, '#ffe0a6'], [1, '#ffecc2']]) + glow('sg', '#fff1b0', .9) + orb('#fffbe6', '#ffd04a'),
      sun(312, 94, 17, '#fff3b0', 38) + cloud(34, 1.1, 80, 18, '#fff', .92) + cloud(66, .8, 110, 60, '#fff', .75) + cloud(20, .6, 140, 95, '#fff', .6) +
      bird(48, 26, 6, '#1e293b') + bird(58, 32, 15, '#1e293b') + bird(40, 38, 21, '#1e293b') + hills('#78d5a0', '#2e9e6c')),
    afternoon: wrap(sky([[0, '#1779d9'], [.65, '#4fb0f2'], [1, '#b6e3ff']]) + glow('sg', '#ffffff', .85) + orb('#ffffff', '#ffe27a'),
      sun(318, 36, 16, '#ffffff', 44) + cloud(52, 1.35, 90, 10, '#fff', .95) + cloud(30, 1, 120, 70, '#fff', .85) + cloud(78, .9, 150, 110, '#fff', .8) +
      bird(62, 24, 4, '#0f3a66') + bird(72, 30, 14, '#0f3a66') + hills('#59d98e', '#17a35a')),
    evening: wrap(sky([[0, '#2b2a86'], [.35, '#9b4fa8'], [.62, '#f4627f'], [.85, '#fba35a'], [1, '#ffd98a']]) + glow('sg', '#ffb870', .9) + orb('#fff0b8', '#ff8a3d'),
      sun(292, 104, 22, '#ffd08a', 46, 'sunset') + cloud(40, 1.2, 100, 25, '#ffb7a0', .8) + cloud(66, .9, 130, 70, '#f9a8d4', .7) + cloud(26, .7, 150, 110, '#fcd3a5', .6) +
      bird(52, 24, 5, '#3a1b47') + bird(60, 30, 13, '#3a1b47') + bird(46, 36, 20, '#3a1b47') + hills('#6a2d78', '#2e1648')),
    night: wrap(sky([[0, '#040615'], [.6, '#0e1a48'], [1, '#202c70']]) + moonDefs(318, 38, 14, '#fff4cc'),
      stars([[24, 20, 1.3, 0], [60, 42, 1, .7], [96, 16, 1.5, 1.4], [140, 36, 1, .3], [182, 12, 1.2, 1.1], [220, 30, 1, 1.9], [262, 18, 1.4, .5], [366, 70, 1, 1.3], [40, 74, 1, 1.7], [120, 66, 1.1, .9], [200, 58, 1, .2], [250, 70, 1.2, 1.6], [350, 14, 1, .8], [286, 52, 1, 2.1]]) +
      moon(318, 38, 14, '#fff4cc') + shoot(250, 22, 2) + cloud(56, 1.1, 160, 40, '#27336e', .5) + cloud(26, .8, 200, 130, '#27336e', .4) +
      hills('#0a1030', '#050818') + flies([[60, 126, 10, -10, 0], [130, 134, -9, -8, 1.2], [210, 128, 8, -12, .6], [300, 132, -10, -7, 1.8], [350, 124, 9, -9, .3]])),
    early: wrap(sky([[0, '#02030e'], [.5, '#17174a'], [.8, '#5b3a9c'], [1, '#f08aa0']]) + moonDefs(86, 38, 12, '#e5ebf5') + glow('dg', '#ffb199', .75),
      stars([[30, 18, 1.2, 0], [150, 24, 1, .8], [190, 50, 1, 1.5], [300, 20, 1.3, .4], [360, 46, 1, 1.1], [50, 70, 1, 1.9]]) +
      moon(86, 38, 12, '#e5ebf5') + '<circle class="tw" cx="248" cy="46" r="2.3" fill="#fff"/><path class="tw" d="M248 38v16M240 46h16" stroke="#fff" stroke-width=".7"/>' +
      '<ellipse class="dawn" cx="320" cy="148" rx="160" ry="44" fill="url(#dg)"/>' + cloud(76, 1.3, 180, 30, '#8a7fc9', .3) + hills('#171445', '#0b0928'))
  };
})();
