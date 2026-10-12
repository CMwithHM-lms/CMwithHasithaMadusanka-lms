/* Contact Us: Telegram + WhatsApp contacts, notice, Telegram channels, complaints, FAQ.
   Everything the admin controls comes from LMS_CORE.contact() (see core.js). Admin edits are saved there,
   so students only ever read it. The complaint form writes to 'lms_complaints' with the full student details. */
(function () {
  const S = window.STU, K = window.LMS_CORE, C = window.LMS_CONFIG || {};
  if (!S || !K) return;
  const { p, sid, phone } = S, $ = s => document.querySelector(s);
  const MAX_WORDS = 2000, MIN_WORDS = 5, COOLDOWN = 30, DAILY = 5;
  const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const words = t => (String(t || '').match(/\S+/g) || []).length;
  const fmtNum = n => n.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3');
  const dshort = t => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const brand = n => `<span class="ctlogo">${BRAND[n]}</span>`;
  const copy = (v, ok) => {
    const done = () => toast(ok), fail = () => toast(v);
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(v).then(done, fail);
    else { try { const t = document.createElement('textarea'); t.value = v; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); done(); } catch (e) { fail(); } }
  };

  /* ---------- animated title ---------- */
  (function () {
    const h = $('#cttitle'), txt = h.getAttribute('aria-label') || h.textContent;
    h.innerHTML = [...txt].map((c, i) => c === ' ' ? ' ' : `<span class="lt" style="--i:${i}" aria-hidden="true">${esc(c)}</span>`).join('');
    setTimeout(() => h.classList.add('done'), 150 + txt.length * 70 + 800);
  })();

  /* ---------- section header ---------- */
  const head = (id, cls, icon, title, sub, n) =>
    `<div class="cth"><span class="cti ${cls}">${icon}</span><div><h2 id="${id}">${title}</h2>${sub ? `<small>${sub}</small>` : ''}</div>${n != null ? `<em class="ctn">${n}</em>` : ''}</div>`;
  const empty = t => `<p class="ctempty">${t}</p>`;

  /* ---------- admin-controlled lists ---------- */
  function renderAll() {
    const d = K.contact();

    // quick strip: hotline + support hours
    const ph = (d.phones || []).map(x => ({ n: K.waNorm(x.number), l: x.label })).filter(x => x.n), hot = (C.brand || {}).hotline;
    const calls = ph.length ? ph : (hot ? [{ n: hot, l: '' }] : []);
    $('#ctquick').innerHTML =
      calls.map(x => `<a class="ctq call" href="tel:${esc(x.n)}"><i data-ic="phone"></i><span><small>${esc(x.l || 'Hotline')}</small><b>${esc(fmtNum(x.n))}</b></span></a>`).join('') +
      (d.hours ? `<div class="ctq"><i data-ic="clock"></i><span><small>Support hours</small><b>${esc(d.hours)}</b></span></div>` : '');

    // Telegram usernames
    const tg = d.telegram.filter(x => x && !K.tgFormat(K.tgClean(x.user)));
    $('#barTg').innerHTML = head('hTg', 'ic-tg', brand('telegram'), 'Telegram', 'Message an admin directly', tg.length) +
      (tg.length ? `<ul class="ctlist">${tg.map(x => { const u = K.tgClean(x.user); return `<li class="ctrow">
        ${brand('telegram')}
        <div class="ctmain"><b>@${esc(u)}</b>${x.label ? `<small>${esc(x.label)}</small>` : ''}</div>
        <div class="ctact"><button class="ctic" type="button" data-copy="@${esc(u)}" data-ok="Username copied" aria-label="Copy @${esc(u)}"><i data-ic="copy"></i></button>
        <a class="ctgo tg" href="https://t.me/${esc(u)}" target="_blank" rel="noopener noreferrer"><span>Message</span><i data-ic="ext"></i></a></div></li>`; }).join('')}</ul>`
        : empty('No Telegram contacts yet. Please use WhatsApp for now.'));

    // WhatsApp numbers
    const wa = d.whatsapp.map(x => Object.assign({}, x, { n: K.waNorm(x.number) })).filter(x => x.n);
    const hello = encodeURIComponent('Hello, I am ' + (p.name || 'a student') + ' (Student ID ' + sid + '). ');
    $('#barWa').innerHTML = head('hWa', 'ic-wa', brand('whatsapp'), 'WhatsApp', 'Chat or call us', wa.length) +
      (wa.length ? `<ul class="ctlist">${wa.map(x => `<li class="ctrow">
        ${brand('whatsapp')}
        <div class="ctmain"><b>${esc(fmtNum(x.n))}</b>${x.label ? `<small>${esc(x.label)}</small>` : ''}</div>
        <div class="ctact"><button class="ctic" type="button" data-copy="${esc(x.n)}" data-ok="Number copied" aria-label="Copy ${esc(x.n)}"><i data-ic="copy"></i></button>
        <a class="ctgo wa" href="https://wa.me/94${esc(x.n.slice(1))}?text=${hello}" target="_blank" rel="noopener noreferrer"><span>Chat</span><i data-ic="ext"></i></a></div></li>`).join('')}</ul>`
        : empty('No WhatsApp numbers yet. Please call the hotline.'));

    // notice
    const nb = $('#barNotice'), n = d.notice || {};
    nb.hidden = !String(n.text || '').trim();
    if (!nb.hidden) nb.innerHTML = head('hNo', 'ic-no', '<i data-ic="bell"></i>', esc(n.title || 'Notice'), n.date ? 'Updated ' + esc(dshort(n.date)) : '') + `<p class="ctnote">${esc(n.text)}</p>`;

    // Telegram channels (only the admin can add these)
    const ch = d.channels.map(x => Object.assign({}, x, { u: K.chanUrl(x.url) })).filter(x => x.u && x.name);
    $('#barCh').innerHTML = head('hCh', 'ic-ch', brand('telegram'), 'Telegram Channels', 'Join to get updates first', ch.length) +
      (ch.length ? `<ul class="ctlist">${ch.map(x => `<li class="ctrow">
        ${brand('telegram')}
        <div class="ctmain"><b>${esc(x.name)}</b>${x.desc ? `<small>${esc(x.desc)}</small>` : ''}</div>
        <div class="ctact"><a class="ctgo tg" href="${esc(x.u)}" target="_blank" rel="noopener noreferrer"><span>Join</span><i data-ic="ext"></i></a></div></li>`).join('')}</ul>`
        : empty('No channels yet. New channels will appear here.'));

    // FAQ
    const fq = d.faqs.filter(x => x && x.q && x.a), fb = $('#barFaq');
    fb.hidden = !fq.length;
    if (fq.length) fb.innerHTML = head('hFaq', 'ic-fq', '<i data-ic="help"></i>', 'Quick answers', 'Maybe your question is already here') +
      `<div class="ctfaq">${fq.map(x => `<details><summary><span>${esc(x.q)}</span><i data-ic="chev"></i></summary><p>${esc(x.a)}</p></details>`).join('')}</div>`;

    renderIcons();
  }

  /* ---------- who is sending ---------- */
  function renderMe() {
    const av = p.photo ? `<img src="${esc(p.photo)}" alt="">` : esc(((p.name || '?').trim()[0] || '?').toUpperCase());
    $('#ctme').innerHTML = `<span class="ctav">${av}</span><div class="ctwho"><b>${K.nameHtml(p.name || '', sid)}</b>
      <small>ID ${esc(sid)}${p.institute ? ' · ' + esc(p.institute) : ''}</small>
      <small class="${p.telegram ? 'ok' : ''}">${p.telegram ? 'Telegram @' + esc(p.telegram) : 'Telegram not connected'}${p.telegram ? '' : ' · <a href="profile.html">Connect in My Profile</a>'}</small></div>`;
  }

  /* ---------- complaint form ---------- */
  const CATS = ['Payment or slip', 'Class, Zoom or recording', 'Tute delivery', 'Marks or papers', 'Website or technical problem', 'Teacher or staff conduct', 'Suggestion', 'Other'];
  $('#cmpCat').innerHTML = CATS.map(c => `<option>${esc(c)}</option>`).join('');
  const ta = $('#cmpText'), DK = 'lms_cmp_draft_' + sid, err = $('#cmpErr');
  const showErr = t => { err.textContent = t; err.hidden = !t; };
  const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(Math.max(ta.scrollHeight + 2, 168), 520) + 'px'; };
  function count() {
    const n = words(ta.value), el = $('#cmpCount');
    el.textContent = n.toLocaleString('en-US') + ' / ' + MAX_WORDS.toLocaleString('en-US') + ' words';
    el.className = n > MAX_WORDS ? 'bad' : n > MAX_WORDS * .9 ? 'warn' : '';
    ta.classList.toggle('bad', n > MAX_WORDS);
    return n;
  }
  let dt; const dEl = $('#cmpDraft');
  ta.addEventListener('input', () => {
    grow(); const n = count(); if (n <= MAX_WORDS) showErr('');
    clearTimeout(dt); dt = setTimeout(() => { dEl.textContent = ta.value.trim() ? (lsSet(DK, { t: ta.value, c: $('#cmpCat').value }) ? 'Draft saved on this device' : '') : ''; if (!ta.value.trim()) { try { localStorage.removeItem(DK); } catch (e) {} } }, 500);
  });
  { const dr = lsGet(DK, null); if (dr && dr.t) { ta.value = dr.t; if (CATS.includes(dr.c)) $('#cmpCat').value = dr.c; dEl.textContent = 'Draft restored'; } }
  grow(); count();

  const mine = () => K.complaints().filter(c => c.sid === sid);
  $('#cmpForm').addEventListener('submit', ev => {
    ev.preventDefault(); showErr('');
    const text = ta.value.trim(), n = words(text);
    if (n < MIN_WORDS) { ta.focus(); return showErr('Please write a little more so we can understand the problem (at least ' + MIN_WORDS + ' words).'); }
    if (n > MAX_WORDS) { ta.focus(); return showErr('Your complaint is ' + (n - MAX_WORDS).toLocaleString('en-US') + ' words too long. The limit is ' + MAX_WORDS.toLocaleString('en-US') + ' words.'); }
    const last = lsGet('lms_cmp_last_' + sid, 0), wait = Math.ceil(COOLDOWN - (Date.now() - last) / 1000);
    if (wait > 0) return showErr('Please wait ' + wait + ' seconds before sending another complaint.');
    if (mine().filter(c => Date.now() - c.created < 864e5).length >= DAILY) return showErr('You have already sent ' + DAILY + ' complaints today. Please wait for a reply.');
    const all = K.complaints(), rec = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ref: 'CMP-' + Date.now().toString(36).toUpperCase().slice(-6),
      sid, name: p.name || '', phone, whatsapp: p.whatsapp || '', email: p.email || '', telegram: p.telegram ? '@' + p.telegram : '',
      institute: p.institute || '', year: p.year || '', attempt: p.attempt || '', school: p.school || '', district: p.district || '', town: p.town || '',
      category: $('#cmpCat').value, text, words: n, status: 'new', reply: '', created: Date.now()
    };
    if (!K.addComplaint(rec)) return showErr('Could not save your complaint. Please try again.');
    lsSet('lms_cmp_last_' + sid, Date.now());
    ta.value = ''; try { localStorage.removeItem(DK); } catch (e) {} dEl.textContent = ''; grow(); count();
    renderHist(rec.id); $('#okRef').textContent = rec.ref; openOk(true);
  });

  /* ---------- my complaints ---------- */
  const ST = { new: ['RECEIVED', 'new'], review: ['IN REVIEW', 'review'], resolved: ['RESOLVED', 'done'] };
  function renderHist(openId) {
    const list = mine().reverse(), b = $('#barHist'); b.hidden = !list.length; if (!list.length) return;
    b.innerHTML = head('hHist', 'ic-hi', '<i data-ic="clock"></i>', 'My complaints', 'Replies from the admin appear here', list.length) +
      `<div class="cthist">${list.map(c => { const s = ST[c.status] || ST.new; return `<details${c.id === openId ? ' open' : ''}>
        <summary><span class="cthm"><b>${esc(c.ref)} · ${esc(c.category)}</b><small>${esc(dshort(c.created))} · ${c.words} words</small></span><em class="cts ${s[1]}">${s[0]}</em><i data-ic="chev"></i></summary>
        <div class="ctbody"><p>${esc(c.text)}</p>${c.reply ? `<div class="ctreply"><small>Reply from admin${c.repliedAt ? ' · ' + esc(dshort(c.repliedAt)) : ''}</small><p>${esc(c.reply)}</p></div>` : ''}</div></details>`; }).join('')}</div>`;
    renderIcons(b);
  }

  /* ---------- sent sheet ---------- */
  const sheet = $('#okSheet');
  function openOk(o) { sheet.hidden = !o; if (o) $('#okClose').focus(); }
  $('#okClose').onclick = () => openOk(false);
  sheet.addEventListener('pointerdown', e => { if (e.target === sheet) openOk(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) openOk(false); });

  /* copy buttons */
  document.addEventListener('click', e => { const b = e.target.closest('[data-copy]'); if (b) copy(b.dataset.copy, b.dataset.ok || 'Copied'); });

  /* stay live when the admin changes something in another tab */
  const refresh = () => { renderAll(); renderHist(); renderMe(); };
  window.addEventListener('lms-contact', refresh);
  window.addEventListener('lms-data', renderMe);
  window.addEventListener('storage', ev => { if (!ev.key || /^lms_(contact|complaints|profiles)$/.test(ev.key)) refresh(); });

  renderAll(); renderMe(); renderHist(); renderIcons();
})();
