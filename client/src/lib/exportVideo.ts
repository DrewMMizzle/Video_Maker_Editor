import type { Project } from '@shared/schema';

export async function exportVideo(project: Project): Promise<void> {
  if (!project.panes.length) {
    throw new Error('No scenes to export');
  }

  // Check for MediaRecorder support
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
    throw new Error('Video recording is not supported in this browser');
  }

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

    // Render each pane for its duration
    renderPanesSequentially(ctx, canvas, project, 0, () => {
      mediaRecorder.stop();
    });
  });
}

async function renderPanesSequentially(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  project: Project,
  paneIndex: number,
  onComplete: () => void
) {
  if (paneIndex >= project.panes.length) {
    onComplete();
    return;
  }

  const pane = project.panes[paneIndex];
  const duration = pane.durationSec * 1000; // Convert to milliseconds
  
  const startTime = Date.now();
  const renderFrame = () => {
    const elapsed = Date.now() - startTime;
    
    if (elapsed >= duration) {
      // Move to next pane
      setTimeout(() => {
        renderPanesSequentially(ctx, canvas, project, paneIndex + 1, onComplete);
      }, 16); // Small delay for frame consistency
      return;
    }

    // Clear canvas
    ctx.fillStyle = pane.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render elements
    pane.elements.forEach(element => {
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
      }
      
      ctx.restore();
    });

    requestAnimationFrame(renderFrame);
  };

  renderFrame();
}
