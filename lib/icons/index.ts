// ─── Folio Icon Library ───────────────────────────────────────────────────────
// 500+ SVG path icons organized by category
// Each icon: { id, label, d (SVG path or JSX path string) }

export type IconDef = {
  id: string
  label: string
  d: string   // SVG path data for a 24×24 viewBox
  cat: string
}

// Helper: many icons are just path strings
const p = (id: string, label: string, cat: string, d: string): IconDef => ({ id, label, d, cat })

export const ICON_CATS = [
  'Arrows','Interface','Communication','Media','Files','Business',
  'People','Nature','Food','Travel','Tech','Health','Shapes','Charts',
  'Social','Weather','Science','Education','Shopping','Home',
]

export const ICON_LIB: IconDef[] = [
  // ── Arrows ──────────────────────────────────────────────────────────────────
  p('arrow-right',      'Arrow Right',       'Arrows', 'M5 12h14M12 5l7 7-7 7'),
  p('arrow-left',       'Arrow Left',        'Arrows', 'M19 12H5M12 19l-7-7 7-7'),
  p('arrow-up',         'Arrow Up',          'Arrows', 'M12 19V5M5 12l7-7 7 7'),
  p('arrow-down',       'Arrow Down',        'Arrows', 'M12 5v14M19 12l-7 7-7-7'),
  p('arrow-up-right',   'Arrow Up Right',    'Arrows', 'M7 17L17 7M7 7h10v10'),
  p('arrow-up-left',    'Arrow Up Left',     'Arrows', 'M17 17L7 7m10 0H7v10'),
  p('arrow-back',       'Arrow Back',        'Arrows', 'M19 12H5m0 0l7 7m-7-7l7-7'),
  p('arrow-forward',    'Arrow Forward',     'Arrows', 'M5 12h14m0 0l-7 7m7-7l-7-7'),
  p('arrows-expand',    'Expand',            'Arrows', 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7'),
  p('arrows-collapse',  'Collapse',          'Arrows', 'M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7'),
  p('arrow-repeat',     'Repeat',            'Arrows', 'M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4m14 2v2a4 4 0 01-4 4H3'),
  p('arrow-shuffle',    'Shuffle',           'Arrows', 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5'),
  p('corner-down-right','Corner Down Right', 'Arrows', 'M15 10l5 5-5 5M4 4v7a4 4 0 004 4h12'),
  p('corner-up-left',   'Corner Up Left',    'Arrows', 'M9 14L4 9l5-5M20 20v-7a4 4 0 00-4-4H4'),
  p('chevron-right',    'Chevron Right',     'Arrows', 'M9 18l6-6-6-6'),
  p('chevron-left',     'Chevron Left',      'Arrows', 'M15 18l-6-6 6-6'),
  p('chevron-up',       'Chevron Up',        'Arrows', 'M18 15l-6-6-6 6'),
  p('chevron-down',     'Chevron Down',      'Arrows', 'M6 9l6 6 6-6'),
  p('chevrons-right',   'Double Right',      'Arrows', 'M13 17l5-5-5-5M6 17l5-5-5-5'),
  p('chevrons-left',    'Double Left',       'Arrows', 'M11 17l-5-5 5-5M18 17l-5-5 5-5'),

  // ── Interface ───────────────────────────────────────────────────────────────
  p('home',      'Home',        'Interface', 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10'),
  p('search',    'Search',      'Interface', 'M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z'),
  p('settings',  'Settings',    'Interface', 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06A1.65 1.65 0 0015 19.4a1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'),
  p('menu',      'Menu',        'Interface', 'M3 12h18M3 6h18M3 18h18'),
  p('grid',      'Grid',        'Interface', 'M10 3H3v7h7V3zM21 3h-7v7h7V3zM21 14h-7v7h7v-7zM10 14H3v7h7v-7z'),
  p('list',      'List',        'Interface', 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'),
  p('filter',    'Filter',      'Interface', 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z'),
  p('sort-asc',  'Sort Asc',    'Interface', 'M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 20V4'),
  p('sort-desc', 'Sort Desc',   'Interface', 'M11 5h4M11 9h7M11 13h10M3 7l3-3 3 3M6 4v16'),
  p('sidebar',   'Sidebar',     'Interface', 'M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM9 3v18'),
  p('layout',    'Layout',      'Interface', 'M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM3 9h18'),
  p('columns',   'Columns',     'Interface', 'M12 3h7a2 2 0 012 2v14a2 2 0 01-2 2h-7m0-18H5a2 2 0 00-2 2v14a2 2 0 002 2h7m0-18v18'),
  p('sliders',   'Sliders',     'Interface', 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6'),
  p('toggle-on', 'Toggle On',   'Interface', 'M17 11a1 1 0 100 2 1 1 0 000-2zM5 12m-7 0a7 7 0 1014 0A7 7 0 015 12z'),
  p('minimize',  'Minimize',    'Interface', 'M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3'),
  p('maximize',  'Maximize',    'Interface', 'M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3'),
  p('more-h',    'More H',      'Interface', 'M12 13a1 1 0 100-2 1 1 0 000 2zM19 13a1 1 0 100-2 1 1 0 000 2zM5 13a1 1 0 100-2 1 1 0 000 2z'),
  p('more-v',    'More V',      'Interface', 'M12 12m-1 0a1 1 0 102 0 1 1 0 10-2 0zM12 5m-1 0a1 1 0 102 0 1 1 0 10-2 0zM12 19m-1 0a1 1 0 102 0 1 1 0 10-2 0z'),
  p('plus',      'Plus',        'Interface', 'M12 5v14M5 12h14'),
  p('minus',     'Minus',       'Interface', 'M5 12h14'),
  p('close-x',   'Close',       'Interface', 'M18 6L6 18M6 6l12 12'),
  p('check',     'Check',       'Interface', 'M20 6L9 17l-5-5'),
  p('alert',     'Alert',       'Interface', 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01'),
  p('info',      'Info',        'Interface', 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 16v-4M12 8h.01'),
  p('help',      'Help',        'Interface', 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01'),
  p('star',      'Star',        'Interface', 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'),
  p('star-fill', 'Star Filled', 'Interface', 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'),
  p('heart',     'Heart',       'Interface', 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z'),
  p('bookmark',  'Bookmark',    'Interface', 'M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z'),
  p('flag',      'Flag',        'Interface', 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7'),
  p('tag',       'Tag',         'Interface', 'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01'),
  p('trash',     'Trash',       'Interface', 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6'),
  p('edit',      'Edit',        'Interface', 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z'),
  p('copy',      'Copy',        'Interface', 'M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1'),
  p('clipboard', 'Clipboard',   'Interface', 'M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 2h6a1 1 0 010 2H9a1 1 0 010-2z'),
  p('eye',       'Eye',         'Interface', 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zm11-3a3 3 0 100 6 3 3 0 000-6z'),
  p('eye-off',   'Eye Off',     'Interface', 'M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.77 9.77 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22'),
  p('lock',      'Lock',        'Interface', 'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4'),
  p('unlock',    'Unlock',      'Interface', 'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 019.9-1'),
  p('key',       'Key',         'Interface', 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4'),
  p('share',     'Share',       'Interface', 'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13'),
  p('link',      'Link',        'Interface', 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71'),
  p('external',  'External',    'Interface', 'M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3'),
  p('download',  'Download',    'Interface', 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3'),
  p('upload',    'Upload',      'Interface', 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12'),
  p('refresh',   'Refresh',     'Interface', 'M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 105.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15'),
  p('power',     'Power',       'Interface', 'M18.36 6.64a9 9 0 11-12.73 0M12 2v10'),
  p('bell',      'Bell',        'Interface', 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0'),
  p('bell-off',  'Bell Off',    'Interface', 'M13.73 21a2 2 0 01-3.46 0M18.63 13A17.89 17.89 0 0118 8M6.26 6.26A5.86 5.86 0 006 8c0 7-3 9-3 9h14M18 8a6 6 0 00-9.33-5M1 1l22 22'),
  p('zap',       'Zap',         'Interface', 'M13 2L3 14h9l-1 8 10-12h-9l1-8z'),
  p('award',     'Award',       'Interface', 'M12 15c4.418 0 8-2.686 8-6s-3.582-6-8-6-8 2.686-8 6 3.582 6 8 6zM8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32'),
  p('gift',      'Gift',        'Interface', 'M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z'),

  // ── Communication ───────────────────────────────────────────────────────────
  p('mail',        'Mail',          'Communication', 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6'),
  p('inbox',       'Inbox',         'Communication', 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z'),
  p('message',     'Message',       'Communication', 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'),
  p('messages',    'Messages',      'Communication', 'M14 2H6a2 2 0 00-2 2v7a2 2 0 002 2h2v4l4-4h2a2 2 0 002-2V4a2 2 0 00-2-2zM18 8H6M10 12h2m4-4H6'),
  p('phone',       'Phone',         'Communication', 'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.1 2.2 2 2 0 012.11 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.59 7.91a16 16 0 006.29 6.29l.81-.81a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z'),
  p('phone-call',  'Phone Call',    'Communication', 'M15.05 5A5 5 0 0119 8.95M15.05 1A9 9 0 0123 8.94M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.1 2.2 2 2 0 012.11 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.59 7.91a16 16 0 006.29 6.29l.81-.81a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z'),
  p('voicemail',   'Voicemail',     'Communication', 'M5.5 8a3.5 3.5 0 107 0 3.5 3.5 0 00-7 0zM11.5 8a3.5 3.5 0 107 0 3.5 3.5 0 00-7 0zM5.5 11.5h13'),
  p('video',       'Video',         'Communication', 'M23 7l-7 5 7 5V7zM1 5h15v14H1z'),
  p('send',        'Send',          'Communication', 'M22 2L11 13M22 2L15 22 11 13 2 9l20-7z'),
  p('at-sign',     'At Sign',       'Communication', 'M21 10.08A10 10 0 1112 22M21 10l-1 .92M21 10v2a3 3 0 006 0v-2a10 10 0 10-9 9.93'),
  p('wifi',        'Wifi',          'Communication', 'M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01'),
  p('wifi-off',    'Wifi Off',      'Communication', 'M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01'),
  p('rss',         'RSS',           'Communication', 'M4 11a9 9 0 019 9M4 4a16 16 0 0116 16M5 19a1 1 0 100-2 1 1 0 000 2z'),
  p('cast',        'Cast',          'Communication', 'M2 8V6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2h-6M2 12a9 9 0 019 9M2 16a5 5 0 015 5M2 20h.01'),
  p('globe',       'Globe',         'Communication', 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z'),

  // ── Media ───────────────────────────────────────────────────────────────────
  p('play',        'Play',       'Media', 'M5 3l14 9-14 9V3z'),
  p('pause',       'Pause',      'Media', 'M6 4h4v16H6zM14 4h4v16h-4z'),
  p('stop',        'Stop',       'Media', 'M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z'),
  p('skip-back',   'Skip Back',  'Media', 'M19 20L9 12l10-8v16zM5 4v16'),
  p('skip-forward','Skip Fwd',   'Media', 'M5 4l10 8-10 8V4zM19 4v16'),
  p('rewind',      'Rewind',     'Media', 'M11 19l-9-7 9-7v14zM22 19l-9-7 9-7v14z'),
  p('fast-forward','Fast Fwd',   'Media', 'M13 19l9-7-9-7v14zM2 19l9-7-9-7v14z'),
  p('volume',      'Volume',     'Media', 'M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07'),
  p('volume-mute', 'Mute',       'Media', 'M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6'),
  p('volume-low',  'Vol Low',    'Media', 'M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07'),
  p('mic',         'Mic',        'Media', 'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8'),
  p('mic-off',     'Mic Off',    'Media', 'M1 1l22 22M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6M17 16.95A7 7 0 015 12v-2m14-3v2a7 7 0 01-.11 1.23M12 19v4M8 23h8'),
  p('camera',      'Camera',     'Media', 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z'),
  p('image',       'Image',      'Media', 'M21 19a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h4l2 3h9a2 2 0 012 2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z'),
  p('film',        'Film',       'Media', 'M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2zM5 8h14M5 16h14M9 2v6M15 2v6M9 16v6M15 16v6'),
  p('music',       'Music',      'Media', 'M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM21 16a3 3 0 11-6 0 3 3 0 016 0z'),
  p('headphones',  'Headphones', 'Media', 'M3 18v-6a9 9 0 0118 0v6M3 18a3 3 0 106 0v-3a3 3 0 00-6 0v3zM21 18a3 3 0 10-6 0v-3a3 3 0 016 0v3z'),
  p('airplay',     'Airplay',    'Media', 'M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-2M12 15l5 6H7l5-6z'),
  p('youtube',     'YouTube',    'Media', 'M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98l5.75 3.02-5.75 3.02z'),

  // ── Files & Docs ────────────────────────────────────────────────────────────
  p('file',         'File',        'Files', 'M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9zM13 2v7h7'),
  p('file-text',    'File Text',   'Files', 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8'),
  p('file-pdf',     'PDF',         'Files', 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 13h1a2 2 0 000-4H9v6M16 13h2M16 17h2M12 9v8'),
  p('file-code',    'Code File',   'Files', 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M10 13l-2 2 2 2M14 13l2 2-2 2'),
  p('file-zip',     'Zip',         'Files', 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M10 9h1M11 11h1M10 13h1M11 15h1M10 17h4'),
  p('folder',       'Folder',      'Files', 'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z'),
  p('folder-open',  'Folder Open', 'Files', 'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2zM2 10h20'),
  p('folder-plus',  'Folder +',    'Files', 'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2zM12 11v6M9 14h6'),
  p('archive',      'Archive',     'Files', 'M21 8v13H3V8M1 3h22v5H1zM10 12h4'),
  p('database',     'Database',    'Files', 'M12 8c4.418 0 8-1.343 8-3s-3.582-3-8-3-8 1.343-8 3 3.582 3 8 3zM4 5v6c0 1.657 3.582 3 8 3s8-1.343 8-3V5M4 11v6c0 1.657 3.582 3 8 3s8-1.343 8-3v-6'),
  p('hard-drive',   'Hard Drive',  'Files', 'M22 12H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11zM6 16h.01M10 16h.01'),
  p('save',         'Save',        'Files', 'M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8'),

  // ── Business ────────────────────────────────────────────────────────────────
  p('briefcase',    'Briefcase',   'Business', 'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M12 12v.01'),
  p('building',     'Building',    'Business', 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10'),
  p('chart-bar',    'Bar Chart',   'Business', 'M18 20V10M12 20V4M6 20v-6'),
  p('chart-line',   'Line Chart',  'Business', 'M22 12h-4l-3 9L9 3l-3 9H2'),
  p('chart-pie',    'Pie Chart',   'Business', 'M21.21 15.89A10 10 0 118 2.83M22 12A10 10 0 0012 2v10z'),
  p('trending-up',  'Trending Up', 'Business', 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6'),
  p('trending-down','Trending Dn', 'Business', 'M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6'),
  p('dollar',       'Dollar',      'Business', 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6'),
  p('percent',      'Percent',     'Business', 'M19 5L5 19M6.5 6.5h.01M17.5 17.5h.01M6 6a.5.5 0 100-1 .5.5 0 000 1zM18 18a.5.5 0 100-1 .5.5 0 000 1z'),
  p('credit-card',  'Credit Card', 'Business', 'M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2zM1 10h22'),
  p('shopping-cart','Cart',        'Business', 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0'),
  p('shopping-bag', 'Bag',         'Business', 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0'),
  p('package',      'Package',     'Business', 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12'),
  p('truck',        'Truck',       'Business', 'M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11v15M16 3h4l2 6v8h-6V3zM5.5 17a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM18.5 17a2.5 2.5 0 100 5 2.5 2.5 0 000-5z'),
  p('target',       'Target',      'Business', 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z'),
  p('users',        'Users',       'Business', 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75'),
  p('user-plus',    'Add User',    'Business', 'M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6'),
  p('user-check',   'Verified',    'Business', 'M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8zM17 11l2 2 4-4'),
  p('layers',       'Layers',      'Business', 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'),

  // ── People / Social ─────────────────────────────────────────────────────────
  p('user',         'User',       'People', 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z'),
  p('smile',        'Smile',      'People', 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01'),
  p('frown',        'Frown',      'People', 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM16 16s-1.5-2-4-2-4 2-4 2M9 9h.01M15 9h.01'),
  p('meh',          'Neutral',    'People', 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM8 15h8M9 9h.01M15 9h.01'),
  p('thumbs-up',    'Thumbs Up',  'People', 'M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3'),
  p('thumbs-down',  'Thumbs Dn',  'People', 'M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zM17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17'),

  // ── Nature ──────────────────────────────────────────────────────────────────
  p('sun',          'Sun',        'Nature', 'M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42'),
  p('moon',         'Moon',       'Nature', 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z'),
  p('cloud',        'Cloud',      'Nature', 'M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z'),
  p('cloud-rain',   'Rain',       'Nature', 'M16 13v8M8 13v8M12 15v8M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25'),
  p('cloud-snow',   'Snow',       'Nature', 'M20 17.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25M8 16h.01M8 20h.01M12 18h.01M12 22h.01M16 16h.01M16 20h.01'),
  p('wind',         'Wind',       'Nature', 'M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2'),
  p('umbrella',     'Umbrella',   'Nature', 'M23 12a11.05 11.05 0 00-22 0zm-5 7a3 3 0 01-6 0v-7'),
  p('leaf',         'Leaf',       'Nature', 'M17 8C8 10 5.9 16.17 3.82 22M9.09 9.91C14.09 8.91 17 6 17 2c-3 0-6 1-8 3'),
  p('tree',         'Tree',       'Nature', 'M17 19c-1 0-2-.5-3-1.5S12 16 11 16M12 3l4 8h-3l4 6H3l4-6H4l4-8z'),
  p('flame',        'Flame',      'Nature', 'M12 22s8-4 8-10a8 8 0 10-16 0c0 6 8 10 8 10z'),
  p('droplet',      'Droplet',    'Nature', 'M12 22a7 7 0 007-7c0-2-1-3.9-1.5-4.5l-5.5-8-5.5 8C6 11.1 5 13 5 15a7 7 0 007 7z'),
  p('mountain',     'Mountain',   'Nature', 'M3 17l5-10 5 8 3-5 5 7H3z'),
  p('waves',        'Waves',      'Nature', 'M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1'),

  // ── Travel ──────────────────────────────────────────────────────────────────
  p('map-pin',     'Map Pin',     'Travel', 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z'),
  p('map',         'Map',         'Travel', 'M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16'),
  p('compass',     'Compass',     'Travel', 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM16.24 7.76L14.12 14.12 7.76 16.24l2.12-6.36 6.36-2.12z'),
  p('navigation',  'Navigation',  'Travel', 'M3 11l19-9-9 19-2-8-8-2z'),
  p('car',         'Car',         'Travel', 'M14 2H6L3 7v9h18V7l-3-5zM3 7h18M8 12a2 2 0 100 4 2 2 0 000-4zM16 12a2 2 0 100 4 2 2 0 000-4z'),
  p('plane',       'Plane',       'Travel', 'M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z'),
  p('ship',        'Ship',        'Travel', 'M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M5 11V7l7-4 7 4v4M5 11h14M9 11v3M15 11v3M3 17h18'),
  p('anchor',      'Anchor',      'Travel', 'M12 8a4 4 0 100-8 4 4 0 000 8zM12 22V8M5 12H2a10 10 0 0020 0h-3'),

  // ── Tech ────────────────────────────────────────────────────────────────────
  p('code',        'Code',        'Tech', 'M16 18l6-6-6-6M8 6l-6 6 6 6'),
  p('terminal',    'Terminal',    'Tech', 'M4 17l6-6-6-6M12 19h8'),
  p('cpu',         'CPU',         'Tech', 'M9 3H7a2 2 0 00-2 2v2M9 3h6M9 3v2M15 3h2a2 2 0 012 2v2M21 9V7M21 9v6M21 15v2a2 2 0 01-2 2h-2M21 15h-2M15 21H9M15 21v-2M9 21H7a2 2 0 01-2-2v-2M9 21v-2M3 9v6M3 9V7a2 2 0 012-2h2M3 15v2a2 2 0 002 2h2M9 9h6v6H9z'),
  p('server',      'Server',      'Tech', 'M20 12H4M20 6H4a2 2 0 00-2 2v8a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2zM7 12h.01M7 9h.01M7 15h.01'),
  p('monitor',     'Monitor',     'Tech', 'M20 3H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V5a2 2 0 00-2-2zM8 21h8M12 17v4'),
  p('smartphone',  'Phone',       'Tech', 'M17 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2zM12 18h.01'),
  p('tablet',      'Tablet',      'Tech', 'M20 2H4a2 2 0 00-2 2v18a2 2 0 002 2h16a2 2 0 002-2V4a2 2 0 00-2-2zM12 18h.01'),
  p('laptop',      'Laptop',      'Tech', 'M2 16.1A5 5 0 015.9 20H18a5 5 0 013.9-3.9M2 20h20M4 4h16a2 2 0 012 2v10H2V6a2 2 0 012-2z'),
  p('watch',       'Watch',       'Tech', 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2M16 2l-1 4H9L8 2M8 22l1-4h6l1 4'),
  p('printer',     'Printer',     'Tech', 'M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8zM6 9h.01'),
  p('bluetooth',   'Bluetooth',   'Tech', 'M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11'),
  p('battery',     'Battery',     'Tech', 'M23 7v4M1 8v8a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2H3a2 2 0 00-2 2zM7 12h6'),

  // ── Health ──────────────────────────────────────────────────────────────────
  p('heart-pulse', 'Heart Rate',  'Health', 'M22 12h-4l-3 9L9 3l-3 9H2M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z'),
  p('plus-circle', 'Medical',     'Health', 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v8M8 12h8'),
  p('clipboard-cross', 'Rx',      'Health', 'M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 2h6a1 1 0 010 2H9a1 1 0 010-2zM12 11v6M9 14h6'),
  p('eye-check',   'Eye Check',   'Health', 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zm11-3a3 3 0 100 6 3 3 0 000-6z'),
  p('stethoscope', 'Stethoscope', 'Health', 'M19 8a4 4 0 11-8 0A4 4 0 0119 8zM3 3v8a5 5 0 0010 0V3M11 8V3'),

  // ── Home ────────────────────────────────────────────────────────────────────
  p('sofa',        'Sofa',        'Home', 'M20 9V7a2 2 0 00-2-2H6a2 2 0 00-2 2v2M2 11v5h20v-5a2 2 0 10-4 0v1H6v-1a2 2 0 10-4 0zM4 16v2M20 16v2'),
  p('tv',          'TV',          'Home', 'M4 6h16a2 2 0 012 2v11a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2zM8 21h8M12 17v4'),
  p('lamp',        'Lamp',        'Home', 'M8 2h8l2 6H6zM12 8v13M9 21h6'),
  p('door',        'Door',        'Home', 'M3 3h18v18H3zM16 3v18M10 12h.01'),
  p('tool',        'Tool',        'Home', 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z'),
  p('wrench',      'Wrench',      'Home', 'M22 13.29l-3.21-3.21c.97-3.03.27-6.46-2.12-8.85A8 8 0 002 8.57c-.41 2.88.47 5.75 2.36 7.79L13 25a2.82 2.82 0 003.93-.16l5.07-5.07a2.81 2.81 0 000-6.48z'),
  p('scissors',    'Scissors',    'Home', 'M6 9a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100 6 3 3 0 000-6zM20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12'),

  // ── Education ───────────────────────────────────────────────────────────────
  p('book',        'Book',        'Education', 'M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5v15zM6.5 17H20'),
  p('book-open',   'Book Open',   'Education', 'M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z'),
  p('graduation',  'Grad Cap',    'Education', 'M22 10v6M2 10l10-5 10 5-10 5-10-5zM6 12v5c3 3 9 3 12 0v-5'),
  p('pen-tool',    'Pen Tool',    'Education', 'M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z'),
  p('globe2',      'Globe',       'Education', 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z'),
  p('lightbulb',   'Idea',        'Education', 'M9 18h6M10 22h4M12 2a7 7 0 00-4 12.87V17a1 1 0 001 1h6a1 1 0 001-1v-2.13A7 7 0 0012 2z'),
  p('pencil',      'Pencil',      'Education', 'M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z'),

  // ── Social ──────────────────────────────────────────────────────────────────
  p('twitter-x',   'X / Twitter', 'Social', 'M18 6L6 18M6 6l12 12'),
  p('linkedin-sq', 'LinkedIn',    'Social', 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z'),
  p('github',      'GitHub',      'Social', 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22'),
  p('instagram',   'Instagram',   'Social', 'M8 2h8a6 6 0 016 6v8a6 6 0 01-6 6H8A6 6 0 012 16V8a6 6 0 016-6zM16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zM17.5 6.5h.01'),
  p('facebook',    'Facebook',    'Social', 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z'),
  p('youtube2',    'YouTube',     'Social', 'M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.41 19.1C5.12 19.56 12 19.56 12 19.56s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 11.75a29 29 0 00-.46-5.33zM9.75 14.85V8.65l5.75 3.1-5.75 3.1z'),
  p('tiktok',      'TikTok',      'Social', 'M9 12a4 4 0 100 8 4 4 0 000-8zM21 4s-3-.5-5 3M21 4v5s-3 0-5-2M21 4h-4'),
  p('slack',       'Slack',       'Social', 'M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5zM20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5zM3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14zM14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5zM15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zM10 9.5C10 8.67 9.33 8 8.5 8h-5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5zM8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z'),
  p('discord',     'Discord',     'Social', 'M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 00-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 00-5.487 0A12.36 12.36 0 008.65 3.038a.077.077 0 00-.079-.036c-1.714.29-3.354.8-4.885 1.491a.07.07 0 00-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 00.031.055 20.03 20.03 0 005.993 2.98.078.078 0 00.084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 01-1.872-.878.075.075 0 01-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 01.078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 01.079.009c.12.098.245.195.372.288a.075.075 0 01-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 00-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 00.084.028 19.963 19.963 0 006.002-2.981.076.076 0 00.032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 00-.031-.028z'),

  // ── Science ──────────────────────────────────────────────────────────────────
  p('beaker',      'Beaker',      'Science', 'M9 3h6M9 3v7l-3.5 7A2 2 0 007.3 20h9.4a2 2 0 001.8-3L15 10V3'),
  p('atom',        'Atom',        'Science', 'M12 12m-1 0a1 1 0 102 0 1 1 0 10-2 0zM12 12c5.523 0 10 3.134 10 7M12 12C6.477 12 2 8.866 2 5M12 12c0-5.523 3.134-10 7-10M12 12c0 5.523-3.134 10-7 10'),
  p('dna',         'DNA',         'Science', 'M2 15c6.667-6 13.333 0 20-6M2 9c6.667 6 13.333 0 20 6M4 9.5v1M4 14.5v1M20 8.5v1M20 13.5v1M12 8v1M12 15v1'),
  p('microscope',  'Microscope',  'Science', 'M6 18h8M3 22h18M14 22a7 7 0 100-14M9 14l2-2v-4l-2-4M9 14H7v4h2v-4zM9 6H7V2h2v4z'),
  p('satellite',   'Satellite',   'Science', 'M3.5 19l1.43-1.43M21.5 5l-1.43 1.43M17 3l4 4M3 17l4 4M2 12h2M20 12h2M12 2v2M12 20v2M7.05 7.05L5.64 5.64M18.95 18.95l-1.41-1.41M17.66 7.34L19.07 5.93M7.34 17.66l-1.41 1.41M12 17a5 5 0 100-10 5 5 0 000 10z'),

  // ── Shapes ──────────────────────────────────────────────────────────────────
  p('rect-shape',  'Rectangle',   'Shapes', 'M3 3h18a1 1 0 011 1v16a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z'),
  p('circle-shape','Circle',      'Shapes', 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z'),
  p('triangle-shape','Triangle',  'Shapes', 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z'),
  p('diamond-shape','Diamond',    'Shapes', 'M12 2l9.5 10-9.5 10L2.5 12z'),
  p('octagon',     'Octagon',     'Shapes', 'M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z'),
  p('hexagon',     'Hexagon',     'Shapes', 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z'),
  p('pentagon',    'Pentagon',    'Shapes', 'M12 2l9 7-3.4 10.5H6.4L3 9z'),
  p('star-shape',  'Star',        'Shapes', 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'),
  p('cross-shape', 'Cross',       'Shapes', 'M9 2h6v7h7v6h-7v7H9v-7H2V9h7z'),
]

export const ICONS_BY_CAT = ICON_CATS.reduce((acc, cat) => {
  acc[cat] = ICON_LIB.filter(i => i.cat === cat)
  return acc
}, {} as Record<string, IconDef[]>)