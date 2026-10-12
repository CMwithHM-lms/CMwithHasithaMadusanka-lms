/* ===== LMS SETTINGS: ඕන දේ මෙතනින් වෙනස් කරන්න ===== */
window.LMS_CONFIG = {
  brand: {
    logo: 'logo.png',            // Combined Class logo (lms folder එකට logo.png කියලා දාන්න)
    hotline: '0712345678',       // Contact Hotline අංකය
    zoomLogo: ''                 // ඔයාගේම Zoom logo file එකක් දාන්න ඕන නම් (උදා: 'zoom.png'). හිස් නම් default badge එක පෙන්නනවා
  },

  // ආයතන logo (නම register එකේ තියෙන විදිහටම ලියන්න)
  institutes: {
    'පැනෝලා - මතුගම':    { a: '#ffb347', b: '#ff5e62', glyph: 'sun' },
    'විදුල - හොරණ':     { a: '#5ee7ff', b: '#4f46e5', glyph: 'bolt' },
    'සක්යා - පානදුර':    { a: '#6ee7b7', b: '#0d9488', glyph: 'leaf' },
    'රසන්යා - කලුතර':   { a: '#f9a8d4', b: '#9333ea', glyph: 'flame' },
    'ONLINE':           { a: '#fde68a', b: '#c8963a', glyph: 'wave' }
  },

  // Tute tracking: key = Student ID. stage: 1 Dispatched, 2 At courier, 3 Delivered
  // record නැත්නම් LOCKED, confirmed:false නම් PENDING, confirmed:true නම් ACTIVE
  tute: {
    // '26881376': { confirmed: true, stage: 2, courierId: 'KUR-2201', courier: 'Koswatte Courier', center: 'Horana', updated: '2026-10-09' }
  },

  // Paper marks: සැබෑ ළමයින්ගේ ලකුණු Admin Panel > Students & marks එකෙන් විතරයි එන්නේ. මෙතන sample ලකුණු දාන්න එපා.
  verifyAt: 80,    // Paper එකක total (Pure+Applied)/2 මේකට සමාන හෝ වැඩි වුණොත් ළමයාගේ නමට BLUE TICK ස්වයංක්‍රීයව වැටෙනවා
  weakBelow: 40,   // total (Pure + Applied)/2 මේකට අඩු නම් දුර්වල මට්ටම
  // demo ළමයින් (බොරු ළමයි) සම්පූර්ණයෙන්ම අයින් කළා. Rank / Z-score / Top 3 ගණනය වෙන්නේ සැබෑ ළමයින්ගේ ලකුණුවලින් විතරයි

  // Notices: Admin Panel > Notices එකෙන් පළ කරන ඒවා විතරයි Home එකේ පේන්නේ (sample notice නෑ)
  notices: [],

  // Achievements: key = Student ID ('*' = හැමෝටම, SAMPLE)
  // type: gold | silver | bronze | violet | teal   icon: achieve | star | flame | bolt
  achievements: {},   // key = Student ID ('*' = හැමෝටම). Blue tick සහ Island Top 3 medals ස්වයංක්‍රීයව එනවා. වෙනත් ඒවා Owner Panel > Site editor එකෙන්

  // GOALS (ළමයින්ට දෙන tasks): Achievements & Goals පිටුවේ progress bar එක්ක ස්වයංක්‍රීයව පෙන්නනවා
  // metric: 'best' (paper එකක උපරිම total >= target)   'improve' (කලින් paper එකට වඩා වැඩි)
  //         'toppct' (island එකේ top target% ඇතුළට)   'papers' (paper ගණන >= target)   'avg' (සාමාන්‍යය >= target)
  // icon: verified | bolt | crown | target | star | flame | achieve
  goals: [
    { id: 'tick',  icon: 'verified', title: 'Earn the blue tick',   note: 'Score 80 or more in a paper',                    metric: 'best',    target: 80 },
    { id: 'rise',  icon: 'bolt',     title: 'Beat your last paper', note: 'Get a higher total than your previous paper',    metric: 'improve' },
    { id: 'top10', icon: 'crown',    title: 'Reach the top 10%',    note: 'Finish in the top 10% of the island in a paper', metric: 'toppct', target: 10 },
    { id: 'five',  icon: 'target',   title: 'Complete 5 papers',    note: 'Attempt five papers',                            metric: 'papers',  target: 5 }
  ],

  // ===== LESSON STORE (මේ දත්ත ඔක්කොම පස්සේ Admin Panel එකෙන් එනවා. දැන් SAMPLE) =====
  // mode: 'physical' | 'online'   year: A/L වර්ෂය   month: 'YYYY-MM'
  // photo: class එකේ පින්තූරය (නැත්නම් '' ), fee: රුපියල්, notice: Physical එකට admin notice
  // instructions: Online එකට admin දෙන උපදෙස් (පේළියකට එකක්, \n වලින් වෙන් කරන්න)
  // includes: { zoom, video }   validDays: card/slip එක වලංගු දවස් ගණන
  // ===== MY CLASSES (admin panel එකෙන් එන දත්ත. දැන් SAMPLE) =====
  // හැම class එකකටම අමතරව:
  //   photo: class කොටුවේ පින්තූරය (නැත්නම් ස්වයංක්‍රීය cover එකක්)
  //   sessions: [ { id, title, zoom:{ link, start:'YYYY-MM-DDTHH:mm', minutes, notice, passcode }, recordings:[ { url, title, thumb, date } ] } ]
  //     - zoom.link   : admin save කරන Zoom link එක. හිස් නම් "link එක admin ඉක්මනින් දානවා" කියලා පෙන්නනවා
  //     - zoom.start  : class එක පටන් ගන්නා වෙලාව (notice එකත් එක්ක ළමයාට පේනවා)
  //     - recordings  : YouTube link එක දුන්නම thumbnail + title ස්වයංක්‍රීයව එනවා. title/thumb දුන්නොත් ඒවා පාවිච්චි වෙනවා. ඕන තරම් දාන්න පුළුවන්
  //   valid days ඉවර වුණාම class එක My Classes එකෙන් ඉබේම අයින් වෙනවා. admin ට දවස් එකතු කරන්න: LMS_STORE.extend(orderId, days)
  store: {
    // title: මාසෙට "October Payment", "November Payment" වගේ දිගටම යන්න දෙන්න.
    // මාස අනුපිළිවෙලට නොයන විශේෂ class එකකට "Masterclass", "Intensive" වගේ English වචනයක් දෙන්න.
    classes: [
      { id: 'p27-sep', mode: 'physical', year: '2027', month: '2026-09', title: 'September Payment', photo: '', fee: 2000, notice: 'Class fee for September.', includes: { zoom: false, video: true }, validDays: 30 },
      { id: 'p27-oct', mode: 'physical', year: '2027', month: '2026-10', title: 'Theory + Revision Class', photo: '', fee: 2500, notice: 'Bring your card to every class.', includes: { zoom: true, video: true }, validDays: 31,
      sessions: [
        { id: 'theory', title: 'Theory Class',
          zoom: { link: 'https://zoom.us/j/1234567890?pwd=SAMPLE', start: '2026-10-14T18:00', minutes: 150, passcode: '', notice: 'Theory class every Wednesday at 6.00 PM. Join 5 minutes early and keep your notebook ready.' },
          recordings: [
            { url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', title: '', thumb: '', date: '2026-10-07' },
            { url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', title: 'Limits - Part 2', thumb: '', date: '2026-10-01' }
          ] },
        { id: 'rev', title: 'Revision Class',
          zoom: { link: 'https://zoom.us/j/1234567890?pwd=SAMPLE', start: '2026-10-17T08:30', minutes: 150, passcode: '', notice: 'Revision class this Saturday at 8.30 AM. Paper discussion included.' },
          recordings: [
            { url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', title: 'Revision 01 - Differentiation', thumb: '', date: '2026-10-03' }
          ] }
      ] },
      { id: 'p27-oct-m', mode: 'physical', year: '2027', month: '2026-10', title: 'Masterclass', photo: '', fee: 3000, notice: 'Special revision series. Limited seats.', includes: { zoom: true, video: true }, validDays: 31 },
      { id: 'p27-oct-p', mode: 'physical', year: '2027', month: '2026-10', title: 'Paper Class', photo: '', fee: 2000, notice: 'Model paper discussion every Saturday.', includes: { zoom: false, video: true }, validDays: 31 },
      { id: 'p27-nov', mode: 'physical', year: '2027', month: '2026-11', title: 'November Payment', photo: '', fee: 2500, notice: '', includes: { zoom: true, video: true }, validDays: 30 },
      { id: 'p26-oct', mode: 'physical', year: '2026', month: '2026-10', title: 'October Payment', photo: '', fee: 3000, notice: 'Paper class takes about 2.5 hours.', includes: { zoom: true, video: true }, validDays: 31 },
      { id: 'o27-sep', mode: 'online', year: '2027', month: '2026-09', title: 'September Payment', photo: '', fee: 1500, instructions: 'Pay the fee to the bank account below.\nUpload a clear photo of your slip.\nSubmit and wait for admin approval.', includes: { zoom: false, video: true }, validDays: 30 },
      { id: 'o27-oct-m', mode: 'online', year: '2027', month: '2026-10', title: 'Masterclass', photo: '', fee: 3000, instructions: 'Pay the fee to the bank account below.\nUpload a clear photo of your slip.\nSubmit and wait for admin approval.', includes: { zoom: true, video: true }, validDays: 31 },
      { id: 'o27-oct', mode: 'online', year: '2027', month: '2026-10', title: 'October Payment', photo: '', fee: 2000, instructions: 'Pay the fee to the bank account below.\nWrite your name and phone number on the slip.\nUpload the slip and submit.', includes: { zoom: true, video: true }, validDays: 31,
      sessions: [
        { id: 'online', title: 'Online Live + Recordings',
          zoom: { link: 'https://zoom.us/j/1234567890?pwd=SAMPLE', start: '2026-10-15T19:00', minutes: 150, passcode: '', notice: 'Online class every Thursday at 7.00 PM.' },
          recordings: [
            { url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', title: '', thumb: '', date: '2026-10-08' }
          ] }
      ] }
    ],
    // ගුරුවරයාගේ bank details. logo: 'banks/boc.png' වගේ file එකක් දැම්මොත් ඒක පෙන්නනවා, නැත්නම් නමේ මුල් අකුරු badge එකක්
    banks: [
      { bank: 'Bank of Ceylon', name: 'H. Madusanka', account: '0000 0000 00', branch: 'Horana', logo: '', color: '#d4a017' },
      { bank: "People's Bank", name: 'H. Madusanka', account: '000 0000 0000 0', branch: 'Panadura', logo: '', color: '#c0392b' }
    ]
  },

  // ===== CONTACT US (Admin Panel edits all of this. දැන් SAMPLE: Admin Panel එකෙන් save කළාම ඒවා මේවාට වඩා ප්‍රමුඛයි) =====
  //   telegram : Telegram usernames (@ නැතුව).  Add + ඕන තරම් දාන්න පුළුවන්. දාපු පිළිවෙලටම පේනවා
  //   whatsapp : WhatsApp අංක (07XXXXXXXX)
  //   notice   : ළමයින්ට පේන්න contact කරගන්න ගැන notice එක (හිස් නම් bar එක පෙන්නන්නේ නැහැ)
  //   channels : Telegram Channels (Admin ට විතරයි add කරන්න පුළුවන්)
  //   faqs     : නිතර අහන ප්‍රශ්න      hours : support වෙලාව
  contact: {
    telegram: [
      { user: 'sample_support_1', label: 'Class support' },
      { user: 'sample_support_2', label: 'Payments & slips' }
    ],
    whatsapp: [
      { number: '0712345678', label: 'Hotline' },
      { number: '0771234567', label: 'Tute & delivery' }
    ],
    notice: { title: 'Before you message us', text: 'Please send your Student ID and full name in the first message, and write to one admin only. We reply during support hours, so no need to message again and again.' },
    channels: [
      { name: 'Combined Maths | Main Channel', url: 'https://t.me/sample_channel', desc: 'Class updates, notes and papers' },
      { name: 'Combined Maths | Papers & Answers', url: 'https://t.me/sample_papers', desc: 'Model papers and marking schemes' }
    ],
    hours: 'Mon to Sat · 8.00 AM to 8.00 PM',
    faqs: [
      { q: 'I paid but my class is still pending.', a: 'The admin checks slips and cards during support hours. If it is still pending after 24 hours, send a complaint with your payment details and we will check it.' },
      { q: 'The Zoom link is not showing.', a: 'The link appears on the class card in My Classes once the admin adds it. Refresh the page. If it is still missing 10 minutes before the class, contact us on Telegram or WhatsApp.' },
      { q: 'My tute has not arrived.', a: 'Open Home and check Tute Tracking for the courier and its ID. If the status shows Delivered but you did not get it, send us a complaint.' },
      { q: 'How do I change my locked details?', a: 'Go to My Profile and use Request a change. An admin reviews it and updates the detail for you.' },
      { q: 'I forgot my password.', a: 'Log out, then open Reset Password on the login page and follow the steps.' }
    ]
  },

  // ===== NOTIFICATIONS (top bar bell). Payment approve, new class, Zoom link, recording, marks, replies... ස්වයංක්‍රීයව ළමයාට යනවා =====
  //   enabled: false කළොත් bell එක නිශ්ශබ්ද වෙනවා    soonMinutes: class එක පටන් ගන්න මේ මිනිත්තු ගණනට කලින් "starts soon" notification
  //   expiryWarnDays: access ඉවර වෙන්න මේ දවස් ගණන ඉතුරු වුණාම අවවාද කරනවා    bannerSeconds: bell යට pop-up එක පෙනෙන තත්පර    keep: රඳවා ගන්න උපරිම notification ගණන
  notifications: { enabled: true, soonMinutes: 15, expiryWarnDays: 3, bannerSeconds: 6, keep: 300 },

  // QR code එකේ තියෙන්නේ prefix + Student ID. Admin scanner එක ඒක කියවලා ලමයාගේ තොරතුරු (fees, paper) පෙන්නනවා
  qr: { prefix: 'LMS:' },

  // Admin / Owner panels. ownerEmail = the email of the account that gets the Owner + Admin panels (can be changed later inside the Owner Panel)
  staff: { ownerEmail: 'thiran.anujitha07@gmail.com' },

  // අනික් පිටු හදලා file නම දාන්න (උදා: 'classes.html')
  routes: { dashboard: 'home.html', classes: 'classes.html', store: 'store.html', analyze: 'analyze.html', achievements: 'achievements.html', profile: 'profile.html', qr: 'profile.html#qr', contact: 'contact.html', admin: 'admin.html' }
};

/* Site overrides saved from the Control Panel (top-level keys replace the defaults above) */
try{const o=JSON.parse(localStorage.getItem('lms_site_cfg')||'{}');Object.keys(o).forEach(k=>{if(k==='demo'||k==='papers')return;window.LMS_CONFIG[k]=(k==='store'&&o[k]&&typeof o[k]==='object')?Object.assign({},window.LMS_CONFIG.store,o[k]):o[k];});}catch(e){}
/* Admin Panel data (live from Firebase): classes, notices, per-class Zoom + recordings */
(function(){
  const g=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}}, C=window.LMS_CONFIG;
  const cl=g('lms_classes',null); if(cl&&Array.isArray(cl.list)) C.store=Object.assign({},C.store,{classes:cl.list});
  const nt=g('lms_notices',null); if(nt&&Array.isArray(nt.list)) C.notices=nt.list;
  const ss=g('lms_sessions',{}); ((C.store&&C.store.classes)||[]).forEach(c=>{ if(ss[c.id]&&Array.isArray(ss[c.id].list)) c.sessions=ss[c.id].list; });
})();
