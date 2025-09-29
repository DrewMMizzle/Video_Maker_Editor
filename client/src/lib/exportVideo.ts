import type { Project } from '@shared/schema';
import type Konva from 'konva';

// Direct layer composition - much faster than stage.toDataURL()
function drawStageInto(ctx: CanvasRenderingContext2D, stage: Konva.Stage) {
  const layers = stage.getLayers();
  
  // Composite each layer's canvas directly into export canvas
  layers.forEach((layer) => {
    // Access Konva's internal canvas - this is stable and commonly used
    // @ts-ignore private access to layer canvas
    const layerCanvas: HTMLCanvasElement = layer.getCanvas()._canvas;
    if (layerCanvas) {
      ctx.drawImage(layerCanvas, 0, 0);
    }
  });
}

// Wait for all assets and rendering to be ready
async function waitForPaneReady(promises: Promise<any>[] = []) {
  try {
    // Wait for fonts to be ready
    await document.fonts.ready;
  } catch (e) {
    // Font loading can fail in some browsers, continue anyway
  }
  
  try {
    // Wait for any provided asset promises
    await Promise.allSettled(promises);
  } catch (e) {
    // Continue even if some assets fail
  }
  
  // Wait for two RAF ticks to ensure rendering is complete
  await new Promise(r => requestAnimationFrame(() => r(null)));
  await new Promise(r => requestAnimationFrame(() => r(null)));
}

export async function exportVideo(project: Project): Promise<void> {
  throw new Error('Direct export not supported. Use exportVideoWithStage from StageCanvas.');
}

export async function exportVideoWithKonvaStage(
  stage: Konva.Stage,
  project: Project,
  setActivePane: (paneId: string) => void
): Promise<void> {
  if (!project.panes.length) {
    throw new Error('No scenes to export');
  }

  // Check for MediaRecorder support
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
    throw new Error('Video recording is not supported in this browser');
  }

  // Calculate total expected duration and add safety margin
  const totalDuration = project.panes.reduce((acc, pane) => acc + pane.durationSec, 0);
  const timeoutDuration = Math.max(totalDuration * 1000 * 2, 30000); // 2x expected time or 30s minimum

  // Create a canvas that matches the project dimensions
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to create canvas context');
  }

  canvas.width = project.canvas.width;
  canvas.height = project.canvas.height;

  const stream = canvas.captureStream(30); // 30 FPS
  
  // Choose best supported codec with fallback
  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
      mimeType = 'video/webm;codecs=vp8';
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      mimeType = 'video/webm';
    } else {
      mimeType = ''; // Use browser default
    }
  }
  
  const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});

  const chunks: Blob[] = [];
  
  // Ensure export canvas exactly matches stage dimensions
  canvas.width = stage.width();
  canvas.height = stage.height();

  // Wait for initial setup - fonts and first pane assets
  try {
    await waitForPaneReady();
    stage.draw(); // Force initial draw
  } catch (e) {
    console.warn('Initial setup warning:', e);
  }
  
  return new Promise((resolve, reject) => {
    // Add global timeout to prevent hanging
    const globalTimeout = setTimeout(() => {
      mediaRecorder.stop();
      reject(new Error(`Export timeout after ${timeoutDuration/1000} seconds. Please try again or check for errors.`));
    }, timeoutDuration);
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      clearTimeout(globalTimeout); // Clear the timeout when export completes
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.id || 'video'}_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      resolve();
    };

    mediaRecorder.onerror = (event: any) => {
      clearTimeout(globalTimeout);
      reject(new Error('MediaRecorder error: ' + (event.error || 'Unknown error')));
    };

    mediaRecorder.start();

    // Render each pane for its duration using optimized approach
    renderPanesSequentiallyWithStage(canvas, ctx, stage, project, setActivePane, 0, () => {
      mediaRecorder.stop();
    }).catch((error) => {
      clearTimeout(globalTimeout);
      mediaRecorder.stop();
      reject(error);
    });
  });
}

async function renderPanesSequentiallyWithStage(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  stage: Konva.Stage,
  project: Project,
  setActivePane: (paneId: string) => void,
  paneIndex: number,
  onComplete: () => void
) {
  if (paneIndex >= project.panes.length) {
    onComplete();
    return;
  }

  const pane = project.panes[paneIndex];
  const duration = pane.durationSec * 1000; // Convert to milliseconds
  const frameDuration = 1000 / 30; // 30 FPS - match MediaRecorder
  
  // Switch to this pane and wait for proper rendering
  setActivePane(pane.id);
  
  // Wait for pane to be ready with assets + rendering
  await waitForPaneReady();
  stage.draw(); // Force stage to update after pane switch
  
  // Render frames with proper wall-clock timing using direct layer composition
  const renderFramesForPane = async () => {
    const paneStartTime = performance.now();
    let frameCount = 0;
    
    while (true) {
      const currentTime = performance.now();
      const elapsed = currentTime - paneStartTime;
      
      // Check if pane duration is complete
      if (elapsed >= duration) {
        break;
      }
      
      // Wait for next frame using requestAnimationFrame for smooth pacing
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      // Only render frame if we're on the correct frame boundary
      const expectedFrameNumber = Math.floor(elapsed / frameDuration);
      if (frameCount <= expectedFrameNumber) {
        try {
          // Clear the export canvas and fill with pane background
          ctx.fillStyle = pane.bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Direct layer composition - much faster than toDataURL()
          drawStageInto(ctx, stage);
          
        } catch (error) {
          console.warn(`Failed to capture frame ${frameCount}:`, error);
          // Fallback: fill with background color only
          ctx.fillStyle = pane.bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        frameCount++;
      }
    }
  };
  
  // Render all frames for this pane
  await renderFramesForPane();
  
  // Move to next pane
  renderPanesSequentiallyWithStage(canvas, ctx, stage, project, setActivePane, paneIndex + 1, onComplete);
}
