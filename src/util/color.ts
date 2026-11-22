export function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const value = parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Extracts the hex color out of a theme Tailwind class like "bg-[#1a1a1a]"
 * and returns an rgba() string. Tailwind's static scanner can't see opacity
 * modifiers appended to a dynamic class (e.g. `${colors.current.background.secondary}/60`),
 * so translucent theme backgrounds must be applied via inline style instead.
 */
export function themeAlpha(twClass: string, alpha: number) {
  const match = twClass.match(/#([0-9a-fA-F]{3,8})/);
  if (!match) return undefined;
  return hexToRgba(match[0], alpha);
}
