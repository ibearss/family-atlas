// Comic-book / pop-art theme - the single source of truth for the cartoon look.
// Bold black outlines, primary colors, hard offset shadows, halftone energy.
// Components import these tokens and helper style fragments so the look stays
// consistent across the app. No em dashes anywhere by project rule.

export const theme = {
  // Core ink + surfaces
  ink:        '#16161d',   // near-black for all outlines and text
  paper:      '#fffdf7',   // near-white panel surface
  page:       '#f4f1e8',   // soft warm off-white page background
  white:      '#ffffff',

  // Pop primaries (also used for accents/badges)
  red:        '#ff3b3b',   // home
  blue:       '#3b82f6',   // travel
  yellow:     '#ffd23f',
  teal:       '#2ec4b6',
  pink:       '#ff5fa2',
  purple:     '#9b5de5',

  // Muted/secondary text on cream
  inkSoft:    'rgba(22,22,29,0.66)',
  inkFaint:   'rgba(22,22,29,0.4)',

  // Type
  display:    "'Bangers', system-ui, cursive",            // big comic titles
  body:       "'Nunito', system-ui, -apple-system, sans-serif", // bold rounded body

  // Structure
  radius:     14,
  radiusSm:   10,
  outline:    '3px solid #16161d',
  outlineThick: '4px solid #16161d',
  shadow:     '4px 4px 0 #16161d',
  shadowSm:   '3px 3px 0 #16161d',
  shadowLg:   '6px 6px 0 #16161d',
};

// A comic panel: cream surface, thick black outline, hard offset shadow.
export function panel(extra = {}) {
  return {
    background: theme.paper,
    border: theme.outline,
    borderRadius: theme.radius,
    boxShadow: theme.shadow,
    ...extra,
  };
}

// A chunky comic button. Pass a fill color (defaults to yellow).
export function button(fill = theme.yellow, extra = {}) {
  return {
    fontFamily: theme.body,
    fontWeight: 800,
    fontSize: 15,
    letterSpacing: 0.3,
    color: theme.ink,
    background: fill,
    border: theme.outline,
    borderRadius: theme.radiusSm,
    boxShadow: theme.shadowSm,
    padding: '9px 18px',
    cursor: 'pointer',
    transition: 'transform 0.08s ease, box-shadow 0.08s ease',
  };
}

// A small outlined chip/badge.
export function chip(fill = theme.white, extra = {}) {
  return {
    fontFamily: theme.body,
    fontWeight: 800,
    fontSize: 11,
    color: theme.ink,
    background: fill,
    border: '2px solid #16161d',
    borderRadius: 999,
    padding: '2px 9px',
    ...extra,
  };
}

// Halftone dot background layer (use as a CSS background-image value).
export const halftone =
  'radial-gradient(rgba(22,22,29,0.14) 1.4px, transparent 1.6px)';
export const halftoneSize = '14px 14px';
