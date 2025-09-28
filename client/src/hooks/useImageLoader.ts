import { useState, useEffect, useRef } from 'react';

interface ImageState {
  element: HTMLImageElement | HTMLCanvasElement | null;
  loading: boolean;
  error: boolean;
}

// Cache for loaded images to prevent reloading
const imageCache = new Map<string, HTMLCanvasElement>();

// Enhanced image loader with color space normalization and high-quality rendering
export async function loadImage(url: string): Promise<HTMLImageElement | HTMLCanvasElement> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  img.src = url;
  await img.decode();

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

export function useImageLoader(src: string): ImageState {
  const [state, setState] = useState<ImageState>({
    element: null,
    loading: true,
    error: false
  });
  
  const currentSrcRef = useRef<string>(src);

  useEffect(() => {
    currentSrcRef.current = src;
    
    // Check cache first
    if (imageCache.has(src)) {
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
    loadImage(src)
      .then((canvas) => {
        // Only update state if this is still the current src
        if (currentSrcRef.current === src) {
          imageCache.set(src, canvas as HTMLCanvasElement);
          setState({
            element: canvas,
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
  }, [src]);

  return state;
}