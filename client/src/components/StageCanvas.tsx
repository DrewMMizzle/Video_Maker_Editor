import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Text, Image, Rect, Transformer } from 'react-konva';
import { Button } from '@/components/ui/button';
import { Type, ImagePlus, Shapes, Grid3X3, Focus } from 'lucide-react';
import { useProject } from '@/store/useProject';
import { nanoid } from 'nanoid';
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
  const layerRef = useRef<Konva.Layer>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Safely escape IDs for findOne selectors
  const escapeId = (id: string) => {
    // @ts-ignore: CSS.escape not in older TS libs
    return typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(id)
      : id.replace(/([ #;?%&,.+*~':"!^$[\]()=>|\/@])/g, '\\$1');
  };
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState<Konva.Node | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Calculate optimal scale to fit canvas in container while maintaining aspect ratio
  const calculateOptimalScale = useCallback(() => {
    const padding = 64; // Reserve space for padding
    const availableWidth = containerSize.width - padding;
    const availableHeight = containerSize.height - padding;
    const canvasWidth = project?.canvas.width || 1080;
    const canvasHeight = project?.canvas.height || 1080;
    
    const scaleX = availableWidth / canvasWidth;
    const scaleY = availableHeight / canvasHeight;
    
    // Use the smaller scale to maintain aspect ratio and fit within container
    return Math.min(scaleX, scaleY, 1); // Cap at 100% to avoid oversizing
  }, [containerSize, project?.canvas.width, project?.canvas.height]);
  
  const stageScale = calculateOptimalScale();

  const activePane = project?.panes.find(p => p.id === project.activePaneId);

  // Container size tracking with ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    resizeObserver.observe(container);
    
    // Initial size measurement
    setContainerSize({
      width: container.clientWidth,
      height: container.clientHeight
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const tr = transformerRef.current;
    const layer = layerRef.current;
    if (!tr || !layer) return;

    let node: Konva.Node | null = null;

    if (selectedElementId) {
      try {
        const safe = escapeId(selectedElementId);
        node = layer.findOne<Konva.Node>(`#${safe}`) ?? null;
      } catch {
        node = null;
      }
    }

    if (node) {
      tr.nodes([node]);
      setSelectedNode(node);
    } else {
      tr.nodes([]); // <-- never pass undefined
      setSelectedNode(null);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedElementId, activePane?.elements.length]);

  const handleStagePointerDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;

      const target = e.target;

      // Ignore clicks on transformer handles to prevent deselection during resize/rotate
      if (target.findAncestor('Transformer', true)) return;

      // Look for nearest selectable ancestor first, then fall back to ID
      const selectable = target.findAncestor((node) => 
        node.name()?.includes('selectable'), true
      ) || target;

      // If selectable element has an ID and isn't the stage, select it
      if (selectable !== stage && selectable.id()) {
        setSelectedElement(selectable.id());
      } else {
        // Clicked on stage background - clear selection
        setSelectedElement(null);
      }
    },
    [setSelectedElement]
  );

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
                onClick={() => {
                  // Trigger container size recalculation to fit canvas
                  const container = containerRef.current;
                  if (container) {
                    setContainerSize({
                      width: container.clientWidth,
                      height: container.clientHeight
                    });
                  }
                }}
                data-testid="button-fit-canvas"
              >
                <Focus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Canvas area */}
        <div 
          ref={containerRef}
          className="flex-1 flex items-center justify-center p-8 canvas-grid"
        >
          <div className="relative">
            <Stage
              ref={stageRef}
              width={canvasWidth}
              height={canvasHeight}
              scaleX={stageScale}
              scaleY={stageScale}
              onMouseDown={handleStagePointerDown}
              onTouchStart={handleStagePointerDown}
              dragDistance={5}
              data-testid="konva-stage"
            >
              <Layer ref={layerRef} listening>
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
                    listening={false}
                  />
                )}

                {/* Elements */}
                {activePane.elements.map(element => {
                  if (element.type === 'text') {
                    const textX = element.x - 100;
                    const textY = element.y - 16;
                    return (
                      <Text
                        key={element.id}
                        id={element.id}
                        name="selectable text"
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
                        hitStrokeWidth={20}
                        perfectDrawEnabled={false}

                        onClick={(e) => {
                          e.cancelBubble = true;
                          setSelectedElement(element.id);
                        }}
                        onTap={(e) => {
                          e.cancelBubble = true;
                          setSelectedElement(element.id);
                        }}
                        onDragEnd={(e) => {
                          handleElementChange(element.id, {
                            x: e.target.x() + 100,
                            y: e.target.y() + 16,
                          });
                        }}
                        onTransformEnd={(e) => {
                          const node = e.target;
                          handleElementChange(element.id, {
                            x: node.x() + 100,
                            y: node.y() + 16,
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
                    // Create image object for Konva
                    const imageObj = new window.Image();
                    imageObj.src = element.src;
                    
                    return (
                      <Image
                        key={element.id}
                        id={element.id}
                        name="selectable image"
                        image={imageObj}
                        x={element.x - element.width / 2}
                        y={element.y - element.height / 2}
                        width={element.width}
                        height={element.height}
                        opacity={element.opacity}
                        rotation={element.rotation}
                        draggable
                        onClick={(e) => {
                          e.cancelBubble = true;
                          setSelectedElement(element.id);
                        }}
                        onTap={(e) => {
                          e.cancelBubble = true;
                          setSelectedElement(element.id);
                        }}

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
                <Transformer
                  ref={transformerRef}
                  rotateEnabled
                  enabledAnchors={[
                    'top-left','top-right','bottom-left','bottom-right',
                    'middle-left','middle-right'
                  ]}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 5 || newBox.height < 5) return oldBox;
                    return newBox;
                  }}
                />
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
