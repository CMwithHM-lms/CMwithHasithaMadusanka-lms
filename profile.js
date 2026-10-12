/* My Profile: photo, details (view + edit switch + locks), change requests, QR code */
(function () {
  const S = window.STU; if (!S) return;
  const { p, phone, sid } = S, C = window.LMS_CONFIG, $ = s => document.querySelector(s);
  const msg = (el, t, ok) => { el.textContent = t; el.className = 'perr' + (ok ? ' ok' : ''); el.hidden = false; };

  /* ---------- photo (also shown in the top bar) ---------- */
  function avatar() {
    const a = $('#pav'); a.textContent = '';
    if (p.photo) { const i = new Image(); i.src = p.photo; i.alt = 'Profile photo'; a.appendChild(i); }
    else a.textContent = ((p.name || '?').trim()[0] || '?').toUpperCase();
    $('#rmPhoto').hidden = !p.photo; setAvatar();
  }
  $('#photoIn').onchange = e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    if (!/^image\//.test(f.type)) return toast('Please choose an image');
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        const s = Math.min(im.width, im.height), c = document.createElement('canvas'); c.width = c.height = 320;
        c.getContext('2d').drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 320, 320);
        const old = p.photo; p.photo = c.toDataURL('image/jpeg', .86);
        if (!S.save()) { p.photo = old; return toast('Photo is too large to save'); }
        avatar(); hero(); toast('Photo updated');
      };
      im.onerror = () => toast('Could not read that image'); im.src = r.result;
    };
    r.readAsDataURL(f);
  };
  $('#rmPhoto').onclick = () => { delete p.photo; S.save(); avatar(); hero(); toast('Photo removed'); };

  /* ---------- hero + completion ---------- */
  const CHECK = [['photo', 'Photo'], ['name', 'Name'], ['school', 'School'], ['district', 'District'], ['town', 'Town'], ['email', 'Email'], ['address', 'Address'], ['whatsapp', 'WhatsApp'], ['phone2', 'Additional phone'], ['nic', 'NIC number'], ['attempt', 'Attempt'], ['institute', 'Institute'], ['year', 'A/L year']];
  function hero() {
    const miss = CHECK.filter(([k]) => !p[k]), pc = Math.round((CHECK.length - miss.length) / CHECK.length * 100);
    $('#pring').style.setProperty('--pc', pc);
    $('#pname').innerHTML = window.LMS_CORE ? LMS_CORE.nameInline(p.name || '', sid) : esc(p.name || '');
    $('#psub').textContent = p.email || '';
    const since = new Date(p.created || Date.now()).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    $('#pchips').innerHTML = [['A/L', p.year], ['Attempt', p.attempt], ['ID', sid], ['Member since', since]].filter(c => c[1]).map(([k, v]) => `<span class="pchip">${k} <b>${esc(v)}</b></span>`).join('');
    $('#pcomp').innerHTML = `<b>${pc}%</b> complete` + (miss.length ? ` · Add ${miss.slice(0, 2).map(x => x[1]).join(', ')}` : '');
    verifiedChip();
  }
  /* blue tick: beside the name (above) and as a clear "Verified student" line once the student has earned it */
  function verifiedChip() {
    const K = window.LMS_CORE, el = $('#pver'); if (!K || !el) return;
    const v = K.verifiedList().find(x => x.sid === sid);
    el.hidden = !v;
    if (!v) { el.innerHTML = ''; return; }
    const when = v.date ? new Date(v.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    el.innerHTML = K.tickAlways('big') + `<span><b>Verified student</b><small>${v.manual ? 'Verified by your teacher' : 'Scored ' + K.VERIFY + '+ in ' + esc(v.paper || 'a paper')}${when ? ' · ' + when : ''}</small></span>`;
  }
  window.addEventListener('lms-data', () => { hero(); });

  /* ---------- details ---------- */
  const F = [
    { k: 'name', l: 'Full Name', i: 'profile' },
    { k: 'phone', l: 'Phone Number (Login)', i: 'call', lock: 1 },
    { k: 'phone2', l: 'Additional Phone Number', i: 'call', t: 'tel', ph: '07XXXXXXXX', note: '(Tute Courier කිරීමේදී පහසුව සඳහා)' },
    { k: 'email', l: 'Email', i: 'mail', t: 'email', once: 1 },
    { k: 'nic', l: 'NIC Number', i: 'idcard', t: 'nic', once: 1, ph: '912345678V or 200012345678' },
    { k: 'year', l: 'A/L Year', i: 'cal', t: 'year', once: 1 },
    { k: 'attempt', l: 'Attempt', i: 'star', t: 'attempt', once: 1 },
    { k: 'institute', l: 'Institute', i: 'classes', t: 'inst', once: 1 },
    { k: 'school', l: 'School', i: 'school' },
    { k: 'district', l: 'District', i: 'pin', t: 'district', once: 1 },
    { k: 'town', l: 'Town', i: 'pin', once: 1, ph: 'Your town' },
    { k: 'address', l: 'Address', i: 'pin', t: 'area' },
    { k: 'whatsapp', l: 'WhatsApp Number', i: 'wa', t: 'tel', ph: '07XXXXXXXX' }
  ];
  const OPT = { district: DISTRICTS, attempt: ['1st Shy', '2nd Shy', '3rd Shy'], year: ['2026', '2027', '2028', '2029'], inst: Object.keys(C.institutes) };
  const locked = f => f.lock || (f.once && !!p[f.k]);
  let editing = false;
  function input(f) {
    const v = p[f.k] || '';
    if (OPT[f.t]) return `<select class="fi" id="f_${f.k}"><option value="">Select</option>${OPT[f.t].map(o => `<option${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    if (f.t === 'area') return `<textarea class="fi" id="f_${f.k}" rows="2" maxlength="200">${esc(v)}</textarea>`;
    const ty = f.t === 'tel' ? 'tel' : f.t === 'email' ? 'email' : 'text';
    return `<input class="fi" id="f_${f.k}" type="${ty}" value="${esc(v)}" placeholder="${esc(f.ph || '')}"${f.t === 'tel' ? ' inputmode="numeric" maxlength="10"' : ''}${f.t === 'nic' ? ' maxlength="12" autocapitalize="characters"' : ''}>`;
  }
  function rows() {
    $('#rows').innerHTML = F.map(f => {
      const lk = locked(f), ed = editing && !lk, v = p[f.k];
      const body = ed ? input(f) : `<b class="${v ? '' : 'nv'}">${v ? esc(v) : (lk ? '-' : 'Not added')}</b>`;
      return `<div class="pr${ed ? ' ed' : ''}${!v && !lk ? ' todo' : ''}">${ic(f.i)}<div class="pv"><small>${f.l}</small>${body}${f.note ? `<em class="pn">${f.note}</em>` : ''}</div>${lk ? `<span class="lk" title="Locked">${ic('lock')}</span>` : ''}</div>`;
    }).join('');
    $('#pact').hidden = !editing; $('#perr').hidden = true;
  }
  $('#sw').onchange = e => { editing = e.target.checked; rows(); };
  $('#save').onclick = () => {
    document.querySelectorAll('.fi.bad').forEach(x => x.classList.remove('bad'));
    const out = {}; let err = false;
    const bad = (k, t) => { if (err) return; err = true; const el = $('#f_' + k); el.classList.add('bad'); el.focus(); msg($('#perr'), t); };
    F.forEach(f => {
      const el = !locked(f) && $('#f_' + f.k); if (!el || err) return;
      let v = el.value.trim(); const k = f.k;
      if (f.t === 'tel') v = v.replace(/\D/g, '');
      if (f.t === 'nic') v = v.toUpperCase();
      if (k === 'name' && v.length < 2) return bad(k, 'Enter your full name.');
      if (k === 'school' && v.length < 2) return bad(k, 'Enter your school.');
      if (k === 'address' && v.length < 8) return bad(k, 'Enter your full address.');
      if (k === 'whatsapp' && !/^0\d{9}$/.test(v)) return bad(k, 'Enter a valid WhatsApp number.');
      if (k === 'phone2' && v && !/^0\d{9}$/.test(v)) return bad(k, 'Enter a valid phone number.');
      if (k === 'phone2' && v === phone) return bad(k, 'Use a number different from your login number.');
      if (k === 'nic' && v && !/^(\d{9}[VX]|\d{12})$/.test(v)) return bad(k, 'Enter a valid NIC, e.g. 912345678V or 200012345678.');
      if (k === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return bad(k, 'Enter a valid email.');
      if (k === 'town' && v && v.length < 2) return bad(k, 'Enter your town.');
      out[k] = v;
    });
    if (err) return;
    const newly = [];
    F.forEach(f => {
      if (!(f.k in out)) return;
      if (out[f.k] === '') { if (f.k === 'phone2') delete p.phone2; return; }
      if (f.once && !p[f.k]) newly.push(f.l);
      p[f.k] = out[f.k];
    });
    if (!S.save()) return msg($('#perr'), 'Could not save. Try again.');
    decorateMenu(); $('#mMail').textContent = p.email || ''; setAvatar();
    editing = false; $('#sw').checked = false; hero(); avatar(); rows(); qrCard();
    toast(newly.length ? newly.join(', ') + ' saved and locked' : 'Profile updated');
  };

  /* ---------- change requests (admin reviews these) ---------- */
  const RQF = [['email', 'Email'], ['nic', 'NIC Number'], ['district', 'District'], ['town', 'Town'], ['year', 'A/L Year'], ['attempt', 'Attempt (Shy)'], ['institute', 'Institute'], ['phone', 'Login Phone Number']];
  const getRq = () => { try { return JSON.parse(localStorage.getItem('lms_requests') || '[]'); } catch (e) { return []; } };
  function rqList() {
    const mine = getRq().filter(r => r.sid === sid).slice(-4).reverse();
    $('#rqList').innerHTML = mine.map(r => `<div class="rq"><span><b>${esc(r.label)}</b><small>${esc(r.value)} · ${new Date(r.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small></span><em class="rchip ${esc(r.status)}">${esc(r.status).toUpperCase()}</em></div>`).join('');
  }
  $('#rqField').innerHTML = RQF.map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
  const sheet = $('#sheet'), openSheet = o => { sheet.hidden = !o; if (o) { $('#rqErr').hidden = true; $('#rqVal').focus(); } };
  $('#rqBtn').onclick = () => openSheet(true);
  $('#rqX').onclick = () => openSheet(false);
  sheet.addEventListener('pointerdown', e => { if (e.target === sheet) openSheet(false); });
  $('#rqGo').onclick = () => {
    const k = $('#rqField').value, v = $('#rqVal').value.trim(), why = $('#rqWhy').value.trim();
    if (v.length < 2) return msg($('#rqErr'), 'Enter the new value.');
    if (why.length < 5) return msg($('#rqErr'), 'Add a short reason.');
    const rq = getRq(), lb = RQF.find(x => x[0] === k)[1];
    rq.push({ id: Date.now().toString(36), sid, phone, name: p.name, field: k, label: lb, current: p[k] || '', value: v, reason: why, status: 'pending', created: Date.now() });
    try { localStorage.setItem('lms_requests', JSON.stringify(rq)); } catch (e) { return msg($('#rqErr'), 'Could not save. Try again.'); }
    $('#rqVal').value = ''; $('#rqWhy').value = ''; openSheet(false); rqList(); toast('Request sent to admin');
  };

  /* ---------- password note ---------- */
  $('#pwReset').onclick = () => { try { localStorage.removeItem('lms_session'); } catch (e) {} location.href = 'reset.html'; };

  /* ---------- Telegram (never locked: connect, change or disconnect any time) ---------- */
  const tgBox = $('#tgView'), K = window.LMS_CORE;
  $('#tgLogo').innerHTML = BRAND.telegram;
  let tgEdit = false, tgAsk = false, tgBusy = false, tgMsg = '';
  const tgDate = t => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  function tgDraw() {
    const u = p.telegram;
    $('#tgSt').className = 'tgst' + (u ? ' on' : '');
    $('#tgSt').textContent = u ? 'CONNECTED' : 'NOT CONNECTED';
    if (u && !tgEdit) {
      tgBox.innerHTML = `<div class="tgrow">${BRAND.telegram}<div class="tgm"><b>@${esc(u)}</b><small>${p.telegramAt ? 'Connected ' + tgDate(p.telegramAt) : 'Connected'}</small></div>
        <a class="tgopen" href="https://t.me/${esc(u)}" target="_blank" rel="noopener noreferrer" aria-label="Open @${esc(u)} in Telegram"><i data-ic="ext"></i></a></div>
        ${tgAsk ? `<p class="note tgq">Disconnect @${esc(u)} from your account?</p><div class="tgbtns"><button class="ghost" id="tgNo">Keep it</button><button class="tgdanger" id="tgYes">Disconnect</button></div>`
          : `<div class="tgbtns"><button class="ghost" id="tgChange"><i data-ic="profile"></i>Change</button><button class="ghost" id="tgOff"><i data-ic="cross"></i>Disconnect</button></div>`}`;
    } else {
      tgBox.innerHTML = `<p class="note">${u ? 'Enter the new username. Your current one stays connected until the new one is accepted.' : 'Connect your Telegram so the admin can reach you. You can change or remove it whenever you like.'}</p>
        <div class="pf"><label for="tgIn">Telegram username</label>
          <div class="tgin${tgMsg ? ' bad' : ''}"><span>@</span><input id="tgIn" class="fi" type="text" inputmode="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="60" placeholder="your_username" aria-describedby="tgErr"><i class="tgok" data-ic="check"></i></div></div>
        <div class="perr" id="tgErr" role="alert"${tgMsg ? '' : ' hidden'}>${esc(tgMsg)}</div>
        <div class="tgbtns"><button class="gold" id="tgGo"><i data-ic="link"></i><span>${tgBusy ? 'Checking…' : 'Connect'}</span></button>${u ? '<button class="ghost" id="tgCancel">Cancel</button>' : ''}</div>`;
      const inp = $('#tgIn'), box = inp.parentElement;
      inp.addEventListener('input', () => {
        const x = K.tgClean(inp.value); box.classList.toggle('good', !!x && !K.tgFormat(x)); box.classList.remove('bad');
        const e = $('#tgErr'); if (e) e.hidden = true; tgMsg = '';
      });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); tgConnect(); } });
      $('#tgGo').onclick = tgConnect;
      if (u) $('#tgCancel').onclick = () => { tgEdit = false; tgMsg = ''; tgDraw(); };
    }
    renderIcons(tgBox);
    const g = id => $(id) ? $(id) : null;
    if (g('#tgChange')) $('#tgChange').onclick = () => { tgEdit = true; tgAsk = false; tgDraw(); $('#tgIn').focus(); };
    if (g('#tgOff')) $('#tgOff').onclick = () => { tgAsk = true; tgDraw(); };
    if (g('#tgNo')) $('#tgNo').onclick = () => { tgAsk = false; tgDraw(); };
    if (g('#tgYes')) $('#tgYes').onclick = () => {
      const old = { u: p.telegram, t: p.telegramAt }; delete p.telegram; delete p.telegramAt;
      if (!S.save()) { p.telegram = old.u; p.telegramAt = old.t; return toast('Could not save. Try again.'); }
      tgAsk = false; tgDraw(); toast('Telegram disconnected');
    };
  }
  async function tgConnect() {
    if (tgBusy) return;
    const inp = $('#tgIn'), raw = inp.value; tgBusy = true; $('#tgGo').disabled = true; $('#tgGo span').textContent = 'Checking…';
    const r = await K.tgCheck(raw, phone); tgBusy = false;
    if (!r.ok) { tgMsg = r.msg; tgDraw(); const i = $('#tgIn'); i.value = raw; i.focus(); return; }   // wrong username: nothing is connected
    const old = { u: p.telegram, t: p.telegramAt }; p.telegram = r.user; p.telegramAt = Date.now();
    if (!S.save()) { p.telegram = old.u; p.telegramAt = old.t; tgMsg = 'Could not save. Try again.'; tgDraw(); return; }
    tgEdit = false; tgMsg = ''; tgDraw(); toast('Telegram connected: @' + r.user);
  }
  tgDraw();

  /* ---------- QR code ---------- */
  const payload = ((C.qr && C.qr.prefix) || 'LMS:') + sid;
  function qrCard() {
    $('#qrbox').innerHTML = QR.svg(payload);
    $('#qid').textContent = sid;
    $('#qrinfo').innerHTML = [['Student', p.name, 1], ['A/L Year', p.year], ['Attempt', p.attempt], ['Institute', p.institute, 1]]
      .map(([k, v, s]) => `<div${s ? ' class="s2"' : ''}><small>${k}</small><b>${esc(v || '-')}</b></div>`).join('');
  }
  $('#qrSave').onclick = () => {
    const c = document.createElement('canvas'); c.width = 640; c.height = 860; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, 640, 860); QR.draw(x, payload, 40, 40, 560);
    x.textAlign = 'center'; x.fillStyle = '#0d0824'; x.font = '700 34px Inter, Arial, sans-serif'; x.fillText(p.name || '', 320, 650, 560);
    x.fillStyle = '#6b6585'; x.font = '600 26px Inter, Arial, sans-serif';
    x.fillText('A/L ' + (p.year || '') + (p.attempt ? ' · ' + p.attempt : ''), 320, 700, 560);
    x.fillText(p.institute || '', 320, 744, 560); x.fillText('ID ' + sid, 320, 790);
    c.toBlob(b => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'student-qr-' + sid + '.png';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('QR image saved');
    });
  };

  avatar(); hero(); rows(); rqList(); qrCard();
})();
