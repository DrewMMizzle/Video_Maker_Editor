import type { Project } from '@shared/schema';
import type Konva from 'konva';

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
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
  });

  const chunks: Blob[] = [];
  
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
      reject(new Error('MediaRecorder error: ' + (event.error || 'Unknown error')));
    };

    mediaRecorder.start();

    // Render each pane for its duration using Konva stage
    renderPanesSequentiallyWithStage(canvas, ctx, stage, project, setActivePane, 0, () => {
      mediaRecorder.stop();
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
  
  // Switch to this pane and wait for render
  setActivePane(pane.id);
  
  // Wait longer for the stage to properly update with all elements
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const startTime = Date.now();
  
  // Render frames synchronously at fixed intervals
  const renderFramesForPane = async () => {
    let frameCount = 0;
    const totalFrames = Math.ceil(duration / frameDuration);
    
    while (frameCount < totalFrames) {
      const elapsed = frameCount * frameDuration;
      
      try {
        // Clear the export canvas and fill with pane background
        ctx.fillStyle = pane.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Get the stage content as a data URL at exact project dimensions
        const stageDataURL = stage.toDataURL({
          pixelRatio: 1,
          width: project.canvas.width,
          height: project.canvas.height,
        });
        
        // Synchronously draw the stage content - AWAIT this time!
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          
          const timeout = setTimeout(() => {
            reject(new Error('Frame capture timeout'));
          }, 500); // Shorter timeout per frame
          
          img.onload = () => {
            clearTimeout(timeout);
            try {
              // Draw directly without scaling - stage already matches canvas dimensions
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve();
            } catch (drawError) {
              reject(drawError);
            }
          };
          
          img.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Failed to load frame image'));
          };
          
          img.src = stageDataURL;
        });
        
      } catch (error) {
        console.warn(`Failed to capture frame ${frameCount}:`, error);
        // Fallback: fill with background color
        ctx.fillStyle = pane.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      frameCount++;
      
      // Small delay between frames to ensure MediaRecorder captures
      await new Promise(resolve => setTimeout(resolve, 16));
    }
  };
  
  // Render all frames for this pane
  await renderFramesForPane();
  
  // Move to next pane
  renderPanesSequentiallyWithStage(canvas, ctx, stage, project, setActivePane, paneIndex + 1, onComplete);
}
