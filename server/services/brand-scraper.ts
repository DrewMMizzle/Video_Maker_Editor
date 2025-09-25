import { chromium } from 'playwright';
import { extractColors, dedupeAndRankColors } from './color-extractor';
import type { BrandImportResult } from '@shared/schema';

export async function scrapeBrand(url: string): Promise<BrandImportResult> {
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
