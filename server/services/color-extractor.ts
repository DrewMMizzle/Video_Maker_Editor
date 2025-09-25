export function extractColors(inputs: (string | null | undefined)[]): string[] {
  const colors: string[] = [];
  
  for (const input of inputs) {
    if (!input) continue;
    
    const hexMatches = input.match(/#[0-9A-Fa-f]{6}/g);
    if (hexMatches) {
      colors.push(...hexMatches);
    }
    
    const rgbMatches = input.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g);
    if (rgbMatches) {
      rgbMatches.forEach(rgb => {
        const match = rgb.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
        if (match) {
          const [, r, g, b] = match;
          const hex = `#${[r, g, b].map(n => parseInt(n).toString(16).padStart(2, '0')).join('')}`;
          colors.push(hex);
        }
      });
    }
    
    const hslMatches = input.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/g);
    if (hslMatches) {
      hslMatches.forEach(hsl => {
        const match = hsl.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/);
        if (match) {
          const [, h, s, l] = match.map(Number);
          const hex = hslToHex(h, s, l);
          colors.push(hex);
        }
      });
    }
  }
  
  return colors;
}

export function dedupeAndRankColors(colors: string[]): string[] {
  // Convert all colors to uppercase for consistency
  const normalized = colors.map(c => c.toUpperCase()).filter(c => /^#[0-9A-F]{6}$/.test(c));
  
  // Remove duplicates
  const unique = Array.from(new Set(normalized));
  
  // Filter out very light/dark colors and grays
  const filtered = unique.filter(hex => {
    const { r, g, b } = hexToRgb(hex);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const isGray = Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20;
    
    return brightness > 30 && brightness < 220 && !isGray;
  });
  
  // Sort by saturation and brightness for better palette
  return filtered.sort((a, b) => {
    const { h: h1, s: s1, l: l1 } = rgbToHsl(hexToRgb(a));
    const { h: h2, s: s2, l: l2 } = rgbToHsl(hexToRgb(b));
    
    // Prefer higher saturation, then moderate lightness
    const score1 = s1 * 100 + Math.abs(l1 - 0.5) * 50;
    const score2 = s2 * 100 + Math.abs(l2 - 0.5) * 50;
    
    return score2 - score1;
  });
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
