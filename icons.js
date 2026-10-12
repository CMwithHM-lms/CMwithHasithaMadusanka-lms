/* icons + institute glyphs */
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

const ICON = {
  verified: '<svg viewBox="0 0 24 24"><path d="M12 2.8l2.4 1.7 2.9-.1 1 2.7 2.4 1.6-.8 2.8.8 2.8-2.4 1.6-1 2.7-2.9-.1L12 21.2l-2.4-1.7-2.9.1-1-2.7-2.4-1.6.8-2.8-.8-2.8 2.4-1.6 1-2.7 2.9.1z"/><path d="M8.6 12.3l2.5 2.5 4.4-4.9"/></svg>',
  crown: '<svg viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/><path d="M5 19h14"/></svg>',
  target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/></svg>',
  users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.8-3.8"/></svg>',
  medal: '<svg viewBox="0 0 24 24"><circle cx="12" cy="15" r="5.5"/><path d="M8.5 10.5L6 3h4l2 4 2-4h4l-2.5 7.5"/><path d="M12 12.6l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z"/></svg>',
  dash: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>',
  classes: '<svg viewBox="0 0 24 24"><path d="M2 5.5C4.5 4 8 4 12 6c4-2 7.5-2 10-.5V19c-2.5-1.5-6-1.5-10 .5-4-2-7.5-2-10-.5z"/><path d="M12 6v13"/></svg>',
  store: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
  analyze: '<svg viewBox="0 0 24 24"><path d="M4 20V13M10 20V5M16 20v-6M21 20V9"/></svg>',
  achieve: '<svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M9 21h6M9.5 17h5"/></svg>',
  profile: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/></svg>',
  out: '<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
  qr: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 17v4M14 20h3"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg>',
  call: '<svg viewBox="0 0 24 24"><rect x="7" y="2.5" width="10" height="19" rx="3"/><path d="M11 18.5h2"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  spark: '<svg viewBox="0 0 24 24"><path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/></svg>',
  school: '<svg viewBox="0 0 24 24"><path d="M3 10l9-5 9 5-9 5z"/><path d="M7 12.5V17c0 1 2.2 2.5 5 2.5s5-1.5 5-2.5v-4.5M21 10v5"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M12 21s7-5.6 7-11a7 7 0 0 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  cal: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
  wa: '<svg viewBox="0 0 24 24"><path d="M4 20l1.4-4.2A8 8 0 1 1 8.2 18.6z"/><path d="M9 10c.4 2 2 3.6 4 4"/></svg>',
  mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 8l9 6 9-6"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="3"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  truck: '<svg viewBox="0 0 24 24"><path d="M2 6h11v10H2zM13 9h5l3 3v4h-8z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
  flame: '<svg viewBox="0 0 24 24"><path d="M12 22c-4 0-7-3-7-7 0-3 2-5 3-8 1.5 2 2 3.5 2 5 1-1 1.5-2.5 1.5-4 2 2 4 4.5 4 7 0 4-3 7-6 7z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  idcard: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2"/><path d="M6.5 16c.5-1.5 1.5-2 2.5-2s2 .5 2.5 2M14 10h4M14 13h3"/></svg>',
  nfc: '<svg viewBox="0 0 24 24"><path d="M8 8a6 6 0 0 1 0 8M12 5a10 10 0 0 1 0 14M16 2.5a14 14 0 0 1 0 19"/></svg>',
  filter: '<svg viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  cross: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  play: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="4"/><path d="M10 9l5 3-5 3z"/></svg>',
  cam: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="12" height="12" rx="3"/><path d="M15 10l6-3v10l-6-3"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="3"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>',
  bank: '<svg viewBox="0 0 24 24"><path d="M3 9l9-5 9 5zM5 9v8M9.5 9v8M14.5 9v8M19 9v8M3 20h18"/></svg>',
  image: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M4 18l5-5 4 4 3-3 4 4"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  tag: '<svg viewBox="0 0 24 24"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/></svg>',
  card: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  ext: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></svg>',
  globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/></svg>',
  key: '<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/></svg>',
  hash: '<svg viewBox="0 0 24 24"><path d="M5 9h15M4 15h15M10 4 8 20M16 4l-2 16"/></svg>',
  live: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.4"/><path d="M7.2 7.2a6.8 6.8 0 0 0 0 9.6M16.8 7.2a6.8 6.8 0 0 1 0 9.6M4.4 4.4a10.8 10.8 0 0 0 0 15.2M19.6 4.4a10.8 10.8 0 0 1 0 15.2"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="M21 3 3 10.5l7 2.5 2.5 7z"/><path d="M10 13l11-10"/></svg>',
  chev: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.3 9.4a2.8 2.8 0 0 1 5.4 1c0 1.8-2.7 2.2-2.7 3.8M12 17.4h.01"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>',
  film: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5"/></svg>'
};

const GLYPH = {
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path class="f" d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  leaf: '<svg viewBox="0 0 24 24"><path d="M5 19C5 10 10 5 20 4c0 10-5 15-15 15z"/><path d="M5 19l8-8"/></svg>',
  flame: '<svg viewBox="0 0 24 24"><path class="f" d="M12 22c-4 0-7-3-7-7 0-3 2-5 3-8 1.5 2 2 3.5 2 5 1-1 1.5-2.5 1.5-4 2 2 4 4.5 4 7 0 4-3 7-6 7z"/></svg>',
  wave: '<svg viewBox="0 0 24 24"><path d="M3 9a13 13 0 0 1 18 0M6.5 12.5a8 8 0 0 1 11 0"/><circle class="f" cx="12" cy="16.5" r="1.8"/></svg>'
};

/* brand logos keep their own colours (not tinted by the theme) */
const BRAND = {
  telegram: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="#2AABEE"/><path fill="#fff" d="M10.6 23.6l22.4-8.6c1-.4 2 .3 1.7 1.8l-3.8 18c-.3 1.3-1 1.6-2.1 1l-5.8-4.3-2.8 2.7c-.3.3-.6.6-1.2.6l.4-5.9 10.7-9.7c.5-.4-.1-.7-.7-.3L17.2 28.7l-5.7-1.8c-1.2-.4-1.2-1.2.3-1.8z"/></svg>',
  whatsapp: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="#25D366"/><path d="M24 10.5a13.5 13.5 0 0 0-11.6 20.4L10.5 37.5l6.8-1.8A13.5 13.5 0 1 0 24 10.5z" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/><path fill="#fff" transform="translate(13.2 13.2) scale(.9)" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>'
};
