import type { Pane, Project } from '@shared/schema';

export async function generatePaneThumbnail(
  pane: Pane,
  canvas: { width: number; height: number; background: string },
  maxSize: number = 200
): Promise<string> {
  const thumbnailCanvas = document.createElement('canvas');
  const ctx = thumbnailCanvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Unable to create thumbnail canvas context');
  }

  // Calculate scale to fit thumbnail size while maintaining aspect ratio
  const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height);
  thumbnailCanvas.width = canvas.width * scale;
  thumbnailCanvas.height = canvas.height * scale;

  // Scale context
  ctx.scale(scale, scale);

  // Fill background with pane color
  ctx.fillStyle = pane.bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Render elements
  for (const element of pane.elements) {
    ctx.save();
    
    ctx.globalAlpha = element.opacity;
    ctx.translate(element.x, element.y);
    ctx.rotate((element.rotation * Math.PI) / 180);

    if (element.type === 'text') {
      // Set font style
      const fontSize = Math.max(8, element.fontSize * 0.5); // Scale down font for thumbnail
      ctx.font = `${element.fontWeight} ${fontSize}px ${element.fontFamily}`;
      ctx.textAlign = element.align as CanvasTextAlign;
      ctx.textBaseline = 'middle';
      
      // Handle text background
      if (element.bgColor) {
        const lines = element.text.split('\n');
        const lineHeight = fontSize * element.lineHeight;
        const totalHeight = lines.length * lineHeight;
        const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
        
        ctx.fillStyle = element.bgColor;
        ctx.fillRect(
          element.align === 'center' ? -maxWidth / 2 - element.padding * scale : 
          element.align === 'right' ? -maxWidth - element.padding * scale : -element.padding * scale,
          -totalHeight / 2 - element.padding * scale,
          maxWidth + element.padding * 2 * scale,
          totalHeight + element.padding * 2 * scale
        );
      }

      // Draw text
      ctx.fillStyle = element.color;
      const lines = element.text.split('\n');
      const lineHeight = fontSize * element.lineHeight;
      const startY = -(lines.length - 1) * lineHeight / 2;
      
      lines.forEach((line, index) => {
        // Truncate long lines for thumbnails
        const truncatedLine = line.length > 20 ? line.substring(0, 20) + '...' : line;
        ctx.fillText(truncatedLine, 0, startY + index * lineHeight);
      });
    }

    if (element.type === 'image') {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Don't fail thumbnail generation for missing images
          img.src = element.src;
          
          // Timeout for image loading
          setTimeout(() => resolve(), 1000);
        });

        if (img.complete && img.naturalWidth > 0) {
          const imageScale = 0.3; // Scale down images for thumbnails
          ctx.drawImage(
            img,
            -element.width * imageScale / 2,
            -element.height * imageScale / 2,
            element.width * imageScale,
            element.height * imageScale
          );
        }
      } catch (error) {
        // Silently fail for thumbnail generation
        console.warn('Failed to load image for thumbnail:', element.src);
      }
    }

    if (element.type === 'icon') {
      // For thumbnails, draw a simple placeholder for icons
      ctx.strokeStyle = element.color;
      ctx.lineWidth = element.strokeWidth;
      const iconSize = element.size * 0.3; // Scale down for thumbnail
      
      ctx.beginPath();
      ctx.rect(-iconSize / 2, -iconSize / 2, iconSize, iconSize);
      ctx.stroke();
      
      // Add a simple "icon" indicator
      ctx.fillStyle = element.color;
      ctx.font = `${iconSize / 2}px Inter`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔷', 0, 0);
    }
    
    ctx.restore();
  }

  return thumbnailCanvas.toDataURL('image/jpeg', 0.7);
}

export async function updatePaneThumbnail(paneId: string, project: Project): Promise<string> {
  const pane = project.panes.find(p => p.id === paneId);
  if (!pane) {
    throw new Error('Pane not found');
  }

  return generatePaneThumbnail(pane, project.canvas);
}

export function createOffscreenRenderer(width: number, height: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  destroy: () => void;
} {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Unable to create offscreen canvas context');
  }

  canvas.width = width;
  canvas.height = height;

  return {
    canvas,
    ctx,
    destroy: () => {
      canvas.remove();
    }
  };
}

// Debounced thumbnail generation for performance
export function createDebouncedThumbnailGenerator(delay: number = 300) {
  const timeouts = new Map<string, NodeJS.Timeout>();

  return function generateThumbnailDebounced(
    paneId: string,
    pane: Pane,
    canvas: { width: number; height: number; background: string },
    callback: (thumbnail: string) => void
  ) {
    // Clear existing timeout for this pane
    const existingTimeout = timeouts.get(paneId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(async () => {
      try {
        const thumbnail = await generatePaneThumbnail(pane, canvas);
        callback(thumbnail);
        timeouts.delete(paneId);
      } catch (error) {
        console.error('Failed to generate thumbnail for pane:', paneId, error);
        timeouts.delete(paneId);
      }
    }, delay);

    timeouts.set(paneId, timeout);
  };
}
