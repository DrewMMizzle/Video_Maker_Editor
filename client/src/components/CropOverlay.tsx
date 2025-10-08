import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useProject } from '@/store/useProject';
import type { KonvaImage } from '../types';

interface CropOverlayProps {
  element: KonvaImage;
  canvasScale: number;
  canvasOffset: { x: number; y: number };
  naturalDimensions: { width: number; height: number };
  onApply: (crop: { cropX: number; cropY: number; cropWidth: number; cropHeight: number }) => void;
  onCancel: () => void;
}

export default function CropOverlay({
  element,
  canvasScale,
  canvasOffset,
  naturalDimensions,
  onApply,
  onCancel,
}: CropOverlayProps) {
  const { zoomLevel } = useProject();
  
  // Initialize crop state with existing crop values or full image
  const [crop, setCrop] = useState({
    x: element.cropX ?? 0,
    y: element.cropY ?? 0,
    width: element.cropWidth ?? naturalDimensions.width,
    height: element.cropHeight ?? naturalDimensions.height,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, cropX: 0, cropY: 0, cropWidth: 0, cropHeight: 0 });

  // Convert element position to screen coordinates
  const elementScreenX = canvasOffset.x + (element.x - element.width / 2) * canvasScale * zoomLevel;
  const elementScreenY = canvasOffset.y + (element.y - element.height / 2) * canvasScale * zoomLevel;
  const elementScreenWidth = element.width * canvasScale * zoomLevel;
  const elementScreenHeight = element.height * canvasScale * zoomLevel;

  // Convert natural pixel crop to screen coordinates
  const cropScreenX = elementScreenX + (crop.x / naturalDimensions.width) * elementScreenWidth;
  const cropScreenY = elementScreenY + (crop.y / naturalDimensions.height) * elementScreenHeight;
  const cropScreenWidth = (crop.width / naturalDimensions.width) * elementScreenWidth;
  const cropScreenHeight = (crop.height / naturalDimensions.height) * elementScreenHeight;

  const handleMouseDown = (e: React.MouseEvent, handle?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (handle) {
      setIsResizing(handle);
    } else {
      setIsDragging(true);
    }
    
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      cropX: crop.x,
      cropY: crop.y,
      cropWidth: crop.width,
      cropHeight: crop.height,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging && !isResizing) return;

      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      // Convert screen pixel movement to natural pixel space
      const dxNatural = (dx / elementScreenWidth) * naturalDimensions.width;
      const dyNatural = (dy / elementScreenHeight) * naturalDimensions.height;

      if (isDragging) {
        // Drag the crop rectangle
        const newX = Math.max(0, Math.min(
          naturalDimensions.width - crop.width,
          dragStartRef.current.cropX + dxNatural
        ));
        const newY = Math.max(0, Math.min(
          naturalDimensions.height - crop.height,
          dragStartRef.current.cropY + dyNatural
        ));
        
        setCrop(prev => ({ ...prev, x: newX, y: newY }));
      } else if (isResizing) {
        // Resize based on which handle is being dragged
        let newCrop = { ...crop };

        switch (isResizing) {
          case 'nw': // Top-left
            newCrop.width = Math.max(10, dragStartRef.current.cropWidth - dxNatural);
            newCrop.height = Math.max(10, dragStartRef.current.cropHeight - dyNatural);
            newCrop.x = dragStartRef.current.cropX + (dragStartRef.current.cropWidth - newCrop.width);
            newCrop.y = dragStartRef.current.cropY + (dragStartRef.current.cropHeight - newCrop.height);
            break;
          case 'ne': // Top-right
            newCrop.width = Math.max(10, dragStartRef.current.cropWidth + dxNatural);
            newCrop.height = Math.max(10, dragStartRef.current.cropHeight - dyNatural);
            newCrop.y = dragStartRef.current.cropY + (dragStartRef.current.cropHeight - newCrop.height);
            break;
          case 'sw': // Bottom-left
            newCrop.width = Math.max(10, dragStartRef.current.cropWidth - dxNatural);
            newCrop.height = Math.max(10, dragStartRef.current.cropHeight + dyNatural);
            newCrop.x = dragStartRef.current.cropX + (dragStartRef.current.cropWidth - newCrop.width);
            break;
          case 'se': // Bottom-right
            newCrop.width = Math.max(10, dragStartRef.current.cropWidth + dxNatural);
            newCrop.height = Math.max(10, dragStartRef.current.cropHeight + dyNatural);
            break;
          case 'n': // Top
            newCrop.height = Math.max(10, dragStartRef.current.cropHeight - dyNatural);
            newCrop.y = dragStartRef.current.cropY + (dragStartRef.current.cropHeight - newCrop.height);
            break;
          case 's': // Bottom
            newCrop.height = Math.max(10, dragStartRef.current.cropHeight + dyNatural);
            break;
          case 'w': // Left
            newCrop.width = Math.max(10, dragStartRef.current.cropWidth - dxNatural);
            newCrop.x = dragStartRef.current.cropX + (dragStartRef.current.cropWidth - newCrop.width);
            break;
          case 'e': // Right
            newCrop.width = Math.max(10, dragStartRef.current.cropWidth + dxNatural);
            break;
        }

        // Clamp to image bounds
        newCrop.x = Math.max(0, Math.min(naturalDimensions.width - newCrop.width, newCrop.x));
        newCrop.y = Math.max(0, Math.min(naturalDimensions.height - newCrop.height, newCrop.y));
        newCrop.width = Math.min(naturalDimensions.width - newCrop.x, newCrop.width);
        newCrop.height = Math.min(naturalDimensions.height - newCrop.y, newCrop.height);

        setCrop(newCrop);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, crop, elementScreenWidth, elementScreenHeight, naturalDimensions]);

  const handleApply = () => {
    onApply({
      cropX: Math.round(crop.x),
      cropY: Math.round(crop.y),
      cropWidth: Math.round(crop.width),
      cropHeight: Math.round(crop.height),
    });
  };

  const handleSize = 8;

  return (
    <>
      {/* Full-screen dark overlay - behind everything */}
      <div className="fixed inset-0 z-40 bg-black/60 pointer-events-none" />
      
      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Crop rectangle with bright border */}
        <div
          className="absolute pointer-events-auto cursor-move bg-transparent"
          style={{
            left: cropScreenX,
            top: cropScreenY,
            width: cropScreenWidth,
            height: cropScreenHeight,
            border: '2px solid #3b82f6',
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.3)',
          }}
          onMouseDown={(e) => handleMouseDown(e)}
          data-testid="crop-rectangle"
        >
        {/* Corner handles */}
        <div
          className="absolute bg-white border-2 border-blue-500 cursor-nw-resize"
          style={{
            left: -handleSize / 2,
            top: -handleSize / 2,
            width: handleSize,
            height: handleSize,
          }}
          onMouseDown={(e) => handleMouseDown(e, 'nw')}
          data-testid="crop-handle-nw"
        />
        <div
          className="absolute bg-white border-2 border-blue-500 cursor-ne-resize"
          style={{
            right: -handleSize / 2,
            top: -handleSize / 2,
            width: handleSize,
            height: handleSize,
          }}
          onMouseDown={(e) => handleMouseDown(e, 'ne')}
          data-testid="crop-handle-ne"
        />
        <div
          className="absolute bg-white border-2 border-blue-500 cursor-sw-resize"
          style={{
            left: -handleSize / 2,
            bottom: -handleSize / 2,
            width: handleSize,
            height: handleSize,
          }}
          onMouseDown={(e) => handleMouseDown(e, 'sw')}
          data-testid="crop-handle-sw"
        />
        <div
          className="absolute bg-white border-2 border-blue-500 cursor-se-resize"
          style={{
            right: -handleSize / 2,
            bottom: -handleSize / 2,
            width: handleSize,
            height: handleSize,
          }}
          onMouseDown={(e) => handleMouseDown(e, 'se')}
          data-testid="crop-handle-se"
        />

        {/* Edge handles */}
        <div
          className="absolute bg-white border-2 border-blue-500 cursor-n-resize"
          style={{
            left: '50%',
            top: -handleSize / 2,
            width: handleSize,
            height: handleSize,
            transform: 'translateX(-50%)',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'n')}
          data-testid="crop-handle-n"
        />
        <div
          className="absolute bg-white border-2 border-blue-500 cursor-s-resize"
          style={{
            left: '50%',
            bottom: -handleSize / 2,
            width: handleSize,
            height: handleSize,
            transform: 'translateX(-50%)',
          }}
          onMouseDown={(e) => handleMouseDown(e, 's')}
          data-testid="crop-handle-s"
        />
        <div
          className="absolute bg-white border-2 border-blue-500 cursor-w-resize"
          style={{
            left: -handleSize / 2,
            top: '50%',
            width: handleSize,
            height: handleSize,
            transform: 'translateY(-50%)',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'w')}
          data-testid="crop-handle-w"
        />
        <div
          className="absolute bg-white border-2 border-blue-500 cursor-e-resize"
          style={{
            right: -handleSize / 2,
            top: '50%',
            width: handleSize,
            height: handleSize,
            transform: 'translateY(-50%)',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'e')}
          data-testid="crop-handle-e"
        />

        {/* Dimensions tooltip */}
        <div
          className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-2 py-1 rounded text-xs whitespace-nowrap"
          data-testid="crop-dimensions"
        >
          {Math.round(crop.width)} × {Math.round(crop.height)}
        </div>
      </div>

      {/* Control buttons */}
      <div
        className="absolute pointer-events-auto flex gap-2"
        style={{
          left: cropScreenX,
          top: cropScreenY + cropScreenHeight + 16,
        }}
      >
        <Button
          size="sm"
          onClick={handleApply}
          className="bg-green-600 hover:bg-green-700 text-white"
          data-testid="button-apply-crop"
        >
          Apply Crop
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          data-testid="button-cancel-crop"
        >
          Cancel
        </Button>
      </div>
    </div>
    </>
  );
}
