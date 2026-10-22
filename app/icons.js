// The sheet's own small line icons: drawn here on a 24×24 grid with one stroke style (1.75, round ends), in
// currentColor, so they follow the theme, the light or dark mode and every class style. Inline SVG only: no icon
// font or remote file (the sheet also runs as a browser extension, and offline).
'use strict';

const ICON_PATHS = {
  // sections
  overview: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
  combat: '<path d="M12 3l7 2.5V11c0 4.6-3 8-7 9.5C8 19 5 15.6 5 11V5.5z"/><path d="M8 12.5h2l1-2.5 2 5 1-2.5h2"/>',
  attacks: '<path d="M7 17L19 5M5 15l4 4M7 17l-3 3M17 17L5 5M19 15l-4 4M17 17l3 3"/>',
  superiority: '<path d="M5 10l7-5 7 5M5 15l7-5 7 5M5 20l7-5 7 5"/>',
  force: '<circle cx="12" cy="12" r="2.2"/><path d="M8.2 7.8a6 6 0 0 0 0 8.4M15.8 7.8a6 6 0 0 1 0 8.4M5.2 4.8a10 10 0 0 0 0 14.4M18.8 4.8a10 10 0 0 1 0 14.4"/>',
  tech: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><rect x="10" y="10" width="4" height="4" rx=".5"/><path d="M10 3.5V7M14 3.5V7M10 17v3.5M14 17v3.5M3.5 10H7M3.5 14H7M17 10h3.5M17 14h3.5"/>',
  abilities: '<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z"/><path d="M12 7.5l4 7H8zM12 3v4.5M19.8 16.5L16 14.5M4.2 16.5L8 14.5"/>',
  skills: '<path d="M4 6.5l1.5 1.5L8.5 5M4 12.5l1.5 1.5 3-3M4 18.5l1.5 1.5 3-3M11.5 6.5H20M11.5 12.5H20M11.5 18.5H20"/>',
  proficiencies: '<path d="M4 5h16v11H10l-4.5 4v-4H4z"/><path d="M8 9h8M8 12.3h5"/>',
  equipment: '<path d="M6 8.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2V19a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z"/><path d="M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5M6 12.5h12M10 12.5v2h4v-2"/>',
  classes: '<path d="M3 20h4.5v-4.5H12V11h4.5V6.5H21"/><path d="M17.5 3.5H21V7"/>',
  features: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/>',
  feats: '<circle cx="12" cy="9" r="5"/><path d="M8.7 12.8L7.5 21l4.5-2.4 4.5 2.4-1.2-8.2"/>',
  custom: '<path d="M15 4.5l4.5 4.5L9 19.5H4.5V15z"/><path d="M12.5 7l4.5 4.5"/>',
  species: '<path d="M7 3c0 4.5 10 4.5 10 9s-10 4.5-10 9M17 3c0 4.5-10 4.5-10 9s10 4.5 10 9"/><path d="M8.6 5.5h6.8M7.6 12h8.8M8.6 18.5h6.8"/>',
  background: '<path d="M3 6.5l6-2.5 6 2.5 6-2.5V18l-6 2.5L9 18l-6 2.5z"/><path d="M9 4v14M15 6.5v14"/>',
  personality: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.5c1.8 2 5.2 2 7 0M9 9.5v.5M15 9.5v.5"/>',
  backstory: '<path d="M12 6.5C10 5 7 4.5 4 5v13.5c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5V20"/>',
  notes: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 8.5h6M9 12h6M9 15.5h3.5"/>',
  data: '<path d="M4 7h9.5M18.5 7H20M4 17h3.5M12.5 17H20"/><circle cx="16" cy="7" r="2.3"/><circle cx="10" cy="17" r="2.3"/>',
  // controls
  sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  moon: '<path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1 0 1.7-.7 1.7-1.6 0-.5-.2-.8-.5-1.1-.3-.3-.5-.7-.5-1.1 0-.9.8-1.6 1.7-1.6h2a4.1 4.1 0 0 0 4.1-4.1c0-4.2-3.8-7.5-8.5-7.5z"/><circle cx="7.8" cy="11.5" r=".9"/><circle cx="10" cy="7.6" r=".9"/><circle cx="14.6" cy="7.6" r=".9"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="8.6" cy="8.6" r=".9"/><circle cx="15.4" cy="8.6" r=".9"/><circle cx="12" cy="12" r=".9"/><circle cx="8.6" cy="15.4" r=".9"/><circle cx="15.4" cy="15.4" r=".9"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  expand: '<path d="M7 9l5-5 5 5M7 15l5 5 5-5"/>',
  collapse: '<path d="M7 4l5 5 5-5M7 20l5-5 5 5"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17.5l5-4.5 3.5 3 3-2.5 4.5 4"/>',
  upload: '<path d="M12 15.5V4M7.5 8.5L12 4l4.5 4.5M4.5 15v3.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V15"/>',
};

/** An icon as inline SVG (decorative: hidden from screen readers; the button or link around it carries the name). */
function uiIcon(name, cls = '') {
  const p = ICON_PATHS[name];
  if (!p) return '';
  return `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${p}</svg>`;
}
