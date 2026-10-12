/* Admin Panel: day-to-day work (payments, marks, notices, contact, complaints, classes, Zoom + recordings, giving access).
   Owner-only things (site editor, staff list, private details) live in owner.html. */
(function () {
  const P = window.LMS_PANEL, S = P.S, K = P.K, C = P.C, M = P.M, $ = P.$, esc = P.esc, toast = P.toast, card = P.card, val = P.val;
  const ss = (k, d) => { try { return sessionStorage.getItem(k) || d; } catch (e) { return d; } }, ssSet = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} };
  const YEARS = ['2026', '2027', '2028', '2029'], MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const sel = (id, opts, cur, extra) => `<select id="${id}" class="fi" ${extra || ''}>${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
  const staffMail = () => new Set(S.db().list.filter(x => x.status === 'accepted').map(x => String(x.email).toLowerCase()).concat([String(S.ownerEmail()).toLowerCase()]));
  const students = () => { const st = staffMail(); return Object.entries(P.ls('lms_profiles', {})).filter(([k, p]) => p && p.sid && p.name && !/^top_/.test(k) && !st.has(String(p.email || '').toLowerCase())).map(x => x[1]); };
  const classes = () => ((C.store || {}).classes || []);
  const cTitle = c => c ? `${c.title} · ${c.month} · ${c.mode}` : '';
  const cnt = {
    pay: () => P.ls('lms_orders', []).filter(o => o.status === 'pending').length,
    cmp: () => P.ls('lms_complaints', []).filter(c => (c.status || 'new') === 'new').length,
    req: () => P.ls('lms_requests', []).filter(r => r.status === 'pending').length
  };

  /* wait a moment for the saved login to bring the staff list before turning someone away */
  function gate(run) {
    if (M.admin || M.analyze) return run();
    $('#view').innerHTML = card('Checking access...', '<p>Please wait a moment.</p>');
    let n = 0; const t = setInterval(() => { n++; const m = S.me(); if (m.admin || m.analyze) { clearInterval(t); location.reload(); } else if (n > 10) { clearInterval(t); location.replace('home.html'); } }, 500);
  }

  const V = {
    /* ---------- overview ---------- */
    home() {
      const tile = (k, n, label, hint) => `<button class="tile" data-go="${k}"><b>${n}</b><span>${label}</span><small>${hint}</small></button>`;
      $('#view').innerHTML = card('Today', `<div class="tiles">${tile('pay', cnt.pay(), 'Payments waiting', 'Check slips and cards')}${tile('cmp', cnt.cmp(), 'New complaints', 'Reply to students')}${tile('req', cnt.req(), 'Change requests', 'Locked profile details')}${tile('stu', students().length, 'Students', 'Names and marks')}</div>`)
        + card('Quick actions', `<div class="qa"><button class="gold" data-go="stu">Enter marks</button><button class="gold" data-go="notice">Post a notice</button><button class="gold" data-go="live">Add Zoom / recording</button><a class="ghost" href="scan.html">Open QR scanner</a></div>`);
      $('#view').onclick = e => { const b = e.target.closest('[data-go]'); if (b) P.go(b.dataset.go); };
    },

    /* ---------- payments ---------- */
    pay() {
      const O = window.LMS_ORDERS, st = { f: ss('lms_payf', 'pending'), y: ss('lms_payy', 'all'), q: '' };
      const all = () => O.list().filter(o => o.status !== 'draft'), yOf = o => String((O.classOf(o.classId) || {}).year || o.year || '');
      const draw = () => {
        const a = all(), shown = a.filter(o => (st.f === 'all' || o.status === st.f) && (st.y === 'all' || yOf(o) === st.y) && (!st.q || [o.name, o.sid, o.phone].join(' ').toLowerCase().includes(st.q)));
        $('#pl').innerHTML = shown.map(o => {
          const c = O.classOf(o.classId), left = o.expires ? Math.ceil((o.expires - Date.now()) / 864e5) : null;
          return `<article class="pc ${esc(o.status)}"><header><div><b>${esc(o.name || 'Student')}</b><small>${esc(o.sid || '')} · ${esc(o.phone || '')} · A/L ${esc(yOf(o))}</small></div><em class="chip ${esc(o.status)}">${esc(o.status)}</em></header>
            <p class="pcl">${esc(O.classTitle(o.classId))}${c && c.fee ? ` · LKR ${Number(c.fee).toLocaleString('en-US')}` : ''}</p>
            <small>${o.kind === 'card' ? 'Card' : 'Slip'} sent ${esc(P.fmtT(o.submitted || o.created))}${o.status === 'approved' ? ` · approved ${esc(P.fmtD(o.approved))}${left != null ? ` · ${left > 0 ? left + ' days left' : 'expired'}` : ''}${o.extra ? ` · +${o.extra} days` : ''}` : ''}${o.note ? ` · note: ${esc(o.note)}` : ''}</small>
            ${o.img ? `<img class="slip" src="${esc(o.img)}" alt="Payment slip" data-zoom="1">` : '<p class="msg">No image attached</p>'}
            <div class="acts">${o.status === 'pending' ? `<input type="text" id="n_${esc(o.id)}" placeholder="Reason if rejecting (the student sees it)"><button class="gold" data-ok="${esc(o.id)}">Approve</button><button class="red" data-no="${esc(o.id)}">Reject</button>` : ''}
            ${o.status === 'approved' ? `<input type="number" id="x_${esc(o.id)}" placeholder="Extra days" min="1" max="365"><button class="gold" data-ex="${esc(o.id)}">Extend days</button><button class="red" data-no="${esc(o.id)}">Cancel access</button>` : ''}
            ${o.status === 'rejected' ? `<button class="gold" data-ok="${esc(o.id)}">Approve anyway</button>` : ''}</div></article>`;
        }).join('') || '<p class="empty">Nothing here.</p>';
        $('#pc').innerHTML = ['pending', 'approved', 'rejected', 'all'].map(k => `<button class="${k === st.f ? 'gold' : 'ghost'}" data-f="${k}">${k[0].toUpperCase() + k.slice(1)} <i class="bd">${k === 'all' ? a.length : a.filter(o => o.status === k).length}</i></button>`).join('');
      };
      $('#view').innerHTML = card('Payments (slips and cards)', `<div id="pc" class="chips"></div><div class="row2">${sel('py', [['all', 'All years'], ...YEARS.map(y => [y, 'A/L ' + y])], st.y)}<input type="text" id="pq" placeholder="Search name, phone, Student ID"></div><div id="pl"></div>`);
      draw();
      $('#view').onchange = e => { if (e.target.id === 'py') { st.y = e.target.value; ssSet('lms_payy', st.y); draw(); } };
      $('#view').oninput = e => { if (e.target.id === 'pq') { st.q = e.target.value.trim().toLowerCase(); draw(); } };
      $('#view').onclick = e => {
        const b = e.target.closest('button, img'); if (!b) return; const d = b.dataset;
        if (d.zoom) return lightbox(b.currentSrc || b.src);
        if (d.f) { st.f = d.f; ssSet('lms_payf', st.f); return draw(); }
        if (d.ok) { toast(O.approve(d.ok) === 'approved' ? 'Approved. The student is notified.' : 'Could not approve'); draw(); P.refreshNav(); }
        else if (d.no) { const o = O.list().find(x => x.id === d.no); if (o && o.status === 'approved' && !confirm('Cancel this student\'s access?')) return; toast(O.reject(d.no, ($('#n_' + d.no) || {}).value || '') === 'rejected' ? 'Rejected. The student is notified.' : 'Could not reject'); draw(); P.refreshNav(); }
        else if (d.ex) { const n = +($('#x_' + d.ex) || {}).value; if (!(n > 0)) return toast('Enter the number of days'); toast(O.extend(d.ex, n)); draw(); }
      };
    },

    /* ---------- students + marks ---------- */
    stu() {
      const st = { y: ss('lms_sy', '2027'), paper: ss('lms_sp', ''), only: false, q: '' };
      const papers = () => [...new Set(LMS_MARKS.all().filter(r => String(r.year) === st.y).map(r => r.paper))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      const marks = () => { const m = {}; LMS_MARKS.all().filter(r => String(r.year) === st.y && r.paper === st.paper).forEach(r => m[r.sid] = r); return m; };
      const list = () => students().filter(p => String(p.year) === st.y).sort((a, b) => a.name.localeCompare(b.name));
      const paperName = () => st.paper === '__new' ? val('np') : st.paper;
      const draw = () => {
        const mk = st.paper && st.paper !== '__new' ? marks() : {}, all = list(), done = all.filter(p => mk[p.sid]).length;
        const rows = all.filter(p => (!st.q || [p.name, p.phone, p.sid, p.school].join(' ').toLowerCase().includes(st.q)) && (!st.only || !mk[p.sid]));
        $('#sl').innerHTML = rows.map(p => `<label class="mr" for="m_${esc(p.sid)}"><span class="mn"><b>${esc(p.name)}</b><small>${esc(p.sid)} · ${esc(p.institute || '')}${p.school ? ' · ' + esc(p.school) : ''}</small></span><input type="number" inputmode="decimal" step="0.1" min="0" max="100" id="m_${esc(p.sid)}" data-s="${esc(p.sid)}" data-o="${mk[p.sid] ? esc(mk[p.sid].full != null ? mk[p.sid].full : (mk[p.sid].pure + mk[p.sid].applied) / 2) : ''}" value="${mk[p.sid] ? esc(mk[p.sid].full != null ? mk[p.sid].full : (mk[p.sid].pure + mk[p.sid].applied) / 2) : ''}" placeholder="/100"></label>`).join('') || `<p class="empty">${all.length ? 'No student matches.' : 'No students registered for A/L ' + st.y + ' yet.'}</p>`;
        $('#sc').textContent = st.paper && st.paper !== '__new' ? `${done} of ${all.length} students marked` : `${all.length} students in A/L ${st.y}`;
        $('#sv').disabled = !paperName();
      };
      const head = () => {
        const ps = papers();
        if (!st.paper || (st.paper !== '__new' && !ps.includes(st.paper))) st.paper = ps.length ? ps[ps.length - 1] : '__new';
        $('#hd').innerHTML = `<div class="row2">${sel('sy', YEARS.map(y => [y, 'A/L ' + y]), st.y)}${sel('sp', [...ps.map(p => [p, p]), ['__new', '+ New paper']], st.paper)}</div>
          ${st.paper === '__new' ? `<input type="text" id="np" placeholder="New paper name, e.g. ${st.y} Paper No 14"><label class="lb">Paper date<input type="date" id="nd" value="${P.ymd()}"></label>` : ''}`;
      };
      $('#view').innerHTML = card('Students and marks', `<p class="hint">Pick the year and the paper, type each student's mark out of 100, then press Save. Students see it and get a notification straight away.</p><div id="hd"></div>
        <div class="row2"><input type="text" id="sq" placeholder="Search name, phone, ID"><label class="chk"><input type="checkbox" id="so"> Only not marked yet</label></div>
        <div class="bar"><span id="sc"></span><button class="gold" id="sv">Save marks</button></div><div id="sl" class="mlist"></div>`);
      head(); draw();
      $('#view').onchange = e => {
        if (e.target.id === 'sy') { st.y = e.target.value; ssSet('lms_sy', st.y); st.paper = ''; head(); draw(); }
        if (e.target.id === 'sp') { st.paper = e.target.value; ssSet('lms_sp', st.paper); head(); draw(); }
        if (e.target.id === 'so') { st.only = e.target.checked; draw(); }
      };
      $('#view').oninput = e => {
        if (e.target.id === 'sq') { st.q = e.target.value.trim().toLowerCase(); const keep = {}; document.querySelectorAll('#sl input').forEach(i => { if (i.value !== i.dataset.o) keep[i.dataset.s] = i.value; }); draw(); Object.keys(keep).forEach(s => { const i = document.getElementById('m_' + s); if (i) i.value = keep[s]; }); }
        if (e.target.id === 'np') $('#sv').disabled = !paperName();
        if (e.target.matches('#sl input')) e.target.closest('.mr').classList.toggle('dirty', e.target.value !== e.target.dataset.o);
      };
      $('#view').onclick = e => {
        if (!e.target.closest('#sv')) return;
        const name = paperName(); if (!name) return toast('Choose or type a paper name');
        const items = [...document.querySelectorAll('#sl input')].filter(i => i.value !== i.dataset.o).map(i => ({ sid: i.dataset.s, mark: i.value }));
        const bad = items.find(x => x.mark !== '' && !(+x.mark >= 0 && +x.mark <= 100)); if (bad) return toast('Marks must be between 0 and 100');
        if (!items.length) return toast('Nothing changed');
        const r = LMS_MARKS.setMany(st.y, name, st.paper === '__new' ? val('nd') : '', items);
        toast(r); st.paper = name; ssSet('lms_sp', name); head(); draw();
      };
    },

    /* ---------- home notices ---------- */
    notice() {
      const get = () => (P.ls('lms_notices', null) || { list: (C.notices || []) }).list.slice();
      const save = l => { P.put('lms_notices', { list: l }); window.dispatchEvent(new Event('lms-data')); };
      const draw = () => {
        const l = get().sort((a, b) => (b.at || 0) - (a.at || 0));
        $('#nl').innerHTML = l.map((n, i) => `<div class="r"><span><b>${esc(n.title)}</b>${n.text ? `<br>${esc(n.text)}` : ''}<br><small>${esc(n.date || '')}${n.link ? ' · ' + esc(n.link) : ''}</small></span><button class="red" data-d="${i}">Delete</button></div>`).join('') || '<p class="empty">No notices. Students see an empty notice box.</p>';
      };
      $('#view').innerHTML = card('Post a Home notice', `<p class="hint">Shown on every student's Home page right away (even if they are using the site now). Students can only read it.</p><input type="text" id="nT" placeholder="Title (short)" maxlength="90"><textarea id="nX" rows="3" placeholder="Details (optional)" maxlength="400"></textarea><input type="text" id="nL" placeholder="Link (optional) https://..."><button class="gold" id="nS">Post notice</button><div class="msg" id="nM"></div>`)
        + card('Current notices', '<div id="nl"></div>');
      draw();
      $('#view').onclick = e => {
        if (e.target.closest('#nS')) {
          const t = val('nT'), x = val('nX'), l = val('nL'); if (!t) return $('#nM').textContent = 'Write a title.';
          if (l && !/^https?:\/\//i.test(l)) return $('#nM').textContent = 'The link must start with https://';
          const a = get(); a.push({ id: P.uid(), title: t, text: x, link: l, date: P.ymd(), at: Date.now() }); save(a.slice(-60)); toast('Posted'); V.notice();
        }
        const d = e.target.closest('[data-d]'); if (d) { const l = get().sort((a, b) => (b.at || 0) - (a.at || 0)); l.splice(+d.dataset.d, 1); save(l); toast('Deleted'); draw(); }
      };
    },

    /* ---------- contact us ---------- */
    contact() {
      const L = window.LMS_CONTACT, d = L.data(), done = r => { toast(P.ok(r) ? 'Saved' : r); if (P.ok(r)) V.contact(); };
      const list = (items, fn, rm) => items.map(x => `<div class="r"><span>${fn(x)}</span><button class="red" data-${rm}="${esc(x.user || x.number || x.name || x.id)}">Remove</button></div>`).join('') || '<p class="empty">Nothing added.</p>';
      $('#view').innerHTML = card('Contact Us notice', `<p class="hint">The yellow notice at the top of the Contact Us page. Leave it empty to hide it.</p><input type="text" id="cnT" placeholder="Title" value="${esc(d.notice.title)}"><textarea id="cnX" rows="3" placeholder="Notice text">${esc(d.notice.text)}</textarea><button class="gold" id="cnS">Save notice</button> <button class="ghost" id="cnC">Clear</button>`)
        + card('Hotline numbers (WhatsApp)', `<div class="row2"><input type="text" id="wN" placeholder="07XXXXXXXX" inputmode="numeric"><input type="text" id="wL" placeholder="Label, e.g. Hotline"></div><button class="gold" id="wA">Add number</button>${list(d.whatsapp, x => `<b>${esc(x.number)}</b> <small>${esc(x.label || '')}</small>`, 'w')}`)
        + card('Telegram contacts', `<div class="row2"><input type="text" id="tU" placeholder="username (no @)"><input type="text" id="tL" placeholder="Label"></div><button class="gold" id="tA">Add Telegram</button>${list(d.telegram, x => `<b>@${esc(x.user)}</b> <small>${esc(x.label || '')}</small>`, 't')}`)
        + card('Telegram channels', `<input type="text" id="chN" placeholder="Channel name"><input type="text" id="chU" placeholder="https://t.me/..."><input type="text" id="chD" placeholder="Short description"><button class="gold" id="chA">Add channel</button>${list(d.channels, x => `<b>${esc(x.name)}</b><br><small>${esc(x.url)}</small>`, 'c')}`)
        + card('Support hours', `<input type="text" id="hrs" placeholder="Mon to Sat · 8.00 AM to 8.00 PM" value="${esc(d.hours || '')}"><button class="gold" id="hrS">Save hours</button>`)
        + card('FAQ (frequently asked questions)', `<input type="text" id="fq" placeholder="Question"><textarea id="fa" rows="2" placeholder="Answer"></textarea><button class="gold" id="fA">Add FAQ</button>${list(d.faqs, x => `<b>${esc(x.q)}</b><br><small>${esc(x.a)}</small>`, 'f')}`);
      $('#view').onclick = e => {
        const b = e.target.closest('button'); if (!b) return; const i = b.id, dd = b.dataset;
        if (i === 'cnS') return done(L.setNotice(val('cnX'), val('cnT'))); if (i === 'cnC') return done(L.clearNotice());
        if (i === 'wA') return done(L.addWhatsApp(val('wN'), val('wL'))); if (i === 'tA') return done(L.addTelegram(val('tU'), val('tL')));
        if (i === 'chA') return done(L.addChannel(val('chN'), val('chU'), val('chD'))); if (i === 'hrS') return done(L.setHours(val('hrs')));
        if (i === 'fA') return done(L.addFaq(val('fq'), val('fa')));
        if (dd.w != null) return done(L.removeWhatsApp(dd.w)); if (dd.t != null) return done(L.removeTelegram(dd.t)); if (dd.c != null) return done(L.removeChannel(dd.c)); if (dd.f != null) return done(L.removeFaq(dd.f));
      };
    },

    /* ---------- complaints ---------- */
    cmp() {
      const L = window.LMS_CONTACT, st = { f: ss('lms_cf', 'all') };
      const draw = () => {
        const all = L.complaints(), l = all.filter(c => st.f === 'all' || (c.status || 'new') === st.f);
        $('#cf').innerHTML = [['all', 'All'], ['new', 'New'], ['review', 'In review'], ['resolved', 'Resolved']].map(([k, n]) => `<button class="${k === st.f ? 'gold' : 'ghost'}" data-f="${k}">${n} <i class="bd">${k === 'all' ? all.length : all.filter(c => (c.status || 'new') === k).length}</i></button>`).join('');
        const f = (k, v) => v ? `<span><small>${k}</small> ${esc(v)}</span>` : '';
        $('#cl').innerHTML = l.map(c => `<article class="pc ${esc(c.status || 'new')}"><header><div><b>#${c.no} · ${esc(c.name || 'Student')}</b><small>${esc(c.ref || '')} · ${esc(P.fmtT(c.created))} · ${esc(c.category || '')}</small></div><em class="chip ${esc(c.status || 'new')}">${esc(c.status || 'new')}</em></header>
          <div class="kv">${f('Student ID', c.sid)}${f('Phone', c.phone)}${f('WhatsApp', c.whatsapp)}${f('Email', c.email)}${f('Telegram', c.telegram)}${f('Institute', c.institute)}${f('A/L', c.year)}${f('Attempt', c.attempt)}${f('School', c.school)}${f('District', c.district)}${f('Town', c.town)}</div>
          <p class="ctext">${esc(c.text)}</p>${c.reply ? `<div class="warn"><b>Your reply</b> <small>${esc(P.fmtT(c.repliedAt))}</small><br>${esc(c.reply)}</div>` : ''}
          <textarea id="r_${esc(c.id)}" rows="2" placeholder="${c.reply ? 'Update your reply' : 'Write a reply. The student sees it in Contact Us.'}"></textarea>
          <div class="acts"><button class="gold" data-r="${esc(c.id)}">${c.reply ? 'Update reply' : 'Send reply'}</button>${c.status !== 'review' && c.status !== 'resolved' ? `<button class="ghost" data-s="review|${esc(c.id)}">Mark in review</button>` : ''}${c.status !== 'resolved' ? `<button class="ghost" data-s="resolved|${esc(c.id)}">Mark resolved</button>` : ''}</div></article>`).join('') || '<p class="empty">No complaints here.</p>';
      };
      $('#view').innerHTML = card('Complaints (newest first)', '<div id="cf" class="chips"></div><div id="cl"></div>'); draw();
      $('#view').onclick = e => {
        const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
        if (d.f) { st.f = d.f; ssSet('lms_cf', st.f); return draw(); }
        if (d.r) { const t = ($('#r_' + d.r).value || '').trim(); if (!t) return toast('Write a reply first'); toast(L.reply(d.r, t) === 'replied' ? 'Reply sent. The student is notified.' : 'Could not save'); draw(); P.refreshNav(); }
        if (d.s) { const [s, id] = d.s.split('|'); L.setStatus(id, s); toast('Updated'); draw(); P.refreshNav(); }
      };
    },

    /* ---------- profile change requests ---------- */
    req() {
      const get = () => P.ls('lms_requests', []);
      const login = f => ['email', 'phone'].includes(f);
      const draw = () => {
        const l = get().slice().sort((a, b) => (b.created || 0) - (a.created || 0));
        $('#rl').innerHTML = l.map(r => `<article class="pc ${esc(r.status)}"><header><div><b>${esc(r.name || '')}</b><small>${esc(r.sid)} · ${esc(r.phone)} · ${esc(P.fmtT(r.created))}</small></div><em class="chip ${esc(r.status)}">${esc(r.status)}</em></header>
          <p><b>${esc(r.label)}</b>: <s>${esc(r.current || '-')}</s> &rarr; <b>${esc(r.value)}</b></p><small>Reason: ${esc(r.reason)}</small>
          ${r.status === 'pending' ? `<div class="acts">${login(r.field) ? '<small class="msg">This is a login detail. Change it in Firebase Authentication yourself, then press Done.</small>' : ''}<button class="gold" data-a="${esc(r.id)}">${login(r.field) ? 'Done' : 'Apply change'}</button><button class="red" data-d="${esc(r.id)}">Decline</button></div>` : ''}</article>`).join('') || '<p class="empty">No requests.</p>';
      };
      $('#view').innerHTML = card('Profile change requests', '<p class="hint">Students cannot edit locked details (NIC, year, institute...). They send a request here.</p><div id="rl"></div>'); draw();
      $('#view').onclick = e => {
        const b = e.target.closest('button'); if (!b) return; const all = get(), r = all.find(x => x.id === (b.dataset.a || b.dataset.d)); if (!r) return;
        if (b.dataset.a) { r.status = 'approved'; if (!login(r.field)) { const Pf = P.ls('lms_profiles', {}), p = Pf[r.phone]; if (p) { p[r.field] = r.value; P.put('lms_profiles', Pf); } } } else r.status = 'declined';
        P.put('lms_requests', all); toast('Done'); draw(); P.refreshNav();
      };
    },

    /* ---------- classes (what students can buy) ---------- */
    classes() {
      const st = { y: ss('lms_cy', '2027'), edit: null };
      const get = () => JSON.parse(JSON.stringify(classes()));
      const save = l => { P.put('lms_classes', { list: l }); window.dispatchEvent(new Event('lms-data')); };
      const mLabel = m => { const [y, mo] = String(m).split('-'); return (MN[+mo - 1] || m) + ' ' + y; };
      const draw = () => {
        const l = get().filter(c => String(c.year) === st.y).sort((a, b) => String(b.month).localeCompare(String(a.month)) || a.title.localeCompare(b.title));
        $('#cl2').innerHTML = l.map(c => `<div class="r"><span><b>${esc(c.title)}</b> <span class="chip2">${esc(c.mode)}</span><br><small>${esc(mLabel(c.month))} · LKR ${Number(c.fee || 0).toLocaleString('en-US')} · ${c.validDays ? c.validDays + ' days' : 'no limit'}${c.includes && c.includes.zoom ? ' · Zoom' : ''}${c.includes && c.includes.video ? ' · Recordings' : ''}</small></span><span class="nw"><button class="ghost" data-e="${esc(c.id)}">Edit</button> <button class="red" data-x="${esc(c.id)}">Delete</button></span></div>`).join('') || '<p class="empty">No classes for this year.</p>';
      };
      const form = c => {
        c = c || { id: '', mode: 'physical', year: st.y, month: P.ymd().slice(0, 7), title: '', fee: '', validDays: 31, notice: '', instructions: '', includes: { zoom: false, video: true }, photo: '' };
        $('#cf2').innerHTML = card(c.id ? 'Edit class' : 'Add a class', `<div class="row2">${sel('fm', [['physical', 'Physical students'], ['online', 'Online students']], c.mode)}${sel('fy', YEARS.map(y => [y, 'A/L ' + y]), c.year)}</div>
          <label class="lb">Month<input type="month" id="fmo" value="${esc(c.month)}"></label><input type="text" id="ft" placeholder="Title, e.g. October Payment / Theory + Revision / Masterclass" value="${esc(c.title)}">
          <div class="row2"><input type="number" id="ffee" placeholder="Fee (LKR)" min="0" value="${esc(c.fee)}"><input type="number" id="fv" placeholder="Valid days after approval (0 = no limit)" min="0" value="${esc(c.validDays)}"></div>
          <textarea id="fno" rows="2" placeholder="Physical: notice for students">${esc(c.notice || '')}</textarea><textarea id="fi" rows="3" placeholder="Online: instructions, one line each">${esc(c.instructions || '')}</textarea>
          <div class="chk2"><label><input type="checkbox" id="fz"${c.includes && c.includes.zoom ? ' checked' : ''}> Includes live Zoom</label><label><input type="checkbox" id="fr"${c.includes && c.includes.video ? ' checked' : ''}> Includes recordings</label></div>
          <label class="lb">Cover photo (optional)<input type="file" id="fp" accept="image/*"></label><div id="fpv">${c.photo ? `<img class="slip" src="${esc(c.photo)}" alt="">` : ''}</div>
          <div class="msg" id="fe"></div><button class="gold" id="fs">${c.id ? 'Save changes' : 'Add class'}</button> <button class="ghost" id="fc">Cancel</button>`);
        $('#cf2').dataset.photo = c.photo || ''; $('#cf2').dataset.id = c.id || ''; $('#cf2').scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      $('#view').innerHTML = card('Classes', `<p class="hint">These are the classes students see in the Lesson Store. Each class belongs to one A/L year, so 2027, 2028 and 2029 students never see each other's classes.</p><div class="row2">${sel('cy', YEARS.map(y => [y, 'A/L ' + y]), st.y)}<button class="gold" id="ca">+ Add a class</button></div><div id="cl2"></div>`) + '<div id="cf2"></div>';
      draw();
      $('#view').onchange = async e => {
        if (e.target.id === 'cy') { st.y = e.target.value; ssSet('lms_cy', st.y); draw(); }
        if (e.target.id === 'fp' && e.target.files[0]) { try { const d = await P.photo(e.target.files[0]); $('#cf2').dataset.photo = d; $('#fpv').innerHTML = `<img class="slip" src="${d}" alt="">`; } catch (x) { toast('Could not read the photo'); } }
      };
      $('#view').onclick = e => {
        const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
        if (b.id === 'ca') return form(); if (b.id === 'fc') return $('#cf2').innerHTML = '';
        if (d.e) return form(get().find(c => c.id === d.e));
        if (d.x) { const l = get(), c = l.find(x => x.id === d.x); if (c && confirm('Delete "' + c.title + '"? Payments already made for it stay in the Payments list.')) { save(l.filter(x => x.id !== d.x)); toast('Deleted'); draw(); } return; }
        if (b.id === 'fs') {
          const t = val('ft'), mo = val('fmo'), fee = +val('ffee'), vd = +val('fv') || 0; if (!t) return $('#fe').textContent = 'Write a title.'; if (!/^\d{4}-\d{2}$/.test(mo)) return $('#fe').textContent = 'Choose the month.'; if (!(fee >= 0)) return $('#fe').textContent = 'Enter the fee.';
          const l = get(), id = $('#cf2').dataset.id, old = l.find(x => x.id === id) || {}, mode = val('fm');
          const c = Object.assign({}, old, { id: id || (mode[0] + val('fy').slice(2) + '-' + t.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 10) + '-' + P.uid().slice(-4)), mode, year: val('fy'), month: mo, title: t, fee, validDays: vd, photo: $('#cf2').dataset.photo || '', notice: val('fno'), instructions: val('fi'), includes: { zoom: $('#fz').checked, video: $('#fr').checked } });
          if (id) l[l.findIndex(x => x.id === id)] = c; else l.push(c);
          save(l); st.y = c.year; ssSet('lms_cy', st.y); toast('Saved'); V.classes();
        }
      };
    },

    /* ---------- Zoom + recordings, separate for every class (so every year) ---------- */
    live() {
      const st = { y: ss('lms_ly', '2027'), c: ss('lms_lc', '') };
      const sesOf = c => { const m = P.ls('lms_sessions', {}); return JSON.parse(JSON.stringify((m[c.id] && m[c.id].list) || c.sessions || [])); };
      const saveS = (c, list) => { const m = P.ls('lms_sessions', {}); m[c.id] = { list }; P.put('lms_sessions', m); window.dispatchEvent(new Event('lms-data')); };
      const cl = () => classes().filter(c => String(c.year) === st.y).sort((a, b) => String(b.month).localeCompare(String(a.month)));
      const draw = () => {
        const list = cl(); if (!list.some(c => c.id === st.c)) st.c = list[0] ? list[0].id : '';
        const c = list.find(x => x.id === st.c);
        $('#lc').innerHTML = list.length ? sel('lcs', list.map(x => [x.id, cTitle(x)]), st.c) : '<p class="empty">No classes for this year yet. Add one in the Classes tab.</p>';
        if (!c) return $('#ls').innerHTML = '';
        const ses = sesOf(c);
        $('#ls').innerHTML = `<p class="hint">You are editing <b>${esc(cTitle(c))}</b> (A/L ${esc(c.year)}). Only students of this year who paid for this class see these.</p>` + ses.map((s, i) => { const z = s.zoom || {};
          return `<article class="pc"><header><div><b>${esc(s.title)}</b><small>${(s.recordings || []).length} recordings</small></div><button class="red" data-ds="${i}">Delete session</button></header>
          <h4>Live Zoom</h4><input type="text" id="zl${i}" placeholder="Zoom link https://zoom.us/j/..." value="${esc(z.link || '')}"><div class="row2"><label class="lb">Starts<input type="datetime-local" id="zs${i}" value="${esc(z.start || '')}"></label><input type="number" id="zm${i}" placeholder="Minutes" min="10" value="${esc(z.minutes || 150)}"></div><input type="text" id="zp${i}" placeholder="Passcode (optional)" value="${esc(z.passcode || '')}"><textarea id="zn${i}" rows="2" placeholder="Notice shown with the Zoom card">${esc(z.notice || '')}</textarea><div class="acts"><button class="gold" data-zs="${i}">Save Zoom</button><button class="ghost" data-zc="${i}">Remove link</button></div>
          <h4>Recordings</h4>${(s.recordings || []).map((r, j) => `<div class="r"><span><b>${esc(r.title || 'Untitled')}</b><br><small>${esc(r.url)}${r.date ? ' · ' + esc(r.date) : ''}</small></span><button class="red" data-rd="${i}|${j}">Delete</button></div>`).join('') || '<p class="empty">No recordings yet.</p>'}
          <input type="text" id="yu${i}" placeholder="YouTube link"><input type="text" id="yt${i}" placeholder="Title (optional: the YouTube title is used if empty)"><button class="gold" data-ya="${i}">Add recording</button></article>`; }).join('')
          + card('Add a session', `<input type="text" id="ns" placeholder="Session name, e.g. Theory Class / Revision Class"><button class="gold" data-ns="1">Add session</button>`);
      };
      $('#view').innerHTML = card('Zoom links and recordings', `<div class="row2">${sel('ly', YEARS.map(y => [y, 'A/L ' + y]), st.y)}<div id="lc"></div></div><div id="ls"></div>`); draw();
      $('#view').onchange = e => { if (e.target.id === 'ly') { st.y = e.target.value; ssSet('lms_ly', st.y); draw(); } if (e.target.id === 'lcs') { st.c = e.target.value; ssSet('lms_lc', st.c); draw(); } };
      $('#view').onclick = e => {
        const b = e.target.closest('button'); if (!b) return; const d = b.dataset, c = cl().find(x => x.id === st.c); if (!c) return; const ses = sesOf(c), done = m => { saveS(c, ses); toast(m); draw(); };
        if (d.ns) { const n = val('ns'); if (!n) return toast('Write a session name'); ses.push({ id: P.uid(), title: n, zoom: {}, recordings: [] }); return done('Session added'); }
        if (d.ds != null) { if (!confirm('Delete this session and all its recordings?')) return; ses.splice(+d.ds, 1); return done('Deleted'); }
        if (d.zs != null) { const i = +d.zs, l = val('zl' + i); if (l && !/^https:\/\//i.test(l)) return toast('The Zoom link must start with https://'); ses[i].zoom = { link: l, start: val('zs' + i), minutes: +val('zm' + i) || 150, passcode: val('zp' + i), notice: val('zn' + i) }; return done('Zoom saved. Students are notified.'); }
        if (d.zc != null) { ses[+d.zc].zoom = Object.assign({}, ses[+d.zc].zoom, { link: '' }); return done('Link removed'); }
        if (d.ya != null) { const i = +d.ya, u = val('yu' + i); if (!/^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(u)) return toast('Enter a YouTube link'); (ses[i].recordings = ses[i].recordings || []).unshift({ url: u, title: val('yt' + i), thumb: '', date: P.ymd() }); return done('Recording added. Students are notified.'); }
        if (d.rd) { const [i, j] = d.rd.split('|'); ses[+i].recordings.splice(+j, 1); return done('Deleted'); }
      };
    },

    /* ---------- give access (the invited person's details go to the Owner Panel) ---------- */
    access() {
      const list = S.db().list.filter(x => x.role !== 'owner');
      $('#view').innerHTML = card('Give access to someone', `<p class="hint">They log in with their own email and see an Accept bar. Their name, NIC and photos go straight to the owner for checking. You never see them.</p>
        <input type="email" id="aE" placeholder="Their email (the one they registered with)"><select id="aR" class="fi"><option value="admin">Admin Panel (everything on this page)</option><option value="analyze">Students and marks only</option></select>
        <input type="text" id="aP" placeholder="One-time access password (tell it to them yourself)"><div id="aPerm" class="chk2">${Object.keys(S.PERMS).map(k => `<label><input type="checkbox" data-p="${k}" checked> ${esc(S.PERMS[k])}</label>`).join('')}</div><div class="msg" id="aM"></div><button class="gold" id="aG">Send invite</button>`)
        + card('People with access', list.map(x => `<div class="r"><span><b>${esc(x.email)}</b> <span class="chip2">${esc(x.role)}</span> <span class="chip2">${esc(x.status)}</span>${x.by ? `<br><small>invited by ${esc(x.by)}</small>` : ''}</span></div>`).join('') || '<p class="empty">Nobody yet.</p>') + '<p class="hint">Only the owner can remove access.</p>';
      $('#view').onclick = async e => {
        if (!e.target.closest('#aG')) return;
        const perms = {}; document.querySelectorAll('#aPerm [data-p]').forEach(c => perms[c.dataset.p] = c.checked);
        const r = await S.invite(val('aR') || $('#aR').value, val('aE'), $('#aP').value, perms);
        if (r === 'ok') { toast('Invite sent'); V.access(); } else $('#aM').textContent = r;
      };
    },

    mail() {
      const q = S.reqs().find(x => x.old === M.email);
      $('#view').innerHTML = card('Change my access email', `<small>Current: ${esc(M.email)}</small>${q ? `<div class="warn">Waiting for the owner to allow: ${esc(q.nu)}</div>` : ''}<input type="email" id="eN" placeholder="New email"><div class="msg" id="eM"></div><button class="gold" id="eG">Send request</button>`);
      $('#view').onclick = e => { if (!e.target.closest('#eG')) return; const r = S.reqEmail(M.email, val('eN')); if (r === 'ok') { toast('Request sent'); V.mail(); } else $('#eM').textContent = r; };
    },
    scan() { $('#view').innerHTML = card('QR Scanner', `<p>Scan a student's QR code (or type the Student ID) to see details, fees, last paper and attendance, and to mark attendance.</p><a class="gold lnk" href="scan.html">Open the scanner</a>`); }
  };

  function lightbox(src) {
    const o = document.createElement('div'); o.className = 'lbx'; o.innerHTML = `<img src="${esc(src)}" alt=""><button class="red" aria-label="Close">Close</button>`;
    o.onclick = () => o.remove(); document.body.appendChild(o);
  }

  const pm = M.perms || {}, A = !!M.admin;
  gate(() => P.init('ADMIN PANEL', [
    ['home', 'Overview', A],
    ['pay', 'Payments', A && pm.pay, cnt.pay],
    ['stu', 'Students & marks', (A && pm.analyze) || (!A && M.analyze)],
    ['cmp', 'Complaints', A && pm.contact, cnt.cmp],
    ['notice', 'Home notice', A && pm.notice],
    ['contact', 'Contact Us', A && pm.contact],
    ['live', 'Zoom & recordings', A && pm.links],
    ['classes', 'Classes', A && pm.classes],
    ['req', 'Requests', A, cnt.req],
    ['access', 'Give access', A],
    ['scan', 'QR scanner', A],
    ['mail', 'My email', !M.owner]
  ], V));
})();
