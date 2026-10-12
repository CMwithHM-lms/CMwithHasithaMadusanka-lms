/* panel.js: shared frame for admin.html and owner.html (theme, logo, tabs, small helpers). */
(function () {
  const S = window.LMS_STAFF, K = window.LMS_CORE, C = window.LMS_CONFIG, root = document.documentElement;
  const $ = s => document.querySelector(s), esc = S.esc, M = S.me();
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400); };
  const setTheme = t => { root.dataset.theme = t; try { localStorage.setItem('lms_theme', t); } catch (e) {} $('#theme').innerHTML = `<i class="ico">${ICON[t === 'dark' ? 'sun' : 'moon']}</i>`; };
  const card = (h, body, cls) => `<div class="c glass ${cls || ''}">${h ? `<h3>${h}</h3>` : ''}${body}</div>`;
  const val = id => { const e = $('#' + id); return e ? String(e.value || '').trim() : ''; };
  const ok = r => ['saved', 'added', 'removed', 'ok', 'approved', 'rejected', 'replied', 'updated'].includes(r) || /^(extended|\d+ saved)/.test(r);
  const ymd = d => K.ymd(d || new Date());
  const ls = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const photo = f => new Promise((res, rej) => { const r = new FileReader(); r.onerror = rej; r.onload = () => { const i = new Image(); i.onerror = rej; i.onload = () => { const s = Math.min(1, 900 / Math.max(i.width, i.height)), c = document.createElement('canvas'); c.width = i.width * s; c.height = i.height * s; c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .8)); }; i.src = r.result; }; r.readAsDataURL(f); });
  const fmtD = t => t ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const fmtT = t => t ? new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

  /* init(title, tabs, views): tabs = [[key, label, allowed, badgeFn?]] ; views[key]() draws into #view */
  function init(title, tabs, V) {
    setTheme((() => { try { return localStorage.getItem('lms_theme') || 'light'; } catch (e) { return 'light'; } })());
    $('#theme').onclick = () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
    { const im = new Image(); im.alt = ''; im.onload = () => $('#logo').replaceChildren(im); im.src = (C.brand || {}).logo || ''; }
    $('#ttl').textContent = title; $('#who').textContent = M.owner ? 'Owner' : M.admin ? 'Admin' : 'Paper Analyze';
    const list = tabs.filter(t => t[2]); let cur = '';
    const nav = () => { $('#tabs').innerHTML = list.map(t => { const n = t[3] ? t[3]() : 0; return `<button data-k="${t[0]}" class="${t[0] === cur ? 'on' : ''}">${t[1]}${n ? `<i class="bd">${n > 99 ? '99+' : n}</i>` : ''}</button>`; }).join(''); };
    const go = k => {
      cur = list.some(t => t[0] === k) ? k : list[0][0]; nav(); const v = $('#view'); v.onclick = v.onchange = v.oninput = v.onsubmit = null; v.innerHTML = '';
      try { history.replaceState(null, '', '#' + cur); } catch (e) {}
      try { V[cur](); } catch (e) { console.error(e); v.innerHTML = card('Something went wrong', '<p>' + esc(e.message || e) + '</p>'); }
      window.scrollTo({ top: 0 });
    };
    $('#tabs').onclick = e => { const b = e.target.closest('button'); if (b) go(b.dataset.k); };
    window.LMS_PANEL.go = go; window.LMS_PANEL.refreshNav = nav;
    /* new data from other devices (a student paid, a complaint came in...) updates the badges without losing what you are typing */
    let t = 0; ['lms-data', 'lms-contact'].forEach(n => window.addEventListener(n, () => { clearTimeout(t); t = setTimeout(nav, 400); }));
    if (!list.length) { $('#view').innerHTML = card('No access', '<p>You have no tools enabled yet.</p>'); return; }
    window.addEventListener('hashchange', () => { const k = (location.hash || '').slice(1); if (k && k !== cur) go(k); });
    go((location.hash || '').slice(1));
  }
  window.LMS_PANEL = { S, K, C, M, $, esc, toast, card, val, ok, ymd, ls, put, uid, photo, fmtD, fmtT, init, root };
})();
