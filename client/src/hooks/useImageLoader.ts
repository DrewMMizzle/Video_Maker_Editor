import { useState, useEffect, useRef } from 'react';

interface ImageState {
  element: HTMLImageElement | null;
  loading: boolean;
  error: boolean;
}

// Cache for loaded images to prevent reloading
const imageCache = new Map<string, HTMLImageElement>();

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

    const img = new Image();
    
    const handleLoad = () => {
      // Only update state if this is still the current src
      if (currentSrcRef.current === src) {
        imageCache.set(src, img);
        setState({
          element: img,
          loading: false,
          error: false
        });
      }
    };

    const handleError = () => {
      // Only update state if this is still the current src
      if (currentSrcRef.current === src) {
        console.warn(`Failed to load image: ${src}`);
        setState({
          element: null,
          loading: false,
          error: true
        });
      }
    };

    img.onload = handleLoad;
    img.onerror = handleError;
    
    // Set timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      if (currentSrcRef.current === src) {
        handleError();
      }
    }, 10000); // 10 second timeout

    img.src = src;

    return () => {
      clearTimeout(timeoutId);
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return state;
}