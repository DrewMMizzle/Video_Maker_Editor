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
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
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
  
  // Switch to this pane and wait for render
  setActivePane(pane.id);
  
  // Wait a moment for the stage to update
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const startTime = Date.now();
  const renderFrame = () => {
    const elapsed = Date.now() - startTime;
    
    if (elapsed >= duration) {
      // Move to next pane
      setTimeout(() => {
        renderPanesSequentiallyWithStage(canvas, ctx, stage, project, setActivePane, paneIndex + 1, onComplete);
      }, 16); // Small delay for frame consistency
      return;
    }

    // Capture the current stage content
    try {
      // Clear the export canvas and fill with pane background
      ctx.fillStyle = pane.bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Get the stage content as a data URL
      const stageDataURL = stage.toDataURL({
        pixelRatio: 1, // Use 1:1 pixel ratio for consistent output
        width: project.canvas.width,
        height: project.canvas.height,
      });
      
      // Create an image from the stage data and draw it onto the export canvas
      const img = new Image();
      img.onload = () => {
        // Calculate scaling and positioning to fit the stage content properly
        const scaleX = canvas.width / stage.width();
        const scaleY = canvas.height / stage.height();
        const scale = Math.min(scaleX, scaleY);
        
        const scaledWidth = stage.width() * scale;
        const scaledHeight = stage.height() * scale;
        const offsetX = (canvas.width - scaledWidth) / 2;
        const offsetY = (canvas.height - scaledHeight) / 2;
        
        // Draw the scaled stage content onto the export canvas
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
      };
      img.src = stageDataURL;
      
    } catch (error) {
      console.warn('Failed to capture stage content:', error);
      // Fallback: just fill with background color
      ctx.fillStyle = pane.bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    requestAnimationFrame(renderFrame);
  };

  renderFrame();
}
