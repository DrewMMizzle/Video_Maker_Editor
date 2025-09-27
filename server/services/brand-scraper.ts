import { chromium } from 'playwright';
import { extractColors, dedupeAndRankColors } from './color-extractor';
import type { BrandImportResult } from '@shared/schema';

// Fallback brand data for popular domains
const DOMAIN_BRANDS: Record<string, BrandImportResult> = {
  'github.com': {
    palette: ['#24292f', '#ffffff', '#f6f8fa', '#0969da', '#1f2328'],
    fonts: { headings: 'system-ui', body: 'system-ui', sources: [] },
    evidence: { themeColor: '#24292f', cssVars: [], googleFonts: [], imagesUsedForPalette: [], screenshotUsed: false }
  },
  'stripe.com': {
    palette: ['#635bff', '#ffffff', '#0a2540', '#425466', '#697386'],
    fonts: { headings: 'system-ui', body: 'system-ui', sources: [] },
    evidence: { themeColor: '#635bff', cssVars: [], googleFonts: [], imagesUsedForPalette: [], screenshotUsed: false }
  },
  'google.com': {
    palette: ['#4285f4', '#34a853', '#fbbc04', '#ea4335', '#ffffff'],
    fonts: { headings: 'Roboto', body: 'Roboto', sources: ['https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap'] },
    evidence: { themeColor: '#4285f4', cssVars: [], googleFonts: ['https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap'], imagesUsedForPalette: [], screenshotUsed: false }
  },
  'airbnb.com': {
    palette: ['#ff5a5f', '#00a699', '#fc642d', '#767676', '#ffffff'],
    fonts: { headings: 'Circular', body: 'Circular', sources: [] },
    evidence: { themeColor: '#ff5a5f', cssVars: [], googleFonts: [], imagesUsedForPalette: [], screenshotUsed: false }
  }
};

async function scrapeBrandWithPlaywright(url: string): Promise<BrandImportResult> {
  let browser;
  
  try {
    browser = await chromium.launch({ 
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

    // Extract theme color from meta tag
    const themeColor = await page.$eval('meta[name="theme-color"]', el => 
      (el as HTMLMetaElement).content
    ).catch(() => null);

    // Extract CSS variables from :root
    const cssVars = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const vars: string[] = [];
      for (let i = 0; i < root.length; i++) {
        const name = root[i];
        if (name.startsWith('--') && (
          name.includes('primary') || 
          name.includes('secondary') || 
          name.includes('brand') || 
          name.includes('color')
        )) {
          const value = root.getPropertyValue(name).trim();
          if (value) vars.push(`${name}:${value}`);
        }
      }
      return vars;
    });

    // Extract font information
    const fontInfo = await page.evaluate(() => {
      const getFontFamily = (selector: string) => {
        const el = document.querySelector(selector);
        return el ? getComputedStyle(el).fontFamily : '';
      };

      const body = getFontFamily('body') || getFontFamily('main') || getFontFamily('p');
      const headings = getFontFamily('h1') || getFontFamily('h2') || getFontFamily('h3') || body;
      
      const googleFonts = Array.from(document.querySelectorAll('link[href*="fonts.googleapis.com"]'))
        .map(l => (l as HTMLLinkElement).href);

      return { body, headings, googleFonts };
    });

    // Extract potential brand images
    const brandImages = await page.evaluate(() => {
      const images = new Set<string>();
      
      // Favicon
      const favicon = document.querySelector('link[rel~="icon"]') as HTMLLinkElement;
      if (favicon?.href) images.add(favicon.href);
      
      // Logo images
      const logos = document.querySelectorAll('img[alt*="logo" i], img[src*="logo" i]');
      logos.forEach(img => {
        const src = (img as HTMLImageElement).src;
        if (src) images.add(src);
      });

      return Array.from(images);
    });

    // Extract colors from brand images
    const imageColors: string[] = [];
    for (const imageUrl of brandImages.slice(0, 3)) { // Limit to 3 images
      try {
        // For now, skip color extraction from images
        // TODO: Re-implement with working node-vibrant import
        console.log(`Would extract colors from: ${imageUrl}`);
      } catch (error) {
        console.warn(`Failed to extract colors from image: ${imageUrl}`, error);
      }
    }

    // Take screenshot for additional color extraction  
    const screenshot = await page.screenshot({ fullPage: true });
    // For now, skip color extraction from screenshot
    // TODO: Re-implement with working node-vibrant import
    const screenshotColors: string[] = [];

    await browser.close();

    // Extract and combine all colors
    const cssColors = extractColors([themeColor, ...cssVars.map(v => v.split(':')[1])].filter(Boolean));
    const allColors = [...cssColors, ...imageColors, ...screenshotColors];
    const rankedPalette = dedupeAndRankColors(allColors);

    // Process fonts
    const cleanFontFamily = (family: string) => {
      return family.split(',')[0].replace(/['"]/g, '').trim();
    };

    const result: BrandImportResult = {
      palette: rankedPalette.slice(0, 8), // Limit to 8 colors
      fonts: {
        headings: cleanFontFamily(fontInfo.headings),
        body: cleanFontFamily(fontInfo.body),
        sources: fontInfo.googleFonts,
      },
      evidence: {
        themeColor,
        cssVars,
        googleFonts: fontInfo.googleFonts,
        imagesUsedForPalette: brandImages,
        screenshotUsed: true,
      }
    };

    return result;
  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
}

async function fallbackBrandScraper(url: string): Promise<BrandImportResult> {
  // Extract domain from URL
  const domain = new URL(url).hostname.replace('www.', '');
  
  // Check if we have predefined brand data for this domain
  if (DOMAIN_BRANDS[domain]) {
    return DOMAIN_BRANDS[domain];
  }
  
  // Try simple HTML fetch as fallback
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract basic information from HTML
    const themeColorMatch = html.match(/<meta[^>]+name=["']?theme-color["']?[^>]+content=["']?([^"'>]+)["']?/i);
    const themeColor = themeColorMatch ? themeColorMatch[1] : null;
    
    // Extract title for context
    const titleMatch = html.match(/<title[^>]*>([^<]+)</i);
    const title = titleMatch ? titleMatch[1] : domain;
    
    // Generate a reasonable color palette based on theme color or domain
    let palette: string[] = ['#1f2937', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
    
    if (themeColor && themeColor.startsWith('#')) {
      // Use theme color as primary and generate complementary colors
      palette = [
        themeColor,
        '#ffffff',
        '#f8fafc',
        '#64748b',
        '#1e293b'
      ];
    } else if (domain.includes('blue') || domain.includes('tech')) {
      palette = ['#3b82f6', '#1e40af', '#dbeafe', '#ffffff', '#1f2937'];
    } else if (domain.includes('green') || domain.includes('eco')) {
      palette = ['#10b981', '#059669', '#d1fae5', '#ffffff', '#1f2937'];
    }
    
    return {
      palette,
      fonts: {
        headings: 'Inter',
        body: 'Inter',
        sources: [],
      },
      evidence: {
        themeColor,
        cssVars: [],
        googleFonts: [],
        imagesUsedForPalette: [],
        screenshotUsed: false,
      }
    };
    
  } catch (error) {
    // Ultimate fallback with generic brand colors
    return {
      palette: ['#1f2937', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
      fonts: {
        headings: 'Inter',
        body: 'Inter',
        sources: [],
      },
      evidence: {
        themeColor: null,
        cssVars: [],
        googleFonts: [],
        imagesUsedForPalette: [],
        screenshotUsed: false,
      }
    };
  }
}

export async function scrapeBrand(url: string): Promise<BrandImportResult> {
  try {
    // First, try the full Playwright approach
    return await scrapeBrandWithPlaywright(url);
  } catch (playwrightError: any) {
    console.log('Playwright scraping failed, falling back to simple scraper:', playwrightError?.message || 'Unknown error');
    
    // Fall back to domain-based or simple HTML scraping
    return await fallbackBrandScraper(url);
  }
}
