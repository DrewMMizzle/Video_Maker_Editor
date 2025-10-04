import { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { Stage, Layer, Text, Image, Rect, Transformer, Line, Group } from 'react-konva';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Type, ImagePlus, Shapes, Grid3X3, Focus, Upload, FolderOpen, ChevronDown } from 'lucide-react';
import { useProject } from '@/store/useProject';
import { nanoid } from 'nanoid';
import { ZoomControls } from '@/components/ZoomControls';
import { useKonvaDoubleClick } from '@/hooks/useKonvaDoubleClick';
import { startInlineEdit } from '@/lib/inlineTextEditor';
import { useImageLoader } from '@/hooks/useImageLoader';
import { exportVideoWithKonvaStage } from '@/lib/exportVideo';
import Konva from 'konva';

// Component for rendering images with proper loading state
function KonvaImageElement({ element, handleElementChange, setSelectedElement, isSelected }: {
  element: any;
  handleElementChange: (id: string, changes: any) => void;
  setSelectedElement: (id: string) => void;
  isSelected: boolean;
}) {
  // For GIFs, skip canvas conversion to preserve proper dimensions for Transformer
  const { element: imageElement, loading, error } = useImageLoader(element.src, element.isGif || false);

  // Don't render anything if image is still loading or failed to load
  if (loading || error || !imageElement) {
    return null;
  }

  // When GIF is selected, increase opacity to show static frame under Transformer handles
  const konvaOpacity = element.isGif 
    ? (isSelected ? 0.8 : 0.01)
    : element.opacity;

  return (
    <Image
      key={element.id}
      id={element.id}
      name="selectable image"
      image={imageElement}
      x={element.x - element.width / 2}
      y={element.y - element.height / 2}
      width={element.width}
      height={element.height}
      opacity={konvaOpacity}
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
      onDragMove={(e) => {
        // Update position in real-time for smooth GIF overlay sync
        handleElementChange(element.id, {
          x: e.target.x() + element.width / 2,
          y: e.target.y() + element.height / 2,
        });
      }}
      onDragEnd={(e) => {
        handleElementChange(element.id, {
          x: e.target.x() + element.width / 2,
          y: e.target.y() + element.height / 2,
        });
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const newWidth = element.width * node.scaleX();
        const newHeight = element.height * node.scaleY();
        handleElementChange(element.id, {
          x: node.x() + newWidth / 2,
          y: node.y() + newHeight / 2,
          width: newWidth,
          height: newHeight,
          rotation: node.rotation(),
        });
        node.scaleX(1);
        node.scaleY(1);
      }}
    />
  );
}

export default function StageCanvas() {
  const {
    project,
    selectedElementId,
    setSelectedElement,
    addElement,
    updateElement,
    showGrid,
    toggleGrid,
    zoomLevel,
    isManualZoom,
    setZoom,
    zoomIn,
    zoomOut,
    fitToScreen,
    setActivePane,
    setExportVideoFunction,
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
  
  // Refs for text elements (fix for Rules of Hooks)
  const textRefsRef = useRef<Record<string, any>>({});

  // Get active pane first (needed for hook)
  const activePane = project?.panes.find(p => p.id === project.activePaneId);

  // Clean up old text refs when pane changes to prevent stale refs
  useEffect(() => {
    if (!activePane) return;
    
    // Only clean up refs when switching panes, not when elements change
    // This prevents premature cleanup during element updates/duplication
    const currentTextIds = new Set(
      activePane.elements
        .filter(el => el.type === 'text')
        .map(el => el.id)
    );
    
    // Remove refs for elements not in current pane
    Object.keys(textRefsRef.current).forEach(id => {
      if (!currentTextIds.has(id)) {
        delete textRefsRef.current[id];
      }
    });
  }, [activePane?.id]); // Only depend on pane ID, not elements

  // Single double-click handler for all text elements (Rules of Hooks compliant)
  const handleTextClick = useKonvaDoubleClick({
    onDouble: (e) => {
      e.cancelBubble = true;
      const elementId = e.target.id();
      const stage = stageRef.current;
      const textNode = textRefsRef.current[elementId]?.current;
      const element = activePane?.elements.find(el => el.id === elementId);
      
      // Type guard: ensure element is a text element
      if (stage && textNode && element && element.type === 'text') {
        startInlineEdit({
          stage,
          textNode,
          initialValue: element.text,
          fontSize: element.fontSize,
          fontFamily: element.fontFamily,
          onCommit: (newText) => {
            updateElement(elementId, { text: newText });
          },
          onCancel: () => {
            // Nothing to do on cancel
          }
        });
      }
    },
    onSingle: (e) => {
      e.cancelBubble = true;
      const elementId = e.target.id();
      setSelectedElement(elementId);
    },
    timeoutMs: 300,
    moveTol: 6
  });
  
  
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
  
  // Track device pixel ratio for crisp rendering (including fractional values)
  const [dpr, setDpr] = useState(() => window.devicePixelRatio || 1);
  
  // Calculate scale for canvas content within the Stage (not Stage scaling)
  const canvasScale = isManualZoom ? zoomLevel : calculateOptimalScale();

  // Cached canvas for text measurement (performance optimization)
  const measureCanvasRef = useRef<HTMLCanvasElement>();
  const getMeasureCanvas = useCallback(() => {
    if (!measureCanvasRef.current) {
      measureCanvasRef.current = document.createElement('canvas');
    }
    return measureCanvasRef.current;
  }, []);

  // Calculate text dimensions with proper wrapping support
  const calculateTextDimensions = useCallback((text: string, fontSize: number, fontFamily: string, fontWeight?: string | number, maxWidth?: number) => {
    const canvas = getMeasureCanvas();
    const context = canvas.getContext('2d');
    if (!context) return { width: 200, height: fontSize * 1.2, shouldWrap: false }; // fallback

    // Include font weight and style for accurate measurement
    const weight = typeof fontWeight === 'number' && fontWeight > 500 ? 'bold' : 'normal';
    context.font = `${weight} ${fontSize}px ${fontFamily}`;
    const metrics = context.measureText(text);
    
    const measuredWidth = metrics.width + 40; // Add padding
    const maxContentWidth = maxWidth || (project?.canvas.width ? project.canvas.width * 0.9 : 1000);
    const shouldWrap = measuredWidth > maxContentWidth;
    
    // Return both measured and constrained widths
    return {
      width: shouldWrap ? maxContentWidth : Math.max(measuredWidth, 100),
      height: fontSize * 1.2, // Base height, will be adjusted for multi-line
      shouldWrap,
      measuredWidth
    };
  }, [getMeasureCanvas, project?.canvas.width]);


  // Monitor device pixel ratio changes (window moves between monitors)
  useEffect(() => {
    const updateDpr = () => setDpr(window.devicePixelRatio || 1);
    
    // Listen for DPR changes via resize events or matchMedia
    window.addEventListener('resize', updateDpr);
    
    // More precise DPR change detection using matchMedia
    const mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mediaQuery.addEventListener('change', updateDpr);
    
    return () => {
      window.removeEventListener('resize', updateDpr);
      mediaQuery.removeEventListener('change', updateDpr);
    };
  }, []);

  // Enable high-quality image smoothing after mount, size changes, and DPR changes
  useEffect(() => {
    const sceneCtx = layerRef.current?.getContext()?._context;
    if (sceneCtx) {
      sceneCtx.imageSmoothingEnabled = true;
      // @ts-ignore
      sceneCtx.imageSmoothingQuality = 'high';
    }
  }, [containerSize.width, containerSize.height, dpr]);

  // Container size tracking with useLayoutEffect for immediate measurement
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const rect = entry.contentRect;
        // Measure container in CSS pixels - this will be our Stage size
        setContainerSize({
          width: Math.max(1, Math.floor(rect.width)),
          height: Math.max(1, Math.floor(rect.height))
        });
      }
    });

    resizeObserver.observe(container);

    // Initial measurement
    const rect = container.getBoundingClientRect();
    setContainerSize({
      width: Math.max(1, Math.floor(rect.width)),
      height: Math.max(1, Math.floor(rect.height))
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault();
            zoomIn();
            break;
          case '-':
            e.preventDefault();
            zoomOut();
            break;
          case '0':
            e.preventDefault();
            fitToScreen();
            break;
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Math.min(Math.max(zoomLevel + delta, 0.1), 4.0);
        setZoom(newZoom);
      }
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [zoomLevel, zoomIn, zoomOut, fitToScreen, setZoom]);

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

  // Set up video export function when stage is ready
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !project || !setExportVideoFunction || !setActivePane) {
      // Clear export function if stage/project not ready
      setExportVideoFunction?.(null);
      return;
    }

    // Create the export function that binds the current stage and project
    const exportFunction = async () => {
      return exportVideoWithKonvaStage(stage, project, setActivePane);
    };

    // Set the export function in the store
    setExportVideoFunction(exportFunction);

    // Cleanup function
    return () => {
      setExportVideoFunction?.(null);
    };
  }, [stageRef.current, project, setExportVideoFunction, setActivePane]);

  const handleStagePointerDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;

      const target = e.target;

      // Ignore clicks on transformer handles to prevent deselection during resize/rotate
      if (target.findAncestor('Transformer', true)) return;

      // Look for nearest selectable ancestor first, then fall back to ID
      const selectable = target.findAncestor((node: Konva.Node) => 
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

  const handleAddImageFromFile = () => {
    fileInputRef.current?.click();
  };

  const handleAddImageFromLibrary = () => {
    // Switch to the Library tab in the Properties Panel
    // This is handled by the UI - the user can click on library assets to add them
    // For now, we could show a toast or do nothing as the Library panel already handles this
    return;
  };

  const handleImageLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isGif = file.type === 'image/gif';

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
          isGif,
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    data-testid="button-add-image"
                  >
                    <ImagePlus className="w-4 h-4 mr-2" />
                    Image
                    <ChevronDown className="w-3 h-3 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={handleAddImageFromFile} data-testid="menu-upload-new">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload New
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAddImageFromLibrary} data-testid="menu-from-library">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    From Library
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
              <ZoomControls />
              <div className="h-4 w-px bg-border"></div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleGrid}
                className={showGrid ? "bg-accent" : ""}
                data-testid="button-toggle-grid"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  // Use fitToScreen for consistency with zoom controls
                  const { fitToScreen } = useProject.getState();
                  fitToScreen();
                }}
                data-testid="button-fit-canvas"
                title="Fit to screen"
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
              width={containerSize.width}
              height={containerSize.height}
              pixelRatio={dpr}
              onMouseDown={handleStagePointerDown}
              onTouchStart={handleStagePointerDown}
              dragDistance={5}
              data-testid="konva-stage"
            >
              <Layer ref={layerRef} listening>
                {/* Group with canvas content scaling */}
                <Group
                  x={(containerSize.width - project.canvas.width * canvasScale) / 2}
                  y={(containerSize.height - project.canvas.height * canvasScale) / 2}
                  scaleX={canvasScale}
                  scaleY={canvasScale}
                >
                  {/* Background */}
                  <Rect
                    width={project.canvas.width}
                    height={project.canvas.height}
                    fill={activePane.bgColor}
                    listening={false}
                  />

                {/* Grid lines */}
                {showGrid && (
                  <>
                    {/* Vertical grid lines */}
                    {Array.from({ length: 7 }, (_, i) => (
                      <Line
                        key={`v-${i}`}
                        points={[
                          (project.canvas.width / 6) * i, 0,
                          (project.canvas.width / 6) * i, project.canvas.height
                        ]}
                        stroke="#3b82f6"
                        strokeWidth={1}
                        opacity={0.3}
                        listening={false}
                      />
                    ))}
                    {/* Horizontal grid lines */}
                    {Array.from({ length: 7 }, (_, i) => (
                      <Line
                        key={`h-${i}`}
                        points={[
                          0, (project.canvas.height / 6) * i,
                          project.canvas.width, (project.canvas.height / 6) * i
                        ]}
                        stroke="#3b82f6"
                        strokeWidth={1}
                        opacity={0.3}
                        listening={false}
                      />
                    ))}
                  </>
                )}

                {/* Elements */}
                {activePane.elements.map(element => {
                  if (element.type === 'text') {
                    // Use shared refs object to avoid Rules of Hooks violation
                    if (!textRefsRef.current[element.id]) {
                      textRefsRef.current[element.id] = { current: null };
                    }
                    const textRef = textRefsRef.current[element.id];
                    
                    const textDims = calculateTextDimensions(element.text, element.fontSize, element.fontFamily, element.fontWeight);
                    
                    // Calculate proper center-based positioning
                    const textX = element.x - (textDims.width / 2);
                    const textY = element.y - (textDims.height / 2);
                    
                    
                    return (
                      <Text
                        key={element.id}
                        ref={(node) => { 
                          if (textRef) {
                            textRef.current = node; 
                          }
                        }}
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
                        width={textDims.width}
                        height={textDims.shouldWrap ? undefined : textDims.height}
                        lineHeight={element.lineHeight}
                        wrap={textDims.shouldWrap ? 'word' : 'none'}
                        ellipsis={textDims.shouldWrap}
                        opacity={element.opacity}
                        rotation={element.rotation}
                        draggable
                        hitStrokeWidth={20}
                        perfectDrawEnabled={false}

                        onClick={handleTextClick}
                        onTap={handleTextClick}
                        onDragEnd={(e) => {
                          const currentTextDims = calculateTextDimensions(element.text, element.fontSize, element.fontFamily, element.fontWeight);
                          handleElementChange(element.id, {
                            x: e.target.x() + (currentTextDims.width / 2),
                            y: e.target.y() + (currentTextDims.height / 2),
                          });
                        }}
                        onTransformEnd={(e) => {
                          const node = e.target;
                          const scale = (node.scaleX() + node.scaleY()) / 2; // Average scale for uniform sizing
                          const newFontSize = element.fontSize * scale;
                          const newTextDims = calculateTextDimensions(element.text, newFontSize, element.fontFamily, element.fontWeight);
                          
                          handleElementChange(element.id, {
                            x: node.x() + (newTextDims.width / 2),
                            y: node.y() + (newTextDims.height / 2),
                            rotation: node.rotation(),
                            fontSize: newFontSize,
                          });
                          node.scaleX(1);
                          node.scaleY(1);
                        }}
                      />
                    );
                  }

                  if (element.type === 'image') {
                    return (
                      <KonvaImageElement
                        key={element.id}
                        element={element}
                        handleElementChange={handleElementChange}
                        setSelectedElement={setSelectedElement}
                        isSelected={selectedElementId === element.id}
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
                </Group>
              </Layer>
            </Stage>

            {/* GIF Overlays - HTML img elements for animated GIFs */}
            {activePane.elements
              .filter((el): el is Extract<typeof el, { type: 'image' }> => el.type === 'image' && !!el.isGif)
              .map(element => {
                const groupX = (containerSize.width - project.canvas.width * canvasScale) / 2;
                const groupY = (containerSize.height - project.canvas.height * canvasScale) / 2;
                
                const centerX = element.x * canvasScale;
                const centerY = element.y * canvasScale;
                const width = element.width * canvasScale;
                const height = element.height * canvasScale;
                
                const left = groupX + centerX - width / 2;
                const top = groupY + centerY - height / 2;
                
                const isSelected = selectedElementId === element.id;
                
                return (
                  <img
                    key={`gif-${element.id}`}
                    src={element.src}
                    alt=""
                    style={{
                      position: 'absolute',
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                      transform: `rotate(${element.rotation}deg)`,
                      transformOrigin: 'center center',
                      opacity: isSelected ? element.opacity * 0.05 : element.opacity,
                      pointerEvents: 'none',
                      imageRendering: 'auto'
                    }}
                  />
                );
              })}

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
