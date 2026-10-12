/* Home: time-based greeting + student ID card (layout lives in shell.js) */
(function () {
  const S = window.STU; if (!S) return;
  const $ = s => document.querySelector(s);
  const period = h => h >= 5 && h < 12 ? ['morning', 'Good morning,'] : h >= 12 && h < 16 ? ['afternoon', 'Good afternoon,']
    : h >= 16 && h < 19 ? ['evening', 'Good evening,'] : h >= 19 ? ['night', 'Good night,'] : ['early', 'Early morning,'];
  let cur = '';
  function tick() {
    const d = new Date(), [k, t] = period(d.getHours());
    if (k !== cur) { cur = k; $('#scene').innerHTML = SCENE[k]; $('#greet').textContent = t; }
    $('#when').textContent = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }) + '  ·  ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  $('#gname').innerHTML = window.LMS_CORE ? LMS_CORE.nameHtml((S.p.name || '').trim().split(/\s+/)[0] || '', S.sid) : esc((S.p.name || '').trim().split(/\s+/)[0] || '');
  window.addEventListener('lms-data', () => { $('#gname').innerHTML = LMS_CORE.nameHtml((S.p.name || '').trim().split(/\s+/)[0] || '', S.sid); });
  tick(); setInterval(tick, 30000);
  renderId();
})();
