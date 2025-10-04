import { useState, useEffect, useRef } from 'react';

interface ImageState {
  element: HTMLImageElement | HTMLCanvasElement | null;
  loading: boolean;
  error: boolean;
}

// Cache for loaded images to prevent reloading
const imageCache = new Map<string, HTMLCanvasElement>();
const rawImageCache = new Map<string, HTMLImageElement>();

// Enhanced image loader with color space normalization and high-quality rendering
export async function loadImage(url: string, skipCanvasConversion = false): Promise<HTMLImageElement | HTMLCanvasElement> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  img.src = url;
  await img.decode();

  // For GIFs and other cases where we need the raw image, return it directly
  if (skipCanvasConversion) {
    return img;
  }

  // Optional: normalize to sRGB canvas to avoid wide-gamut mismatch
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  // @ts-ignore
  const ctx = canvas.getContext('2d', { colorSpace: 'srgb' }) || canvas.getContext('2d');
  ctx!.imageSmoothingEnabled = true;
  // @ts-ignore
  ctx!.imageSmoothingQuality = 'high';
  ctx!.drawImage(img, 0, 0);

  return canvas; // return canvas as the image source for Konva
}

export function useImageLoader(src: string, skipCanvasConversion = false): ImageState {
  const [state, setState] = useState<ImageState>({
    element: null,
    loading: true,
    error: false
  });
  
  const currentSrcRef = useRef<string>(src);

  useEffect(() => {
    currentSrcRef.current = src;
    
    // Check appropriate cache first
    if (skipCanvasConversion && rawImageCache.has(src)) {
      const cachedImage = rawImageCache.get(src)!;
      setState({
        element: cachedImage,
        loading: false,
        error: false
      });
      return;
    } else if (!skipCanvasConversion && imageCache.has(src)) {
      const cachedImage = imageCache.get(src)!;
      setState({
        element: cachedImage,
        loading: false,
        error: false
      });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: false }));

    // Use enhanced loader for better quality
    loadImage(src, skipCanvasConversion)
      .then((element) => {
        // Only update state if this is still the current src
        if (currentSrcRef.current === src) {
          if (skipCanvasConversion) {
            rawImageCache.set(src, element as HTMLImageElement);
          } else {
            imageCache.set(src, element as HTMLCanvasElement);
          }
          setState({
            element,
            loading: false,
            error: false
          });
        }
      })
      .catch((error) => {
        // Only update state if this is still the current src
        if (currentSrcRef.current === src) {
          console.warn(`Failed to load image: ${src}`, error);
          setState({
            element: null,
            loading: false,
            error: true
          });
        }
      });

    // Cleanup function (no cleanup needed for promises)
    return () => {
      // Nothing to cleanup for promise-based loading
    };
  }, [src, skipCanvasConversion]);

  return state;
}