/* staff.js: roles + access invites for the Admin / Owner panels (localStorage now; the backend replaces get()/put()).
   Roles: owner (the owner email) | admin (accepted invite, with switchable powers) | analyze (paper marks only).
   Invite flow: owner adds an email + a one-time access password -> that person logs in -> Accept/Decline bar -> details form -> access.
   KYC details (name, NIC, 2 NIC photos, NIC no, registered phone) go to lms_kyc, which only the owner panel reads. */
(function () {
  const C = window.LMS_CONFIG || {}, ls = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const hash = async s => { try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { return btoa(unescape(encodeURIComponent(s))); } };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const em = s => String(s || '').trim().toLowerCase();
  const PERMS = { notice: 'Notices', contact: 'Contact Us page', links: 'YouTube / Zoom links', analyze: 'Paper Mark Analyze' };

  const db = () => Object.assign({ list: [] }, ls('lms_staff', {}));           // list: {email, role:'admin'|'owner'|'analyze', status:'invited'|'accepted'|'declined', pw, perms, at}
  const save = d => put('lms_staff', d);
  const ownerEmail = () => em(ls('lms_owner_email', '') || (C.staff || {}).ownerEmail);
  const profile = () => { try { const ph = localStorage.getItem('lms_session'); return (JSON.parse(localStorage.getItem('lms_profiles') || '{}'))[ph] || null; } catch (e) { return null; } };

  function me() {
    const p = profile(), email = em(p && p.email), out = { email, p, owner: false, admin: false, analyze: false, perms: {} };
    if (!email) return out;
    if (email === ownerEmail()) { out.owner = out.admin = out.analyze = true; Object.keys(PERMS).forEach(k => out.perms[k] = true); return out; }
    db().list.filter(x => em(x.email) === email && x.status === 'accepted').forEach(x => {
      if (x.role === 'owner') { out.owner = out.admin = out.analyze = true; Object.keys(PERMS).forEach(k => out.perms[k] = true); }
      if (x.role === 'admin') { out.admin = true; Object.keys(PERMS).forEach(k => { if (x.perms && x.perms[k] !== false) out.perms[k] = true; }); }
      if (x.role === 'analyze') out.analyze = true;
    });
    if (out.admin && out.perms.analyze) out.analyze = true;
    return out;
  }

  const ctrl = {                                    // "Edit site & Full control" password (owner only)
    has: () => !!ls('lms_ctrl_pw', ''),
    set: async pw => put('lms_ctrl_pw', await hash(pw)),
    ok: async pw => (await hash(pw)) === ls('lms_ctrl_pw', '')
  };

  async function invite(role, email, pw, perms) {
    email = em(email); if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'Enter a valid email.';
    if (!pw || pw.length < 6) return 'Access password needs at least 6 characters.';
    const d = db(), old = d.list.find(x => em(x.email) === email && x.role === role);
    if (old && old.status !== 'declined') return 'This email already has ' + role + ' access or a pending invite.';
    d.list = d.list.filter(x => !(em(x.email) === email && x.role === role));
    d.list.push({ email, role, status: 'invited', pw: await hash(pw), perms: perms || {}, at: Date.now() });
    return save(d) ? 'ok' : 'could not save';
  }
  const remove = (email, role) => { const d = db(); d.list = d.list.filter(x => !(em(x.email) === em(email) && x.role === role)); ls('lms_kyc', {}); const k = ls('lms_kyc', {}); delete k[em(email) + '|' + role]; put('lms_kyc', k); return save(d); };
  const setPerm = (email, k, v) => { const d = db(), x = d.list.find(y => em(y.email) === em(email) && y.role === 'admin'); if (!x) return false; x.perms = x.perms || {}; x.perms[k] = v; return save(d); };
  const kyc = () => ls('lms_kyc', {});

  /* shrink an ID photo to ~900px JPEG so it fits in storage */
  const shrink = f => new Promise((res, rej) => { const r = new FileReader(); r.onerror = rej; r.onload = () => { const i = new Image(); i.onerror = rej; i.onload = () => { const s = Math.min(1, 900 / Math.max(i.width, i.height)), c = document.createElement('canvas'); c.width = i.width * s; c.height = i.height * s; c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .72)); }; i.src = r.result; }; r.readAsDataURL(f); });

  async function accept(inv, f) {                     // f: {name, nic, phone, pw, front, back}
    if (!f.name || !f.nic || !/^0\d{9}$/.test(f.phone) || !f.front || !f.back) return 'Fill in every detail and add both NIC photos.';
    if ((await hash(f.pw)) !== inv.pw) return 'The access password is wrong.';
    const d = db(), x = d.list.find(y => em(y.email) === em(inv.email) && y.role === inv.role); if (!x) return 'Invite not found.';
    x.status = 'accepted'; x.at = Date.now(); save(d);
    const k = kyc(); k[em(inv.email) + '|' + inv.role] = { name: f.name, nic: f.nic, phone: f.phone, front: f.front, back: f.back, email: em(inv.email), role: inv.role, at: Date.now() }; put('lms_kyc', k);
    return 'ok';
  }
  function decline(inv) { const d = db(), x = d.list.find(y => em(y.email) === em(inv.email) && y.role === inv.role); if (x) { x.status = 'declined'; x.at = Date.now(); save(d); } }

  /* staff email change: they request, the owner allows, the old email is replaced everywhere in the owner's private list */
  const reqs = () => ls('lms_email_req', []);
  const reqEmail = (old, nu) => { nu = em(nu); if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(nu)) return 'Enter a valid email.'; if (db().list.some(x => em(x.email) === nu)) return 'That email already has access.'; const a = reqs().filter(x => x.old !== em(old)); a.push({ old: em(old), nu, at: Date.now() }); put('lms_email_req', a); return 'ok'; };
  const decideEmail = (old, ok) => { const a = reqs(), q = a.find(x => x.old === em(old)); if (!q) return false; put('lms_email_req', a.filter(x => x !== q)); if (!ok) return true; const d = db(); d.list.forEach(x => { if (em(x.email) === q.old) x.email = q.nu; }); save(d); const k = kyc(), n = {}; Object.keys(k).forEach(key => { const [e, r] = key.split('|'); if (e === q.old) { k[key].email = q.nu; n[q.nu + '|' + r] = k[key]; } else n[key] = k[key]; }); put('lms_kyc', n); return true; };
  window.LMS_STAFF = { reqs, reqEmail, decideEmail, PERMS, me, db, ctrl, invite, remove, setPerm, kyc, ownerEmail, setOwnerEmail: e => put('lms_owner_email', em(e)), hash, esc, shrink, accept, decline };

  /* Accept / Decline bar: shows on any page once a signed-in student's email has a pending invite */
  function bar() {
    const m = me(); if (!m.email || document.getElementById('stfBar')) return;
    const inv = db().list.find(x => em(x.email) === m.email && x.status === 'invited'); if (!inv) return;
    const label = { admin: 'Admin Panel', owner: 'Owner Panel', analyze: 'Paper Analyze' }[inv.role];
    const b = document.createElement('div'); b.id = 'stfBar';
    b.style.cssText = 'position:fixed;left:10px;right:10px;top:calc(82px + env(safe-area-inset-top));z-index:90;max-width:520px;margin:0 auto;padding:14px;border-radius:18px;background:#1b1536;color:#f5f0e6;border:1px solid #c8963a;box-shadow:0 20px 50px -14px #000;font:500 .88rem system-ui;max-height:80vh;overflow:auto';
    const inp = 'width:100%;margin:5px 0;padding:11px;border-radius:10px;border:1px solid #ffffff30;background:#0b0816;color:#fff;font:inherit';
    const btn = 'padding:10px 16px;border:0;border-radius:12px;font:700 .85rem system-ui;cursor:pointer;';
    b.innerHTML = `<b>You were given access to the ${label}.</b><div id="stfA" style="margin-top:10px"><button id="stfY" style="${btn}background:#f2c46d;color:#2a1c05">Accept</button> <button id="stfN" style="${btn}background:#e11d48;color:#fff">Decline</button></div>`;
    document.body.appendChild(b);
    b.querySelector('#stfN').onclick = () => { decline(inv); b.remove(); };
    b.querySelector('#stfY').onclick = () => {
      b.querySelector('#stfA').innerHTML = `<p style="margin:0 0 6px;color:#a9a1bf">Verify yourself. These details are visible to the owner only.</p>
        <input id="fN" style="${inp}" placeholder="Full name"><input id="fC" style="${inp}" placeholder="NIC number"><input id="fP" style="${inp}" inputmode="numeric" placeholder="Phone number you registered with">
        <label style="display:block;margin-top:6px">NIC front <input id="fF" type="file" accept="image/*" capture="environment"></label><label style="display:block;margin:6px 0">NIC back <input id="fB" type="file" accept="image/*" capture="environment"></label>
        <input id="fW" type="password" style="${inp}" placeholder="Access password from the owner"><div id="fE" style="color:#fb7185;min-height:18px"></div><button id="fGo" style="${btn}background:#f2c46d;color:#2a1c05">Confirm</button>`;
      b.querySelector('#fGo').onclick = async () => {
        const v = s => b.querySelector(s).value.trim(), fE = b.querySelector('#fE'); fE.textContent = 'Checking...';
        try {
          const a = b.querySelector('#fF').files[0], c = b.querySelector('#fB').files[0];
          const r = await accept(inv, { name: v('#fN'), nic: v('#fC'), phone: v('#fP').replace(/\D/g, ''), pw: b.querySelector('#fW').value, front: a ? await shrink(a) : '', back: c ? await shrink(c) : '' });
          if (r === 'ok') { b.remove(); location.href = 'admin.html'; } else fE.textContent = r;
        } catch (e) { fE.textContent = 'Could not read the photos. Try again.'; }
      };
    };
  }
  window.LMS_STAFF.bar = bar;
  if (document.readyState !== 'loading') setTimeout(bar, 400); else document.addEventListener('DOMContentLoaded', () => setTimeout(bar, 400));
})();
