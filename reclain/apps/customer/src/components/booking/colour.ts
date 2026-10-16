// Picks readable text for a coloured background (WCAG relative luminance).
// Used for the professionals' initials, which sit on the venue's palette colours.

const INK = "#111013";
const WHITE = "#ffffff";

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const full = m[1].length === 3 ? [...m[1]].map(ch => ch + ch).join("") : m[1];
  const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Ink or white, whichever reads better on `bg`.
export function readableText(bg: string): string {
  return contrastRatio(bg, INK) >= contrastRatio(bg, WHITE) ? INK : WHITE;
}

// The nth team member's avatar: rotate through the venue palette (mid, light, dark…)
// and pick the text colour from the background, never from the position.
export function avatarColours(palette: [string, string, string], index: number): { background: string; color: string } {
  const background = palette[(index + 1) % 3];
  return { background, color: readableText(background) };
}
