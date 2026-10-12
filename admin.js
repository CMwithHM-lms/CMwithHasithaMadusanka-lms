/* Control Panel: Admin tabs for everyone with access, Owner tabs for staff to look at, but only the owner can unlock them. */
(function () {
  const S = window.LMS_STAFF, K = window.LMS_CORE, C = window.LMS_CONFIG, $ = s => document.querySelector(s), esc = S.esc, root = document.documentElement;
  const M = S.me();
  if (!M.admin && !M.analyze) { location.replace('home.html'); return; }
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2000); };
  const setTheme = t => { root.dataset.theme = t; try { localStorage.setItem('lms_theme', t); } catch (e) {} $('#theme').innerHTML = `<i class="ico">${ICON[t === 'dark' ? 'sun' : 'moon']}</i>`; };
  setTheme((() => { try { return localStorage.getItem('lms_theme') || 'light'; } catch (e) { return 'light'; } })());
  $('#theme').onclick = () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
  { const im = new Image(); im.onload = () => $('#logo').replaceChildren(im); im.src = (C.brand || {}).logo || ''; }
  $('#who').textContent = M.owner ? 'Owner' : M.admin ? 'Admin' : 'Paper Analyze';

  let unlocked = sessionStorage.getItem('lms_full') === '1', tab = '';
  const TABS = [];
  if (M.admin) TABS.push(['notice', 'Notice & Contact', M.perms.notice || M.perms.contact], ['links', 'Zoom & YouTube', M.perms.links], ['marks', 'Paper Analyze', M.perms.analyze]);
  else if (M.analyze) TABS.push(['marks', 'Paper Analyze', true]);
  if (M.admin) TABS.push(['scan', 'QR Scanner', true], ['owner', 'Owner Panel', true], ['site', 'Site Editor', true]);
  if (!M.owner) TABS.push(['mail', 'Change my email', true]);
  const tabs = TABS.filter(t => t[2]);
  const go = k => { tab = k; $('#tabs').innerHTML = tabs.map(t => `<button data-k="${t[0]}" class="${t[0] === k ? 'on' : ''}">${t[1]}</button>`).join(''); $('#view').innerHTML = ''; V[k](); };
  $('#tabs').onclick = e => { const b = e.target.closest('button'); if (b) go(b.dataset.k); };
  const card = (h, body) => `<div class="c glass"><h3>${h}</h3>${body}</div>`;
  const val = id => ($('#' + id).value || '').trim();

  const V = {
    notice() {
      const d = K.contact();
      $('#view').innerHTML = card('Notice (shown to students)', `<input type="text" id="nT" placeholder="Title" value="${esc(d.notice.title)}"><textarea id="nX" rows="3" placeholder="Notice text">${esc(d.notice.text)}</textarea><button class="gold" id="nS">Save notice</button> <button class="ghost" id="nC">Clear</button>`)
        + card('Telegram & WhatsApp', `<input type="text" id="tU" placeholder="Telegram username"><input type="text" id="tL" placeholder="Label"><button class="gold" id="tA">Add Telegram</button>
          <input type="text" id="wN" placeholder="WhatsApp 07XXXXXXXX"><input type="text" id="wL" placeholder="Label"><button class="gold" id="wA">Add WhatsApp</button>
          ${d.telegram.map(x => `<div class="r"><span>@${esc(x.user)}</span><button class="red" data-t="${esc(x.user)}">Remove</button></div>`).join('')}${d.whatsapp.map(x => `<div class="r"><span>${esc(x.number)}</span><button class="red" data-w="${esc(x.number)}">Remove</button></div>`).join('')}`)
        + card('Telegram channel', `<input type="text" id="cN" placeholder="Channel name"><input type="text" id="cU" placeholder="https://t.me/..."><button class="gold" id="cA">Add channel</button>`);
      const L = window.LMS_CONTACT, done = r => { toast(['saved', 'removed', 'ok'].includes(r) ? 'Saved' : r); V.notice(); };
      $('#nS').onclick = () => done(L.setNotice(val('nX'), val('nT'))); $('#nC').onclick = () => done(L.clearNotice());
      $('#tA').onclick = () => done(L.addTelegram(val('tU'), val('tL'))); $('#wA').onclick = () => done(L.addWhatsApp(val('wN'), val('wL'))); $('#cA').onclick = () => done(L.addChannel(val('cN'), val('cU'), ''));
      $('#view').onclick = e => { const t = e.target.closest('[data-t]'), w = e.target.closest('[data-w]'); if (t) done(L.removeTelegram(t.dataset.t)); if (w) done(L.removeWhatsApp(w.dataset.w)); };
    },
    marks() {
      const dir = Object.values(K.snap().D).filter(p => !p.demo);
      $('#view').innerHTML = card('Add paper marks', `<input type="text" id="mS" list="sl" placeholder="Student ID"><datalist id="sl">${dir.map(p => `<option value="${esc(p.sid)}">${esc(p.name)}</option>`).join('')}</datalist>
        <input type="text" id="mP" placeholder="Paper name e.g. 2027 Paper No 14"><input type="number" id="mU" placeholder="Pure /100" min="0" max="100"><input type="number" id="mA" placeholder="Applied /100" min="0" max="100"><input type="date" id="mD"><div class="msg" id="mE"></div><button class="gold" id="mG">Save marks</button>`);
      $('#mG').onclick = () => {
        const sid = val('mS'), u = +val('mU'), a = +val('mA'); if (!dir.some(p => p.sid === sid)) return $('#mE').textContent = 'No student with that ID.';
        if (!val('mP') || !(u >= 0 && u <= 100 && a >= 0 && a <= 100) || !val('mU') || !val('mA')) return $('#mE').textContent = 'Enter a paper name and both marks (0 to 100).';
        const r = LMS_MARKS.add(sid, val('mP'), u, a, val('mD') || undefined, (dir.find(p => p.sid === sid) || {}).year); toast(r); V.marks();
      };
    },
    links() {
      const st = JSON.parse(JSON.stringify(C.store || { classes: [] })), cl = st.classes.filter(c => (c.sessions || []).length || c.includes && c.includes.zoom);
      const opt = cl.map((c, i) => `<option value="${i}">${esc(c.mode)} · ${esc(c.year)} · ${esc(c.title)} (${esc(c.month)})</option>`).join('');
      $('#view').innerHTML = card('Zoom link & recordings', `<select id="lC" style="width:100%;padding:11px;border-radius:12px;margin:5px 0">${opt}</select><div id="lS"></div>`);
      const save = () => { const o = JSON.parse(localStorage.getItem('lms_site_cfg') || '{}'); o.store = st; localStorage.setItem('lms_site_cfg', JSON.stringify(o)); toast('Saved'); draw(); };
      const draw = () => {
        const c = cl[+$('#lC').value]; if (!c) return $('#lS').innerHTML = '<small>No class with live sessions yet.</small>';
        c.sessions = c.sessions || [{ id: 's1', title: 'Live Class', zoom: {}, recordings: [] }];
        $('#lS').innerHTML = c.sessions.map((s, i) => { const z = s.zoom || {}; return `<div class="c" style="border:1px solid var(--line)"><b>${esc(s.title)}</b>
          <input type="text" id="zl${i}" placeholder="Zoom link" value="${esc(z.link || '')}"><input type="text" id="zs${i}" placeholder="Start 2026-10-14T18:00" value="${esc(z.start || '')}"><input type="text" id="zp${i}" placeholder="Passcode" value="${esc(z.passcode || '')}"><textarea id="zn${i}" rows="2" placeholder="Notice for students">${esc(z.notice || '')}</textarea><button class="gold" data-zs="${i}">Save Zoom</button>
          ${(s.recordings || []).map((r, j) => `<div class="r"><span>${esc(r.title || r.url)}</span><button class="red" data-rd="${i}|${j}">Delete</button></div>`).join('')}
          <input type="text" id="yu${i}" placeholder="YouTube link"><input type="text" id="yt${i}" placeholder="Title (optional)"><button class="gold" data-ya="${i}">Add recording</button></div>`; }).join('');
      };
      $('#lC').onchange = draw; draw();
      $('#view').onclick = e => { const b = e.target.closest('button'); if (!b) return; const c = cl[+$('#lC').value];
        if (b.dataset.zs != null) { const i = +b.dataset.zs; c.sessions[i].zoom = { link: val('zl' + i), start: val('zs' + i), passcode: val('zp' + i), notice: val('zn' + i), minutes: (c.sessions[i].zoom || {}).minutes || 150 }; save(); }
        if (b.dataset.ya != null) { const i = +b.dataset.ya; if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(val('yu' + i))) return toast('Enter a YouTube link'); (c.sessions[i].recordings = c.sessions[i].recordings || []).unshift({ url: val('yu' + i), title: val('yt' + i), thumb: '', date: K.ymd(new Date()) }); save(); }
        if (b.dataset.rd) { const [i, j] = b.dataset.rd.split('|'); c.sessions[+i].recordings.splice(+j, 1); save(); } };
    },
    mail() {
      const q = S.reqs().find(x => x.old === M.email);
      $('#view').innerHTML = card('Change my access email', `<small>Current: ${esc(M.email)}</small>${q ? `<div class="warn">Waiting for the owner to allow: ${esc(q.nu)}</div>` : ''}<input type="email" id="eN" placeholder="New email"><div class="msg" id="eM"></div><button class="gold" id="eG">Send request</button>`);
      $('#eG').onclick = () => { const r = S.reqEmail(M.email, val('eN')); if (r === 'ok') { toast('Request sent'); V.mail(); } else $('#eM').textContent = r; };
    },
    site() {
      if (!M.owner) return $('#view').innerHTML = card('Site Editor', '<div class="warn"><b>No access.</b> Only the owner can edit the whole site.</div>');
      if (!unlocked) return $('#view').innerHTML = card('Site Editor', '<p class="lock">Unlock Edit site &amp; Full Control in the Owner Panel first.</p>');
      const KEYS = ['brand', 'institutes', 'notices', 'store', 'contact', 'achievements', 'goals', 'tute', 'papers', 'verifyAt', 'weakBelow', 'demo', 'notifications'];
      $('#view').innerHTML = card('Site Editor (login page, institutes, notices, fees, bank accounts and more)', `<select id="sK" style="width:100%;padding:11px;border-radius:12px">${KEYS.map(k => `<option>${k}</option>`).join('')}</select><textarea id="sJ" rows="14" style="font-family:monospace;font-size:.78rem"></textarea><div class="msg" id="sM"></div><button class="gold" id="sS">Save</button> <button class="ghost" id="sR">Reset to default</button><p><small>Institutes: add or remove names here. They appear on the register form and student cards.</small></p>`);
      const load = () => $('#sJ').value = JSON.stringify(C[$('#sK').value], null, 2);
      $('#sK').onchange = load; load();
      $('#sS').onclick = () => { let v; try { v = JSON.parse($('#sJ').value); } catch (e) { return $('#sM').textContent = 'Not valid JSON: ' + e.message; } const o = JSON.parse(localStorage.getItem('lms_site_cfg') || '{}'); o[$('#sK').value] = v; localStorage.setItem('lms_site_cfg', JSON.stringify(o)); toast('Saved. Reload pages to see it.'); };
      $('#sR').onclick = () => { const o = JSON.parse(localStorage.getItem('lms_site_cfg') || '{}'); delete o[$('#sK').value]; localStorage.setItem('lms_site_cfg', JSON.stringify(o)); toast('Reset. Reloading...'); setTimeout(() => location.reload(), 600); };
    },
    scan() { $('#view').innerHTML = card('QR Scanner', `<p>Scan a student's QR code to see details, fees, last paper and attendance.</p><a class="gold" style="display:inline-block;text-decoration:none;padding:11px 16px;border-radius:12px" href="scan.html">Open scanner</a>`); },
    owner() {
      const toggle = `<div class="r"><span><b>Edit site &amp; Full Control</b><br><small>${unlocked ? 'Unlocked for this session' : 'Locked'}</small></span><button class="sw${unlocked ? ' on' : ''}" id="fc" aria-label="Full control"></button></div><div id="fcBox"></div>`;
      const rq = S.reqs(), rqH = rq.length ? card('Email change requests', rq.map(x => `<div class="r"><span>${esc(x.old)} &rarr; <b>${esc(x.nu)}</b></span><span><button class="gold" data-ea="${esc(x.old)}">Allow</button> <button class="red" data-ed="${esc(x.old)}">Decline</button></span></div>`).join('')) : '';
      $('#view').innerHTML = card('Owner Panel', toggle) + rqH + (unlocked ? staffView() : card('Staff & access', '<p class="lock">Turn on Edit site &amp; Full Control to manage admins, owners and private details.</p>'));
      $('#fc').onclick = fullControl; if (unlocked) bindStaff();
      $('#view').addEventListener('click', e => { const y = e.target.closest('[data-ea]'), n = e.target.closest('[data-ed]'); if (!M.owner || !(y || n)) return; if (!unlocked) return toast('Unlock Full Control first'); S.decideEmail((y || n).dataset.ea || (y || n).dataset.ed, !!y); V.owner(); });
    }
  };

  function fullControl() {
    const b = $('#fcBox');
    if (!M.owner) { b.innerHTML = '<div class="warn"><b>No access.</b> Only the owner can use Edit site &amp; Full Control.</div>'; return; }
    if (unlocked) { unlocked = false; sessionStorage.removeItem('lms_full'); return V.owner(); }
    b.innerHTML = '<div class="warn"><b>Do you really want to edit the site with full control?</b><br><button class="gold" id="al">Allow</button> <button class="ghost" id="dn">Cancel</button></div>';
    $('#dn').onclick = () => b.innerHTML = '';
    $('#al').onclick = () => { const first = !S.ctrl.has(); b.innerHTML = `<div class="warn"><b>${first ? 'Create your Full Control password' : 'Enter your Full Control password'}</b><input type="password" id="cp" placeholder="Password${first ? ' (min 6 characters)' : ''}"><div class="msg" id="cm"></div><button class="gold" id="cg">Confirm</button></div>`;
      $('#cg').onclick = async () => { const p = $('#cp').value; if (first) { if (p.length < 6) return $('#cm').textContent = 'At least 6 characters.'; await S.ctrl.set(p); } else if (!(await S.ctrl.ok(p))) return $('#cm').textContent = 'Wrong password.'; unlocked = true; sessionStorage.setItem('lms_full', '1'); V.owner(); }; };
  }

  function staffView() {
    const d = S.db().list, row = x => `<div class="r"><span><b>${esc(x.email)}</b> <span class="chip2">${x.role}</span> <span class="chip2">${x.status}</span>${x.role === 'admin' && x.status === 'accepted' ? '<br>' + Object.keys(S.PERMS).map(k => `<label style="font-size:.75rem;margin-right:8px"><input type="checkbox" data-p="${k}" data-e="${esc(x.email)}" ${x.perms && x.perms[k] === false ? '' : 'checked'}> ${S.PERMS[k]}</label>`).join('') : ''}</span><button class="red" data-rm="${esc(x.email)}|${x.role}">Remove</button></div>`;
    return card('Give access', `<input type="email" id="aE" placeholder="Their email (the one they log in with)"><select id="aR" class="fi" style="width:100%;margin:5px 0;padding:11px;border-radius:12px"><option value="admin">Admin Panel</option><option value="analyze">Paper Analyze only</option><option value="owner">Owner Panel</option></select><input type="text" id="aP" placeholder="One-time access password (you give it to them)"><div class="msg" id="aM"></div><button class="gold" id="aG">Send invite</button>`)
      + card('People with access', d.length ? d.map(row).join('') : '<p><small>Nobody yet.</small></p>')
      + card('Private details (owner only)', '<div id="kv"><input type="password" id="kp" placeholder="Details password"><button class="gold" id="kg">View details</button><div class="msg" id="km"></div></div>')
      + card('Owner email', `<small>Current: ${esc(S.ownerEmail())}</small><input type="email" id="oE" placeholder="New owner email"><button class="gold" id="oG">Change</button>`);
  }
  function bindStaff() {
    const v = $('#view');
    $('#aG').onclick = async () => { const r = await S.invite($('#aR').value, val('aE'), $('#aP').value, {}); if (r === 'ok') { toast('Invite sent'); V.owner(); } else $('#aM').textContent = r; };
    v.onchange = e => { const c = e.target.closest('[data-p]'); if (c) { S.setPerm(c.dataset.e, c.dataset.p, c.checked); toast('Updated'); } };
    v.onclick = e => {
      const r = e.target.closest('[data-rm]'); if (!r) return; const [em, role] = r.dataset.rm.split('|');
      r.closest('.r').insertAdjacentHTML('afterend', `<div class="warn"><b>Remove ${esc(em)}?</b><input type="password" id="rp" placeholder="Full Control password"><div class="msg" id="rm"></div><button class="red" id="ry">Accept</button> <button class="ghost" id="rn">Decline</button></div>`);
      $('#rn').onclick = () => V.owner();
      $('#ry').onclick = async () => { if (!(await S.ctrl.ok($('#rp').value))) return $('#rm').textContent = 'Wrong password.'; S.remove(em, role); toast('Removed'); V.owner(); };
    };
    $('#kg').onclick = async () => {
      const key = 'lms_kyc_pw', has = localStorage.getItem(key), p = $('#kp').value;
      if (!has) { if (p.length < 6) return $('#km').textContent = 'First time: choose a details password (6+ characters).'; localStorage.setItem(key, await S.hash(p)); }
      else if ((await S.hash(p)) !== has) return $('#km').textContent = 'Wrong password.';
      const k = Object.values(S.kyc());
      $('#kv').innerHTML = k.length ? k.map(x => `<div class="r kyc" style="display:block"><b>${esc(x.name)}</b> · ${esc(x.role)}<br><small>${esc(x.email)} · NIC ${esc(x.nic)} · ${esc(x.phone)}</small><br><img src="${x.front}" alt="NIC front"><img src="${x.back}" alt="NIC back"></div>`).join('') : '<small>No details yet.</small>';
    };
    $('#oG').onclick = () => { const e = val('oE'); if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return toast('Enter a valid email'); S.setOwnerEmail(e); toast('Owner email changed'); location.reload(); };
  }
  if (tabs.length) go(tabs[0][0]); else $('#view').innerHTML = card('No access', '<p>You have no tools enabled yet.</p>');
})();
