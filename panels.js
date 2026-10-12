/* Tute tracking + Achievements */
(function () {
  const S = window.STU; if (!S) return;
  const C = window.LMS_CONFIG, $ = s => document.querySelector(s);

  /* tute tracking: visible to everyone; active only after admin confirms */
  const r = (C.tute || {})[S.sid], st = r ? (r.confirmed ? 'active' : 'pending') : 'locked';
  const M = {
    active: ['ACTIVE', 'ok', 'Your tute parcel is on its way. Follow every stage below.'],
    pending: ['PENDING', 'wait', 'Waiting for admin confirmation. Tracking starts once your payment is verified.'],
    locked: ['LOCKED', 'lock', 'Tute tracking is available for Online Lesson Store students.']
  }[st];
  $('#tute').dataset.state = st;
  $('#tuteChip').innerHTML = (st === 'locked' ? ic('lock') : '') + M[0];
  $('#tuteChip').className = 'chip ' + M[1];
  const stage = st === 'active' ? (r.stage || 1) : 0;
  document.querySelectorAll('#steps .st').forEach((el, i) => el.classList.toggle('done', i < stage));
  if (st === 'active') {
    $('#cbtn').hidden = false;
    $('#cinfo').innerHTML = [['Courier ID', r.courierId], ['Courier', r.courier], ['Center', r.center], ['Updated', r.updated]]
      .map(([k, v]) => `<div><small>${k}</small><b>${esc(v || '-')}</b></div>`).join('');
    $('#cbtn').onclick = () => { $('#cinfo').hidden = !$('#cinfo').hidden; };
  }

  /* achievements */
  /* medals the system gives by itself (blue tick, island top 3) + the ones the teacher adds in config */
  const A = [];
  const K = window.LMS_CORE;
  if (K) {
    const vv = K.verifiedList().find(v => v.sid === S.sid);
    if (vv) A.push({ title: 'Blue Tick', note: vv.manual ? 'Verified by your teacher' : 'Scored ' + K.VERIFY + '+ in a paper', date: vv.date || '', type: 'blue', icon: 'verified' });
    const T = K.top3(String(S.p.year || '2027')), mine = T.list.find(e => e.sid === S.sid);
    if (mine) A.push({ title: ['Gold', 'Silver', 'Bronze'][mine.rank - 1] + ' Medal', note: 'Island #' + mine.rank + ' · ' + T.paper.replace(/^\d{4}\s+/, ''), date: '', type: ['gold', 'silver', 'bronze'][mine.rank - 1], icon: 'medal' });
  }
  A.push(...((C.achievements || {})[S.sid] || (C.achievements || {})['*'] || []));
  $('#achCount').textContent = A.length + (A.length === 1 ? ' achievement earned' : ' achievements earned');
  $('#ach').innerHTML = A.length
    ? A.map((a, i) => `<div class="medal ${esc(a.type || 'gold')}" style="animation-delay:${i * 90}ms"><span class="mc">${ic(a.icon || 'star')}</span><b>${esc(a.title)}</b><small>${esc(a.note || '')}</small><em>${esc(a.date || '')}</em></div>`).join('')
    : '<p class="empty">Your achievements will appear here.</p>';
  $('#achMore').onclick = () => { const u = (C.routes || {}).achievements; if (u) location.href = u; else window.toast('Coming soon'); };
})();
