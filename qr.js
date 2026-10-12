/* Small offline QR code generator (byte mode, error correction M, versions 1-10) */
(function () {
  const ECC = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26], BLK = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
  const raw = v => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; };
  const dcw = v => Math.floor(raw(v) / 8) - ECC[v] * BLK[v];
  const gmul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z; };
  function rsDiv(d) { const r = new Array(d - 1).fill(0); r.push(1); let root = 1; for (let i = 0; i < d; i++) { for (let j = 0; j < r.length; j++) { r[j] = gmul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; } root = gmul(root, 2); } return r; }
  function rsRem(data, div) { const r = div.map(() => 0); for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= gmul(c, f); }); } return r; }
  function align(v) { if (v === 1) return []; const n = Math.floor(v / 7) + 2, step = Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2, r = [6]; for (let p = v * 4 + 10; r.length < n; p -= step) r.splice(1, 0, p); return r; }
  const MASK = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0,
    (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0];

  function make(text) {
    const bytes = [...new TextEncoder().encode(text)];
    let v = 1; while (v <= 10 && 4 + (v >= 10 ? 16 : 8) + bytes.length * 8 > dcw(v) * 8) v++;
    if (v > 10) return null;
    const bits = [], put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4); put(bytes.length, v >= 10 ? 16 : 8); bytes.forEach(b => put(b, 8));
    const cap = dcw(v) * 8; put(0, Math.min(4, cap - bits.length)); while (bits.length % 8) bits.push(0);
    for (let pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
    const data = []; for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; data.push(b); }

    const nb = BLK[v], el = ECC[v], rawCw = Math.floor(raw(v) / 8), ns = nb - rawCw % nb, sl = Math.floor(rawCw / nb), div = rsDiv(el), blocks = [];
    for (let i = 0, k = 0; i < nb; i++) { const d = data.slice(k, k + sl - el + (i < ns ? 0 : 1)); k += d.length; const e = rsRem(d, div); if (i < ns) d.push(0); blocks.push(d.concat(e)); }
    const cw = []; for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== sl - el || j >= ns) cw.push(b[i]); });

    const n = v * 4 + 17, M = [], F = [];
    for (let i = 0; i < n; i++) { M.push(new Array(n).fill(false)); F.push(new Array(n).fill(false)); }
    const setF = (x, y, d) => { M[y][x] = d; F[y][x] = true; };
    for (let i = 0; i < n; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
    const finder = (x, y) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy; if (xx >= 0 && xx < n && yy >= 0 && yy < n) setF(xx, yy, d !== 2 && d !== 4); } };
    finder(3, 3); finder(n - 4, 3); finder(3, n - 4);
    const ap = align(v), na = ap.length;
    for (let i = 0; i < na; i++) for (let j = 0; j < na; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setF(ap[i] + dx, ap[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    const fmt = mask => {
      let r = mask; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((mask << 10) | r) ^ 0x5412, g = i => ((b >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) setF(8, i, g(i)); setF(8, 7, g(6)); setF(8, 8, g(7)); setF(7, 8, g(8)); for (let i = 9; i < 15; i++) setF(14 - i, 8, g(i));
      for (let i = 0; i < 8; i++) setF(n - 1 - i, 8, g(i)); for (let i = 8; i < 15; i++) setF(8, n - 15 + i, g(i)); setF(8, n - 8, true);
    };
    fmt(0);
    if (v >= 7) { let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25); const b = (v << 12) | r; for (let i = 0; i < 18; i++) { const c = ((b >>> i) & 1) === 1, a = n - 11 + i % 3, bb = Math.floor(i / 3); setF(a, bb, c); setF(bb, a, c); } }
    let k = 0;
    for (let right = n - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < n; vert++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? n - 1 - vert : vert;
        if (!F[y][x] && k < cw.length * 8) { M[y][x] = ((cw[k >>> 3] >>> (7 - (k & 7))) & 1) === 1; k++; }
      }
    }
    const apply = m => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!F[y][x] && MASK[m](x, y)) M[y][x] = !M[y][x]; };
    function pen() {
      let r = 0, dark = 0; const lines = [];
      for (let y = 0; y < n; y++) { let run = 1, s = ''; for (let x = 0; x < n; x++) { const c = M[y][x]; if (c) dark++; s += c ? '1' : '0'; if (x > 0 && c === M[y][x - 1]) { run++; if (run === 5) r += 3; else if (run > 5) r++; } else run = 1; } lines.push(s); }
      for (let x = 0; x < n; x++) { let run = 1, s = ''; for (let y = 0; y < n; y++) { const c = M[y][x]; s += c ? '1' : '0'; if (y > 0 && c === M[y - 1][x]) { run++; if (run === 5) r += 3; else if (run > 5) r++; } else run = 1; } lines.push(s); }
      for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = M[y][x]; if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) r += 3; }
      lines.forEach(s => { for (let i = 0; i + 11 <= s.length; i++) { const t = s.substr(i, 11); if (t === '00001011101' || t === '10111010000') r += 40; } });
      const tot = n * n, kk = Math.ceil(Math.abs(dark * 20 - tot * 10) / tot) - 1; return r + Math.max(0, kk) * 10;
    }
    let best = 0, bp = 1e9;
    for (let m = 0; m < 8; m++) { apply(m); fmt(m); const p = pen(); if (p < bp) { bp = p; best = m; } apply(m); }
    apply(best); fmt(best);
    return { n, M };
  }

  window.QR = {
    make,
    svg(text, o) {
      o = o || {}; const q = make(text); if (!q) return '';
      const Q = o.quiet == null ? 4 : o.quiet, N = q.n + Q * 2; let d = '';
      for (let y = 0; y < q.n; y++) for (let x = 0; x < q.n; x++) if (q.M[y][x]) d += `M${x + Q} ${y + Q}h1v1h-1z`;
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges"><rect width="${N}" height="${N}" fill="#fff"/><path d="${d}" fill="${o.dark || '#0d0824'}"/></svg>`;
    },
    draw(ctx, text, x0, y0, size, quiet) {
      const q = make(text); if (!q) return; const Q = quiet == null ? 4 : quiet, cell = size / (q.n + Q * 2);
      ctx.fillStyle = '#fff'; ctx.fillRect(x0, y0, size, size); ctx.fillStyle = '#0d0824';
      for (let y = 0; y < q.n; y++) for (let x = 0; x < q.n; x++) if (q.M[y][x]) ctx.fillRect(Math.round(x0 + (x + Q) * cell), Math.round(y0 + (y + Q) * cell), Math.ceil(cell), Math.ceil(cell));
    }
  };
})();
