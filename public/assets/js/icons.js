// icons.js — inline SVG set (stroke uses currentColor). Usage: icon('dashboard', 18)
const P = (d, extra='') => `<path d="${d}" ${extra}/>`;
const RAW = {
  dashboard: P('M3 13h8V3H3v10zM13 21h8V11h-8v10zM13 3v6h8V3h-8zM3 21h8v-6H3v6z', 'fill="currentColor" stroke="none"'),
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="3.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="3.5" cy="18" r="1.4" fill="currentColor" stroke="none"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="3"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/>',
  budget: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0l-7-7A2 2 0 0 1 3 12.2V5a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6l7 7a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" stroke="none"/>',
  wallet: '<rect x="2.5" y="5.5" width="19" height="14" rx="3"/><path d="M2.5 9.5h19M16.5 14.5h2"/>',
  report: '<path d="M4 20V4M4 20h16M8 20v-7M13 20V8M18 20v-5"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1A2 2 0 1 1 2.5 17l.1-.1A1.6 1.6 0 0 0 1.6 14a2 2 0 0 1 0-4 1.6 1.6 0 0 0 1-2.7l-.1-.1A2 2 0 1 1 5.3 4.4l.1.1A1.6 1.6 0 0 0 8 3.4V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 20.4 10H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  price: '<path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h6.6a3 3 0 0 1 2.1.9l6.5 6.5a2 2 0 0 1 0 2.8l-5.5 5.5a2 2 0 0 1-2.8 0L5.9 12.6A3 3 0 0 1 5 10.5V6.5z"/><circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"/>',
  receipt: '<path d="M5 3v18l2-1.3 2 1.3 2-1.3 2 1.3 2-1.3 2 1.3V3l-2 1.3L15 3l-2 1.3L11 3 9 4.3 7 3 5 4.3 5 3z"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4"/>',
  team: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 11a3 3 0 1 0-1-5.8M17 20a5.5 5.5 0 0 0-2.5-4.6"/>',
  crown: '<path d="M3 8l4 4 5-7 5 7 4-4-1.5 11h-15L3 8z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 6.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z"/>',
  mail: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M3 7l9 6 9-6"/>',
  shield: '<path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M4.5 12H16"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor" stroke="none"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  google: '<path d="M21.6 12.2c0-.7-.06-1.36-.18-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.24c1.9-1.75 3-4.34 3-7.3z" fill="#4285F4" stroke="none"/><path d="M12 22c2.7 0 4.97-.9 6.63-2.43l-3.24-2.5c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22z" fill="#34A853" stroke="none"/><path d="M6.41 13.91A6 6 0 0 1 6.09 12c0-.66.11-1.31.32-1.91V7.5H3.06A10 10 0 0 0 2 12c0 1.6.38 3.12 1.06 4.5l3.35-2.59z" fill="#FBBC05" stroke="none"/><path d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.86-2.86C16.97 2.99 14.7 2 12 2A10 10 0 0 0 3.06 7.5l3.35 2.59C7.2 7.72 9.4 5.96 12 5.96z" fill="#EA4335" stroke="none"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9v6M18 9v6"/>',
  bank: '<path d="M3 9.5l9-5.5 9 5.5M4.5 9.5v8M9 9.5v8M15 9.5v8M19.5 9.5v8M3 20.5h18"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 9.5h19M6 15h4"/>',
  qr: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2.5v2.5H14zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill="currentColor" stroke="none"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  chevL: '<path d="M15 5l-7 7 7 7"/>',
  chevR: '<path d="M9 5l7 7-7 7"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 1.5v3M12 19.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1.5 12h3M19.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0"/>',
  trend: '<path d="M3 17l5-5 4 4 8-8M16 8h5v5"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 8.5 4 4 0 0 1 17.5 18H7z"/>',
  cloudOff: '<path d="M3 3l18 18M7 18a4.5 4.5 0 0 1-.5-9M9 5.6A6 6 0 0 1 18 8.5 4 4 0 0 1 19.5 16"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  edit: '<path d="M4 20h4l10.5-10.5a2 2 0 0 0-2.8-2.8L5 17v3z"/>',
  home: '<path d="M3 11l9-7 9 7M5 10v10h14V10"/>',
  building: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 4v4h-4M21 12a9 9 0 0 1-15.5 6.3L3 16M3 20v-4h4"/>',
};
const STROKE = new Set([]); // all use default stroke unless path sets fill
export function icon(name, size=18, sw=2){
  const body = RAW[name] || RAW.list;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}
export const ICON_NAMES = Object.keys(RAW);
