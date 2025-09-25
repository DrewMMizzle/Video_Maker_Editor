export interface FontDefinition {
  family: string;
  variants: FontVariant[];
  category: 'serif' | 'sans-serif' | 'monospace' | 'display' | 'handwriting';
  source: 'google' | 'system' | 'local';
}

export interface FontVariant {
  weight: number;
  style: 'normal' | 'italic';
  url?: string;
}

export const SYSTEM_FONTS: FontDefinition[] = [
  {
    family: 'Inter',
    variants: [
      { weight: 300, style: 'normal' },
      { weight: 400, style: 'normal' },
      { weight: 500, style: 'normal' },
      { weight: 600, style: 'normal' },
      { weight: 700, style: 'normal' },
      { weight: 900, style: 'normal' },
    ],
    category: 'sans-serif',
    source: 'google',
  },
  {
    family: 'Roboto',
    variants: [
      { weight: 300, style: 'normal' },
      { weight: 400, style: 'normal' },
      { weight: 500, style: 'normal' },
      { weight: 700, style: 'normal' },
      { weight: 900, style: 'normal' },
    ],
    category: 'sans-serif',
    source: 'google',
  },
  {
    family: 'Playfair Display',
    variants: [
      { weight: 400, style: 'normal' },
      { weight: 500, style: 'normal' },
      { weight: 600, style: 'normal' },
      { weight: 700, style: 'normal' },
      { weight: 900, style: 'normal' },
    ],
    category: 'serif',
    source: 'google',
  },
  {
    family: 'Open Sans',
    variants: [
      { weight: 300, style: 'normal' },
      { weight: 400, style: 'normal' },
      { weight: 500, style: 'normal' },
      { weight: 600, style: 'normal' },
      { weight: 700, style: 'normal' },
    ],
    category: 'sans-serif',
    source: 'google',
  },
  {
    family: 'Montserrat',
    variants: [
      { weight: 300, style: 'normal' },
      { weight: 400, style: 'normal' },
      { weight: 500, style: 'normal' },
      { weight: 600, style: 'normal' },
      { weight: 700, style: 'normal' },
      { weight: 900, style: 'normal' },
    ],
    category: 'sans-serif',
    source: 'google',
  }
];

// Track loaded fonts to avoid duplicate requests
const loadedFonts = new Set<string>();
const loadingPromises = new Map<string, Promise<void>>();

export function getFontKey(family: string, weight: number = 400, style: string = 'normal'): string {
  return `${family}:${weight}:${style}`;
}

export async function loadGoogleFont(
  family: string, 
  weights: number[] = [400],
  display: string = 'swap'
): Promise<void> {
  const fontKey = `${family}:${weights.join(',')}`;
  
  // Return existing promise if font is already loading
  if (loadingPromises.has(fontKey)) {
    return loadingPromises.get(fontKey);
  }

  // Return immediately if already loaded
  if (loadedFonts.has(fontKey)) {
    return Promise.resolve();
  }

  const loadPromise = new Promise<void>((resolve, reject) => {
    try {
      // Create Google Fonts URL
      const weightsParam = weights.join(';');
      const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weightsParam}&display=${display}`;
      
      // Check if link already exists
      const existingLink = document.querySelector(`link[href*="${encodeURIComponent(family)}"]`);
      if (existingLink) {
        loadedFonts.add(fontKey);
        resolve();
        return;
      }

      // Create and inject font link
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = fontUrl;
      
      link.onload = () => {
        loadedFonts.add(fontKey);
        
        // Wait for font to be actually available
        if ('fonts' in document) {
          const fontFaces = weights.map(weight => 
            new FontFace(family, `url(${fontUrl})`, { weight: weight.toString() })
          );
          
          Promise.all(
            fontFaces.map(font => font.load().then(() => document.fonts.add(font)))
          ).then(() => {
            resolve();
          }).catch(() => {
            // Fallback: assume font is loaded after delay
            setTimeout(resolve, 100);
          });
        } else {
          // Fallback for browsers without FontFace API
          setTimeout(resolve, 100);
        }
      };
      
      link.onerror = () => {
        console.warn(`Failed to load font: ${family}`);
        resolve(); // Don't reject, allow fallback fonts
      };
      
      document.head.appendChild(link);
    } catch (error) {
      console.error('Error loading Google Font:', error);
      resolve(); // Don't reject, allow fallback fonts
    }
  });

  loadingPromises.set(fontKey, loadPromise);
  
  return loadPromise.finally(() => {
    loadingPromises.delete(fontKey);
  });
}

export function isFontLoaded(family: string, weight: number = 400): boolean {
  return loadedFonts.has(getFontKey(family, weight));
}

export async function loadMultipleFonts(fonts: Array<{ family: string; weights?: number[] }>): Promise<void> {
  const loadPromises = fonts.map(({ family, weights = [400] }) =>
    loadGoogleFont(family, weights)
  );
  
  await Promise.allSettled(loadPromises);
}

export function getFontStack(primaryFont: string, category: 'serif' | 'sans-serif' | 'monospace' = 'sans-serif'): string {
  const fallbackStacks = {
    'serif': 'Georgia, "Times New Roman", Times, serif',
    'sans-serif': '"Helvetica Neue", Helvetica, Arial, sans-serif',
    'monospace': '"SF Mono", Monaco, Inconsolata, "Roboto Mono", Consolas, "Courier New", monospace'
  };
  
  return `"${primaryFont}", ${fallbackStacks[category]}`;
}

export async function preloadProjectFonts(fonts: string[]): Promise<void> {
  const uniqueFonts = Array.from(new Set(fonts));
  const fontLoadPromises = uniqueFonts
    .filter(font => !isFontLoaded(font))
    .map(font => loadGoogleFont(font, [300, 400, 500, 600, 700, 900]));
  
  await Promise.allSettled(fontLoadPromises);
}

// Font pairing presets
export const FONT_PAIRINGS = [
  {
    name: 'Modern Professional',
    headings: 'Inter',
    body: 'Inter',
    category: 'sans-serif' as const,
  },
  {
    name: 'Classic Elegant',
    headings: 'Playfair Display', 
    body: 'Source Serif Pro',
    category: 'serif' as const,
  },
  {
    name: 'Clean Minimal',
    headings: 'Roboto',
    body: 'Open Sans',
    category: 'sans-serif' as const,
  },
  {
    name: 'Creative Bold',
    headings: 'Montserrat',
    body: 'Lora',
    category: 'mixed' as const,
  },
  {
    name: 'Tech Startup',
    headings: 'Space Grotesk',
    body: 'Inter',
    category: 'sans-serif' as const,
  }
];

// Check if browser supports font loading
export function supportsFontLoading(): boolean {
  return 'fonts' in document && 'FontFace' in window;
}

// Get available system fonts (simplified detection)
export function getSystemFonts(): string[] {
  const testFonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 
    'Verdana', 'Courier New', 'Trebuchet MS', 'Arial Black',
    'Impact', 'Comic Sans MS', 'Palatino', 'Garamond'
  ];
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  
  const baseFonts = ['serif', 'sans-serif', 'monospace'];
  const testString = 'mmmmmmmmmmlli';
  const testSize = '72px';
  
  // Get baseline widths
  const baseWidths = baseFonts.map(font => {
    ctx.font = `${testSize} ${font}`;
    return ctx.measureText(testString).width;
  });
  
  return testFonts.filter(font => {
    return baseFonts.some((baseFont, index) => {
      ctx.font = `${testSize} ${font}, ${baseFont}`;
      return ctx.measureText(testString).width !== baseWidths[index];
    });
  });
}
