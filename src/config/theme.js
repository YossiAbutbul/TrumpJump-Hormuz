// The design system — one source of truth for colour, depth and type.
//
// These tokens are the "Kinetic Arcade" system designed in Stitch
// (project "Hormuz Tanker Jumper"), transcribed here so Phaser and the DOM
// modals draw from the same values. The game draws in two places that can't
// share a stylesheet: Phaser wants numbers (0xff535b), the DOM wants strings
// (#ff535b). So the palette is declared once as numbers and mirrored onto
// :root as CSS custom properties at load — which is why this file must be the
// first script in index.html.
//
// The system in one line: chunky shapes, a thick navy outline on everything,
// and depth from a hard offset edge rather than a blur. See DEPTH below.

window.THEME = {
  // ---- surfaces, darkest to lightest ----
  surfaceLowest: 0x000e24,
  surface: 0x00132d,        // the ground behind everything
  surfaceLow: 0x001b3c,
  surfaceContainer: 0x032041,
  surfaceHigh: 0x112a4c,
  surfaceHighest: 0x1d3557, // raised panels, secondary buttons
  outline: 0x1d3557,        // THE outline — every element gets this, 3-4px
  outlineVariant: 0x5b403f, // the warm outline used on chips and the HUD frame

  // ---- primary: the urgent action (PLAY, BUY). Nothing else. ----
  primary: 0xff535b,        // primary-container: the button fill
  primaryLight: 0xffb3b1,
  primaryInk: 0x5b000e,     // on-primary-container

  // ---- secondary: reward, currency, achievement ----
  secondary: 0xfbb400,      // secondary-container: the button fill
  secondaryLight: 0xffd795, // currency numerals
  secondaryInk: 0x694900,   // on-secondary-container — ink on gold

  // ---- tertiary: calm accents, secondary panels ----
  tertiary: 0x9ecfd1,
  tertiaryDeep: 0x68999b,

  error: 0xffb4ab,
  white: 0xffffff,
  onSurface: 0xd5e3ff,      // body copy on navy
  onSurfaceVariant: 0xe4bebc,

  // ---- DEPTH: no blur anywhere. A raised thing sits on a hard edge of
  // `outline`, and pressing it moves the face down onto that edge. ----
  edge: 4,                  // px of hard bottom edge under a button
  border: 4,                // px of navy outline around interactive things
  radius: 16,               // standard button/container corner
  radiusLg: 24,             // modals and menu cards
  radiusChip: 10,           // powerup tiles

  // ---- spacing: a 4px baseline grid ----
  unit: 4,
  gutter: 16,
  stackSm: 8,
  stackMd: 16,
  stackLg: 32,
};

// Type: three faces, three jobs — display shouts, body explains, mono labels.
window.FONT = '"Anybody", "Arial Black", Impact, sans-serif';        // headlines, scores
window.FONT_BODY = '"Be Vietnam Pro", "Trebuchet MS", sans-serif';   // menus, descriptions
window.FONT_LABEL = '"JetBrains Mono", ui-monospace, monospace';     // tiny caps labels

// Every headline is uppercase Anybody 900 with a hard, non-blurred navy drop
// shadow. This is the signature of the system — see stitch: drop-shadow-[0_2px_0_#1D3557].
window.TITLE_SHADOW = { x: 0, y: 4, color: '#1d3557', blur: 0 };

// Mirror every colour onto :root as --tj-<name> so the DOM modals style
// themselves from the same numbers Phaser draws with.
(function mirrorToCss() {
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');
  const px = new Set(['edge', 'border', 'radius', 'radiusLg', 'radiusChip',
    'unit', 'gutter', 'stackSm', 'stackMd', 'stackLg']);
  const root = document.documentElement;
  Object.entries(window.THEME).forEach(([k, v]) => {
    if (typeof v !== 'number') return;
    const name = '--tj-' + k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
    root.style.setProperty(name, px.has(k) ? v + 'px' : hex(v));
  });
  root.style.setProperty('--tj-font', window.FONT);
  root.style.setProperty('--tj-font-body', window.FONT_BODY);
  root.style.setProperty('--tj-font-label', window.FONT_LABEL);
}());
