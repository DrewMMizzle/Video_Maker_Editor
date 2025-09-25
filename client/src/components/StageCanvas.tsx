import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Text, Image, Rect, Transformer } from 'react-konva';
import { Button } from '@/components/ui/button';
import { Type, ImagePlus, Shapes, Grid3X3, Focus } from 'lucide-react';
import { useProject } from '@/store/useProject';
import { nanoid } from 'nanoid';
import type { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';

export default function StageCanvas() {
  const {
    project,
    selectedElementId,
    setSelectedElement,
    addElement,
    updateElement,
    showSafeArea,
    toggleSafeArea,
  } = useProject();

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [stageScale, setStageScale] = useState(0.35);
  const [selectedNode, setSelectedNode] = useState<Konva.Node | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePane = project?.panes.find(p => p.id === project.activePaneId);

  useEffect(() => {
    if (selectedElementId && transformerRef.current && stageRef.current) {
      const node = stageRef.current.findOne(`#${selectedElementId}`);
      if (node) {
        setSelectedNode(node);
        transformerRef.current.nodes([node]);
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
      setSelectedNode(null);
    }
  }, [selectedElementId]);

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const pointerPosition = stage?.getPointerPosition();
    console.log('Stage click:', e.target.getClassName(), 'id:', e.target.id(), 'pointer:', pointerPosition);
    
    // Check if we clicked on the background (Stage or Rect without id)
    if (e.target === stage || (e.target.getClassName() === 'Rect' && !e.target.id())) {
      console.log('Clicked stage background - deselecting');
      setSelectedElement(null);
    } else {
      const id = e.target.id();
      console.log('Clicked element with id:', id);
      if (id && id !== selectedElementId) {
        console.log('Selecting element:', id);
        setSelectedElement(id);
      }
    }
  };

  const handleElementChange = (id: string, attrs: any) => {
    updateElement(id, attrs);
  };

  const handleAddText = () => {
    const newText = {
      id: nanoid(),
      type: 'text' as const,
      text: 'New Text',
      x: (project?.canvas.width || 1080) / 2,
      y: (project?.canvas.height || 1080) / 2,
      rotation: 0,
      z: 0,
      opacity: 1,
      fontFamily: 'Inter',
      fontSize: 32,
      fontWeight: 500,
      lineHeight: 1.2,
      color: '#000000' as const,
      align: 'center' as const,
      padding: 0,
    };
    addElement(newText);
  };

  const handleAddImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const newImage = {
          id: nanoid(),
          type: 'image' as const,
          src: result,
          x: (project?.canvas.width || 1080) / 2,
          y: (project?.canvas.height || 1080) / 2,
          width: img.width,
          height: img.height,
          rotation: 0,
          z: 0,
          opacity: 1,
        };
        addElement(newImage);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleAddIcon = () => {
    const newIcon = {
      id: nanoid(),
      type: 'icon' as const,
      name: 'star',
      x: (project?.canvas.width || 1080) / 2,
      y: (project?.canvas.height || 1080) / 2,
      size: 48,
      strokeWidth: 2,
      color: '#000000' as const,
      rotation: 0,
      z: 0,
      opacity: 1,
    };
    addElement(newIcon);
  };

  if (!project || !activePane) {
    return (
      <main className="flex-1 bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">No active scene selected</p>
      </main>
    );
  }

  const canvasWidth = project.canvas.width;
  const canvasHeight = project.canvas.height;

  return (
    <main className="flex-1 bg-muted overflow-hidden" data-testid="stage-canvas">
      <div className="h-full flex flex-col">
        {/* Canvas toolbar */}
        <div className="border-b border-border bg-card px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleAddText}
                data-testid="button-add-text"
              >
                <Type className="w-4 h-4 mr-2" />
                Text
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleAddImage}
                data-testid="button-add-image"
              >
                <ImagePlus className="w-4 h-4 mr-2" />
                Image
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleAddIcon}
                data-testid="button-add-icon"
              >
                <Shapes className="w-4 h-4 mr-2" />
                Icon
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {Math.round(stageScale * 100)}%
              </span>
              <div className="h-4 w-px bg-border"></div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSafeArea}
                className={showSafeArea ? "bg-accent" : ""}
                data-testid="button-toggle-safe-area"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setStageScale(0.35)}
                data-testid="button-fit-canvas"
              >
                <Focus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex-1 flex items-center justify-center p-8 canvas-grid">
          <div className="relative">
            <Stage
              ref={stageRef}
              width={canvasWidth}
              height={canvasHeight}
              scaleX={stageScale}
              scaleY={stageScale}
              onClick={handleStageClick}
              data-testid="konva-stage"
            >
              <Layer>
                {/* Background */}
                <Rect
                  width={project.canvas.width}
                  height={project.canvas.height}
                  fill={activePane.bgColor}
                  listening={false}
                />

                {/* Safe area overlay */}
                {showSafeArea && (
                  <Rect
                    x={project.canvas.width * 0.1}
                    y={project.canvas.height * 0.1}
                    width={project.canvas.width * 0.8}
                    height={project.canvas.height * 0.8}
                    stroke="#3b82f6"
                    strokeWidth={4}
                    dash={[10, 5]}
                    opacity={0.6}
                  />
                )}

                {/* Elements */}
                {activePane.elements.map(element => {
                  console.log('Rendering element:', element.type, element.id, 'at', element.x, element.y);
                  if (element.type === 'text') {
                    const textX = element.x - 100;
                    const textY = element.y - 16;
                    console.log('Text rendered at:', textX, textY, 'with id:', element.id);
                    return (
                      <Text
                        key={element.id}
                        id={element.id}
                        text={element.text}
                        x={textX}
                        y={textY}
                        fontSize={element.fontSize}
                        fontFamily={element.fontFamily}
                        fontStyle={typeof element.fontWeight === 'number' && element.fontWeight > 500 ? 'bold' : 'normal'}
                        fill={element.color}
                        align={element.align}
                        width={200}
                        height={element.fontSize * 1.2}
                        lineHeight={element.lineHeight}
                        opacity={element.opacity}
                        rotation={element.rotation}
                        draggable
                        listening={true}
                        hitStrokeWidth={4}
                        perfectDrawEnabled={false}

                        onDragEnd={(e) => {
                          handleElementChange(element.id, {
                            x: e.target.x() + 100,
                            y: e.target.y() + 20,
                          });
                        }}
                        onTransformEnd={(e) => {
                          const node = e.target;
                          handleElementChange(element.id, {
                            x: node.x() + 100,
                            y: node.y() + 20,
                            rotation: node.rotation(),
                            fontSize: element.fontSize * node.scaleX(),
                          });
                          node.scaleX(1);
                          node.scaleY(1);
                        }}
                      />
                    );
                  }

                  if (element.type === 'image') {
                    return (
                      <Image
                        key={element.id}
                        id={element.id}
                        x={element.x - element.width / 2}
                        y={element.y - element.height / 2}
                        width={element.width}
                        height={element.height}
                        opacity={element.opacity}
                        rotation={element.rotation}
                        draggable

                        onDragEnd={(e) => {
                          handleElementChange(element.id, {
                            x: e.target.x() + element.width / 2,
                            y: e.target.y() + element.height / 2,
                          });
                        }}
                        onTransformEnd={(e) => {
                          const node = e.target;
                          handleElementChange(element.id, {
                            x: node.x() + element.width / 2,
                            y: node.y() + element.height / 2,
                            width: element.width * node.scaleX(),
                            height: element.height * node.scaleY(),
                            rotation: node.rotation(),
                          });
                          node.scaleX(1);
                          node.scaleY(1);
                        }}
                      />
                    );
                  }

                  // Icon rendering would go here
                  return null;
                })}

                {/* Transformer */}
                <Transformer ref={transformerRef} />
              </Layer>
            </Stage>

            {/* Canvas info */}
            <div className="absolute -bottom-8 left-0 text-xs text-muted-foreground">
              {project.canvas.width} × {project.canvas.height}px • Scene {project.panes.findIndex(p => p.id === project.activePaneId) + 1} of {project.panes.length}
            </div>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageLoad}
        className="hidden"
      />
    </main>
  );
}
