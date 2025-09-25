import type { Project } from '@shared/schema';

export async function exportCurrentPane(project: Project, paneId: string): Promise<void> {
  const pane = project.panes.find(p => p.id === paneId);
  if (!pane) {
    throw new Error('Pane not found');
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to create canvas context');
  }

  canvas.width = project.canvas.width;
  canvas.height = project.canvas.height;

  // Clear canvas with pane background
  ctx.fillStyle = pane.bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Render elements
  for (const element of pane.elements) {
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

    if (element.type === 'image') {
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = element.src;
        });

        ctx.drawImage(
          img,
          -element.width / 2,
          -element.height / 2,
          element.width,
          element.height
        );
      } catch (error) {
        console.warn('Failed to load image:', element.src);
      }
    }
    
    ctx.restore();
  }

  // Convert canvas to blob and download
  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pane.name || 'scene'}_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, 'image/png');
}

export async function exportAllPanes(project: Project): Promise<void> {
  // This would create a ZIP file with all panes
  // For now, we'll export them individually
  for (const pane of project.panes) {
    await exportCurrentPane(project, pane.id);
    // Add a small delay between exports
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
