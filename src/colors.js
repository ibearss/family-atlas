// Deterministic color from a person's name — same name always gets same color
export function nameToColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  // Avoid red (used for home) and blue (used for travel) ranges
  const adjusted = (hue + 40) % 360;
  return `hsl(${adjusted}, 65%, 60%)`;
}

export function nameToColorDark(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const adjusted = (hue + 40) % 360;
  return `hsl(${adjusted}, 55%, 38%)`;
}
