/* Owner Panel: staff and their private details, the Site Editor (behind a warning + the Full Control password), security.
   Everyday work (payments, marks, notices, classes...) is in admin.html. */
(function () {
  const P = window.LMS_PANEL, S = P.S, C = P.C, M = P.M, $ = P.$, esc = P.esc, toast = P.toast, card = P.card, val = P.val;
  const ss = (k, d) => { try { return sessionStorage.getItem(k) || d; } catch (e) { return d; } };
  let unlocked = ss('lms_full', '') === '1';
  const sel = (id, opts) => `<select id="${id}" class="fi">${opts.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select>`;

  document.addEventListener('keydown', e => {       // phone keyboards: "Go"/Enter must work, not only the button
    if (e.key !== 'Enter') return;
    const m = { kp: '#kg', cp: '#cg', rp: '#ry', p1: '#pg', aP: '#aG' }[e.target.id]; if (!m) return;
    e.preventDefault(); const b = $(m); if (b) b.click();
  });
  function gate(run) {
    if (M.owner) return run();
    $('#view').innerHTML = card('Checking access...', '<p>Please wait a moment.</p>');
    let n = 0; const t = setInterval(() => { n++; if (S.me().owner) { clearInterval(t); location.reload(); } else if (n > 10) { clearInterval(t); location.replace(S.me().admin ? 'admin.html' : 'home.html'); } }, 500);
  }

  /* the Full Control password: asked once per session. Whoever you give it to (and the Owner role) can edit the site. */
  function lockBox(then) {
    if (unlocked) return '';
    const first = !S.ctrl.has();
    return card('Edit the site (Full Control)', `<div class="r"><span><b>Edit site &amp; Full Control</b><br><small>Locked</small></span><button class="sw" id="fc" aria-label="Turn on Full Control"></button></div><div id="fcBox"></div>`);
  }
  function bindLock(rerender) {
    const fc = $('#fc'); if (!fc) return;
    fc.onclick = () => {
      const first = !S.ctrl.has(), b = $('#fcBox');
      b.innerHTML = `<div class="warn"><b>Do you really want to edit the site with full control?</b><br>Changes here are seen by every student immediately. A wrong change can break pages.<br><button class="gold" id="al">Allow</button> <button class="ghost" id="dn">Cancel</button></div>`;
      $('#dn').onclick = () => b.innerHTML = '';
      $('#al').onclick = () => {
        b.innerHTML = `<div class="warn"><b>${first ? 'Create your Full Control password' : 'Enter the Full Control password'}</b>${first ? '<br><small>Share it only with an owner you trust. Anyone who has it can edit the site.</small>' : ''}<input type="password" id="cp" placeholder="Password${first ? ' (6 or more characters)' : ''}" autocomplete="off"><div class="msg" id="cm"></div><button class="gold" id="cg">Confirm</button></div>`;
        $('#cg').onclick = async () => {
          const p = $('#cp').value;
          if (first) { if (p.length < 6) return $('#cm').textContent = 'At least 6 characters.'; await S.ctrl.set(p); }
          else if (!(await S.ctrl.ok(p))) return $('#cm').textContent = 'Wrong password.';
          unlocked = true; try { sessionStorage.setItem('lms_full', '1'); } catch (e) {} toast('Full Control is on'); rerender();
        };
      };
    };
  }
  const lockOff = rerender => `<div class="r"><span><b>Full Control is ON</b><br><small>This session only</small></span><button class="ghost" id="lo">Turn off</button></div>`;

  const siteCfg = () => P.ls('lms_site_cfg', {});
  const saveCfg = o => { P.put('lms_site_cfg', o); window.dispatchEvent(new Event('lms-data')); };

  const V = {
    home() {
      const st = S.db().list, kyc = Object.keys(S.kyc()).length;
      const tile = (k, n, l, h) => `<button class="tile" data-go="${k}"><b>${n}</b><span>${l}</span><small>${h}</small></button>`;
      $('#view').innerHTML = card('Owner overview', `<div class="tiles">${tile('staff', st.filter(x => x.status === 'accepted').length, 'People with access', 'Admins and analysts')}${tile('staff', st.filter(x => x.status === 'invited').length, 'Invites waiting', 'Not accepted yet')}${tile('kyc', kyc, 'Private details', 'NIC checks')}${tile('mail', S.reqs().length, 'Email requests', 'Staff email changes')}</div>`)
        + card('Where to go', `<p>Payments, marks, notices, Contact Us, complaints, classes and Zoom are in the <a href="admin.html">Admin Panel</a>.<br>Site-wide settings, access and security are here.</p>`);
      $('#view').onclick = e => { const b = e.target.closest('[data-go]'); if (b) P.go(b.dataset.go); };
    },

    staff() {
      const d = S.db().list;
      const row = x => `<div class="r"><span><b>${esc(x.email)}</b> <span class="chip2">${esc(x.role)}</span> <span class="chip2">${esc(x.status)}</span>${x.by ? `<br><small>invited by ${esc(x.by)}</small>` : ''}${x.role === 'admin' && x.status === 'accepted' ? '<br>' + Object.keys(S.PERMS).map(k => `<label class="pk"><input type="checkbox" data-p="${k}" data-e="${esc(x.email)}" ${x.perms && x.perms[k] === false ? '' : 'checked'}> ${esc(S.PERMS[k])}</label>`).join('') : ''}</span><button class="red" data-rm="${esc(x.email)}|${esc(x.role)}">Remove</button></div>`;
      $('#view').innerHTML = card('Give access', `<input type="email" id="aE" placeholder="Their email (the one they registered with)">${sel('aR', [['admin', 'Admin Panel'], ['analyze', 'Students and marks only'], ['owner', 'Owner Panel (can also edit the site if they know the Full Control password)']])}<input type="text" id="aP" placeholder="One-time access password (you give it to them)"><div class="msg" id="aM"></div><button class="gold" id="aG">Send invite</button>`)
        + card('People with access', d.length ? d.map(row).join('') : '<p class="empty">Nobody yet.</p>');
      $('#view').onchange = e => { const c = e.target.closest('[data-p]'); if (c) { S.setPerm(c.dataset.e, c.dataset.p, c.checked); toast('Updated'); } };
      $('#view').onclick = async e => {
        if (e.target.closest('#aG')) { const r = await S.invite($('#aR').value, val('aE'), $('#aP').value, {}); if (r === 'ok') { toast('Invite sent'); V.staff(); } else $('#aM').textContent = r; return; }
        const r = e.target.closest('[data-rm]'); if (!r) return; const [em, role] = r.dataset.rm.split('|');
        if (!S.ctrl.has()) return toast('Create the Full Control password first (Site editor tab)');
        r.closest('.r').insertAdjacentHTML('afterend', `<div class="warn"><b>Remove ${esc(em)}?</b><input type="password" id="rp" placeholder="Full Control password"><div class="msg" id="rm"></div><button class="red" id="ry">Remove</button> <button class="ghost" id="rn">Cancel</button></div>`);
        $('#rn').onclick = () => V.staff();
        $('#ry').onclick = async () => { if (!(await S.ctrl.ok($('#rp').value))) return $('#rm').textContent = 'Wrong password.'; S.remove(em, role); toast('Removed'); V.staff(); };
      };
    },

    kyc() {
      $('#view').innerHTML = card('Private details of people you gave access', '<p class="hint">Name, NIC and photos sent by the people who accepted an invite. Only owners can open this.</p><div id="kv"><input type="password" id="kp" placeholder="Details password"><button class="gold" id="kg">View details</button><div class="msg" id="km"></div></div>');
      const kgo = async () => {
        $('#km').textContent = 'Checking...';
        const has = localStorage.getItem('lms_kyc_pw') ? JSON.parse(localStorage.getItem('lms_kyc_pw')) : '', p = $('#kp').value;
        if (!has) { if (p.length < 6) return $('#km').textContent = 'First time: choose a details password (6 or more characters).'; localStorage.setItem('lms_kyc_pw', JSON.stringify(await S.hash(p))); }
        else if ((await S.hash(p)) !== has) return $('#km').textContent = 'Wrong password.';
        const k = Object.values(S.kyc());
        $('#kv').innerHTML = k.length ? k.map(x => `<div class="r kyc" style="display:block"><b>${esc(x.name)}</b> · ${esc(x.role)}<br><small>${esc(x.email)} · NIC ${esc(x.nic)} · ${esc(x.phone)}</small><br><img src="${esc(x.front)}" alt="NIC front"><img src="${esc(x.back)}" alt="NIC back"></div>`).join('') : '<p class="empty">No details yet.</p>';
      };
      $('#view').onclick = e => { if (e.target.closest('#kg')) kgo().catch(x => { const m = $('#km'); if (m) m.textContent = 'Could not open: ' + (x && x.message || x); }); };
    },

    mail() {
      const rq = S.reqs();
      $('#view').innerHTML = card('Staff email change requests', rq.length ? rq.map(x => `<div class="r"><span>${esc(x.old)} &rarr; <b>${esc(x.nu)}</b></span><span class="nw"><button class="gold" data-ea="${esc(x.old)}">Allow</button> <button class="red" data-ed="${esc(x.old)}">Decline</button></span></div>`).join('') : '<p class="empty">No requests.</p>');
      $('#view').onclick = e => { const y = e.target.closest('[data-ea]'), n = e.target.closest('[data-ed]'); if (!(y || n)) return; if (!unlocked) return toast('Turn on Full Control first (Site editor tab)'); S.decideEmail((y || n).dataset.ea || (y || n).dataset.ed, !!y); V.mail(); };
    },

    site() {
      if (!unlocked) { $('#view').innerHTML = lockBox(); bindLock(V.site); return; }
      const KEYS = ['banks', 'brand', 'institutes', 'achievements', 'goals', 'tute', 'verifyAt', 'weakBelow', 'notifications'];
      const labels = { banks: 'Bank accounts (shown to students who pay)', brand: 'Brand / logo', institutes: 'Institutes (register form)', achievements: 'Achievements', goals: 'Goals', tute: 'Tute tracking', verifyAt: 'Blue tick score', weakBelow: 'Weak line', notifications: 'Notification settings' };
      $('#view').innerHTML = card('', lockOff()) + card('Site Editor', `<p class="hint">Classes, notices, Contact Us, Zoom and recordings are managed in the Admin Panel. Everything here changes the whole site for all students.</p><select id="sK" class="fi">${KEYS.map(k => `<option value="${k}">${esc(labels[k])}</option>`).join('')}</select><div id="sBody"></div>`);
      $('#lo').onclick = () => { unlocked = false; try { sessionStorage.removeItem('lms_full'); } catch (e) {} V.site(); };
      const draw = () => {
        const k = $('#sK').value;
        if (k === 'banks') {
          const b = JSON.parse(JSON.stringify(((siteCfg().store || C.store || {}).banks) || []));
          $('#sBody').innerHTML = b.map((x, i) => `<div class="c" style="border:1px solid var(--line)"><div class="row2"><input type="text" data-b="bank" data-i="${i}" placeholder="Bank" value="${esc(x.bank)}"><input type="text" data-b="branch" data-i="${i}" placeholder="Branch" value="${esc(x.branch)}"></div><div class="row2"><input type="text" data-b="name" data-i="${i}" placeholder="Account name" value="${esc(x.name)}"><input type="text" data-b="account" data-i="${i}" placeholder="Account number" value="${esc(x.account)}"></div><button class="red" data-bd="${i}">Remove</button></div>`).join('') + `<button class="ghost" id="bA">+ Add bank</button> <button class="gold" id="bS">Save bank accounts</button><div class="msg" id="sM"></div>`;
          const read = () => { document.querySelectorAll('[data-b]').forEach(i => { b[+i.dataset.i][i.dataset.b] = i.value.trim(); }); return b; };
          $('#sBody').onclick = e => {
            if (e.target.id === 'bA') { read(); b.push({ bank: '', name: '', account: '', branch: '', logo: '', color: '#c8963a' }); return rerenderBanks(b); }
            if (e.target.dataset.bd != null) { read(); b.splice(+e.target.dataset.bd, 1); return rerenderBanks(b); }
            if (e.target.id === 'bS') { const l = read().filter(x => x.bank || x.account); if (l.some(x => !x.bank || !x.account)) return $('#sM').textContent = 'Every bank needs a bank name and an account number.'; const o = siteCfg(); o.store = Object.assign({}, o.store || {}, { banks: l }); saveCfg(o); toast('Saved. Students see it now.'); }
          };
          const rerenderBanks = l => { const o = siteCfg(); o.store = Object.assign({}, o.store || {}, { banks: l }); localStorage.setItem('lms_site_cfg', JSON.stringify(o)); draw(); };
          return;
        }
        $('#sBody').innerHTML = `<textarea id="sJ" rows="14" style="font-family:monospace;font-size:.78rem"></textarea><div class="msg" id="sM"></div><button class="gold" id="sS">Save</button> <button class="ghost" id="sR">Reset to default</button>`;
        $('#sJ').value = JSON.stringify(C[k], null, 2);
        $('#sBody').onclick = e => {
          if (e.target.id === 'sS') { let v; try { v = JSON.parse($('#sJ').value); } catch (x) { return $('#sM').textContent = 'Not valid JSON: ' + x.message; } const o = siteCfg(); o[k] = v; saveCfg(o); toast('Saved'); }
          if (e.target.id === 'sR') { if (!confirm('Go back to the built-in default for this setting?')) return; const o = siteCfg(); delete o[k]; saveCfg(o); toast('Reset'); setTimeout(() => location.reload(), 500); }
        };
      };
      $('#sK').onchange = draw; draw();
    },

    security() {
      $('#view').innerHTML = card('Passwords', `<p>Full Control password: <b>${S.ctrl.has() ? 'set' : 'not set yet'}</b>. Details password: <b>${localStorage.getItem('lms_kyc_pw') ? 'set' : 'not set yet'}</b>.</p>`
        + (unlocked ? `<h4>Change the Full Control password</h4><input type="password" id="p1" placeholder="New password (6 or more)" autocomplete="off"><div class="msg" id="pm"></div><button class="gold" id="pg">Change password</button><p class="hint">Whoever has an Owner role and knows this password can edit the site. Change it if you stop trusting someone.</p>` : '<p class="hint">Turn on Full Control in the Site editor tab to change it.</p>'))
        + card('Owner email', `<p><b>${esc(S.ownerEmail())}</b></p><p class="hint">The main owner email is fixed in firestore.rules, backend.js and config.js for safety. To give someone else the Owner Panel, use "Give access" with the Owner role.</p>`);
      $('#view').onclick = async e => { if (!e.target.closest('#pg')) return; const p = $('#p1').value; if (p.length < 6) return $('#pm').textContent = 'At least 6 characters.'; await S.ctrl.set(p); toast('Password changed'); $('#p1').value = ''; };
    }
  };

  gate(() => P.init('OWNER PANEL', [
    ['home', 'Overview', true],
    ['staff', 'Staff & access', true, () => S.db().list.filter(x => x.status === 'invited').length],
    ['kyc', 'Private details', true],
    ['mail', 'Email requests', true, () => S.reqs().length],
    ['site', 'Site editor', true],
    ['security', 'Security', true]
  ], V));
})();
