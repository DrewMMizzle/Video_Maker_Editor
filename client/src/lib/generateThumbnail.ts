import type { Project, Pane } from '@shared/schema';

// Shared constant to match schema validation
export const MAX_THUMBNAIL_SIZE = 500000; // ~500KB limit for base64

interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number; // 0-1, affects JPEG quality and file size
  maxAttempts?: number; // Max attempts to reduce size
}

/**
 * Generates a thumbnail image from the active pane of a project
 * Returns a base64 data URL suitable for storage and display
 */
export async function generateThumbnail(
  project: Project, 
  options: ThumbnailOptions = {}
): Promise<string> {
  const { width = 200, height = 200, quality = 0.8, maxAttempts = 5 } = options;
  
  if (!project.panes.length) {
    throw new Error('No panes to generate thumbnail from');
  }

  // Use active pane or first pane if no active pane
  const activePane = project.panes.find(p => p.id === project.activePaneId) || project.panes[0];
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to create canvas context');
  }

  canvas.width = width;
  canvas.height = height;

  // Calculate scale to fit project canvas in thumbnail while maintaining aspect ratio
  const scaleX = width / project.canvas.width;
  const scaleY = height / project.canvas.height;
  const scale = Math.min(scaleX, scaleY);

  // Center the scaled content
  const scaledWidth = project.canvas.width * scale;
  const scaledHeight = project.canvas.height * scale;
  const offsetX = (width - scaledWidth) / 2;
  const offsetY = (height - scaledHeight) / 2;

  // Clear and fill background
  ctx.fillStyle = '#f5f5f5'; // Light gray background for the thumbnail area
  ctx.fillRect(0, 0, width, height);

  // Save context and apply scaling and centering
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Render the pane
  await renderPaneToContext(ctx, activePane, project.canvas.width, project.canvas.height);

  ctx.restore();

  // Convert to base64 with bounded optimization for file size
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  let attempts = 0;
  let currentQuality = quality;
  let currentWidth = width;
  let currentHeight = height;
  
  while (dataUrl.length > MAX_THUMBNAIL_SIZE && attempts < maxAttempts) {
    attempts++;
    
    if (attempts === 1) {
      // First attempt: reduce JPEG quality
      currentQuality = 0.6;
      dataUrl = canvas.toDataURL('image/jpeg', currentQuality);
    } else if (attempts === 2) {
      // Second attempt: try PNG
      dataUrl = canvas.toDataURL('image/png');
    } else {
      // Subsequent attempts: reduce dimensions and regenerate
      currentWidth = Math.floor(currentWidth * 0.8);
      currentHeight = Math.floor(currentHeight * 0.8);
      
      if (currentWidth < 50 || currentHeight < 50) {
        throw new Error('Unable to generate thumbnail under size limit - minimum dimensions reached');
      }
      
      // Regenerate thumbnail with smaller dimensions
      const smallerCanvas = document.createElement('canvas');
      const smallerCtx = smallerCanvas.getContext('2d');
      if (!smallerCtx) {
        throw new Error('Unable to create smaller canvas context');
      }
      
      smallerCanvas.width = currentWidth;
      smallerCanvas.height = currentHeight;
      
      // Recalculate scaling for smaller dimensions
      const newScaleX = currentWidth / project.canvas.width;
      const newScaleY = currentHeight / project.canvas.height;
      const newScale = Math.min(newScaleX, newScaleY);
      
      const newScaledWidth = project.canvas.width * newScale;
      const newScaledHeight = project.canvas.height * newScale;
      const newOffsetX = (currentWidth - newScaledWidth) / 2;
      const newOffsetY = (currentHeight - newScaledHeight) / 2;
      
      // Clear and fill background
      smallerCtx.fillStyle = '#f5f5f5';
      smallerCtx.fillRect(0, 0, currentWidth, currentHeight);
      
      // Render at smaller scale
      smallerCtx.save();
      smallerCtx.translate(newOffsetX, newOffsetY);
      smallerCtx.scale(newScale, newScale);
      
      await renderPaneToContext(smallerCtx, activePane, project.canvas.width, project.canvas.height);
      
      smallerCtx.restore();
      dataUrl = smallerCanvas.toDataURL('image/jpeg', 0.7);
    }
  }
  
  if (dataUrl.length > MAX_THUMBNAIL_SIZE) {
    throw new Error(`Unable to generate thumbnail under ${MAX_THUMBNAIL_SIZE} bytes after ${maxAttempts} attempts`);
  }

  return dataUrl;
}

/**
 * Renders a single pane to a canvas context
 * Adapted from the video export rendering logic
 */
async function renderPaneToContext(
  ctx: CanvasRenderingContext2D,
  pane: Pane,
  canvasWidth: number,
  canvasHeight: number
): Promise<void> {
  // Clear and set background
  ctx.fillStyle = pane.bgColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Load and cache images before rendering
  const imageCache = new Map<string, HTMLImageElement>();
  
  // Pre-load all images in the pane
  const imageElements = pane.elements.filter(el => el.type === 'image' && el.src);
  await Promise.all(
    imageElements.map(async (element) => {
      if (element.type === 'image' && element.src) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous'; // Handle CORS for thumbnails
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = element.src!;
          });
          imageCache.set(element.src, img);
        } catch (error) {
          console.warn('Failed to load image for thumbnail:', element.src, error);
        }
      }
    })
  );

  // Render elements in z order
  const sortedElements = [...pane.elements].sort((a, b) => a.z - b.z);
  
  for (const element of sortedElements) {
    ctx.save();
    
    ctx.globalAlpha = element.opacity;
    ctx.translate(element.x, element.y);
    ctx.rotate((element.rotation * Math.PI) / 180);

    if (element.type === 'text') {
      ctx.fillStyle = element.color;
      ctx.font = `${element.fontWeight} ${element.fontSize}px ${element.fontFamily}`;
      ctx.textAlign = element.align as CanvasTextAlign;
      ctx.textBaseline = 'middle';
      
      // Handle background
      if (element.bgColor) {
        const lines = element.text.split('\n');
        const lineHeight = element.fontSize * element.lineHeight;
        const totalHeight = lines.length * lineHeight;
        const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
        
        ctx.fillStyle = element.bgColor;
        ctx.fillRect(
          element.align === 'center' ? -maxWidth / 2 - element.padding : 
          element.align === 'right' ? -maxWidth - element.padding : -element.padding,
          -totalHeight / 2 - element.padding,
          maxWidth + element.padding * 2,
          totalHeight + element.padding * 2
        );
      }

      // Render text
      ctx.fillStyle = element.color;
      const lines = element.text.split('\n');
      const lineHeight = element.fontSize * element.lineHeight;
      const startY = -(lines.length - 1) * lineHeight / 2;
      
      lines.forEach((line, index) => {
        ctx.fillText(line, 0, startY + index * lineHeight);
      });
    } else if (element.type === 'image' && element.src) {
      const img = imageCache.get(element.src);
      if (img) {
        const drawWidth = element.width || img.naturalWidth;
        const drawHeight = element.height || img.naturalHeight;
        
        ctx.drawImage(
          img,
          -drawWidth / 2,
          -drawHeight / 2,
          drawWidth,
          drawHeight
        );
      }
    } else if (element.type === 'icon' && element.name) {
      // For icons, we'll render a simple placeholder for thumbnails
      // since we can't easily render Lucide icons to canvas
      ctx.fillStyle = element.color;
      ctx.fillRect(-element.size / 2, -element.size / 2, element.size, element.size);
    }
    
    ctx.restore();
  }
}

/**
 * Generates a thumbnail for a specific pane
 * Used for displaying pane previews in the timeline/scenes panel
 */
export async function generatePaneThumbnail(
  pane: Pane,
  canvasWidth: number,
  canvasHeight: number,
  options: ThumbnailOptions = {}
): Promise<string> {
  const { width = 120, height = 120, quality = 0.8, maxAttempts = 3 } = options;
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to create canvas context');
  }

  canvas.width = width;
  canvas.height = height;

  // Calculate scale to fit project canvas in thumbnail while maintaining aspect ratio
  const scaleX = width / canvasWidth;
  const scaleY = height / canvasHeight;
  const scale = Math.min(scaleX, scaleY);

  // Center the scaled content
  const scaledWidth = canvasWidth * scale;
  const scaledHeight = canvasHeight * scale;
  const offsetX = (width - scaledWidth) / 2;
  const offsetY = (height - scaledHeight) / 2;

  // Clear and fill background
  ctx.fillStyle = '#f5f5f5'; // Light gray background for the thumbnail area
  ctx.fillRect(0, 0, width, height);

  // Save context and apply scaling and centering
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Render the pane
  await renderPaneToContext(ctx, pane, canvasWidth, canvasHeight);

  ctx.restore();

  // Convert to base64 with optimization for smaller thumbnails
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  let attempts = 0;
  
  // For pane thumbnails, we use a more relaxed size limit since they're smaller
  const paneThumbnailSizeLimit = 100000; // ~100KB limit for pane thumbnails
  
  while (dataUrl.length > paneThumbnailSizeLimit && attempts < maxAttempts) {
    attempts++;
    
    if (attempts === 1) {
      // First attempt: reduce JPEG quality
      dataUrl = canvas.toDataURL('image/jpeg', 0.6);
    } else {
      // Subsequent attempts: reduce quality further
      dataUrl = canvas.toDataURL('image/jpeg', 0.4);
    }
  }

  return dataUrl;
}

/**
 * Generates a thumbnail for the current project state in the store
 * Convenience function for use in components
 */
export async function generateCurrentThumbnail(): Promise<string> {
  // This will be used by components that have access to the project store
  // Implementation will depend on how we structure the store access
  throw new Error('generateCurrentThumbnail needs to be implemented with store access');
}