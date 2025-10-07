import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlignLeft, AlignCenter, AlignRight, MoveUp, MoveDown, Copy, Trash2 } from 'lucide-react';
import { useProject } from '@/store/useProject';
import { FONT_FAMILIES, FONT_WEIGHTS } from '@/types';
import BrandPanel from './BrandPanel';
import LibraryPanel from './LibraryPanel';

export default function PropertiesPanel() {
  const {
    project,
    selectedElementId,
    updateElement,
    duplicateElement,
    deleteElement,
    updateCanvas,
    updatePane,
    activePropertiesTab,
    setActivePropertiesTab,
  } = useProject();

  const activePane = project?.panes.find(p => p.id === project.activePaneId);
  const selectedElement = activePane?.elements.find(el => el.id === selectedElementId);

  const handleElementUpdate = (updates: any) => {
    if (selectedElementId) {
      updateElement(selectedElementId, updates);
    }
  };

  if (!project) return null;

  return (
    <aside className="w-80 border-l border-border bg-card" data-testid="properties-panel">
      <div className="h-full flex flex-col">
        <Tabs value={activePropertiesTab} onValueChange={setActivePropertiesTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
            <TabsTrigger value="properties" data-testid="tab-properties">Properties</TabsTrigger>
            <TabsTrigger value="document" data-testid="tab-document">Document</TabsTrigger>
            <TabsTrigger value="brand" data-testid="tab-brand">Brand</TabsTrigger>
            <TabsTrigger value="library" data-testid="tab-library">Library</TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="flex-1 overflow-y-auto p-3 min-h-0">
            {selectedElement ? (
              <div className="space-y-2">
                {selectedElement.type === 'text' && (
                  <>
                    <div>
                      <Label htmlFor="text-content">Content</Label>
                      <Textarea
                        id="text-content"
                        value={selectedElement.text}
                        onChange={(e) => handleElementUpdate({ text: e.target.value })}
                        className="min-h-[60px] text-sm"
                        data-testid="input-text-content"
                      />
                    </div>

                    <div>
                      <Label htmlFor="font-family" className="text-sm">Font Family</Label>
                      <Select
                        value={selectedElement.fontFamily}
                        onValueChange={(value) => handleElementUpdate({ fontFamily: value })}
                      >
                        <SelectTrigger className="h-8 text-sm" data-testid="select-font-family">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_FAMILIES.map(font => (
                            <SelectItem key={font} value={font}>
                              <span style={{ fontFamily: font }}>{font}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="font-size" className="text-sm">Size</Label>
                      <div className="space-y-2 mt-1">
                        <div className="flex items-center gap-2">
                          <Input
                            id="font-size"
                            type="number"
                            value={selectedElement.fontSize}
                            onChange={(e) => handleElementUpdate({ fontSize: Number(e.target.value) })}
                            className="w-16 h-8 text-sm"
                            min={8}
                            max={200}
                            data-testid="input-font-size"
                          />
                          <div className="flex-1">
                            <Slider
                              value={[selectedElement.fontSize]}
                              onValueChange={([value]) => handleElementUpdate({ fontSize: value })}
                              min={8}
                              max={200}
                              step={1}
                              className="w-full"
                            />
                          </div>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {[16, 20, 24, 32, 48, 64].map((size) => (
                            <Button
                              key={size}
                              variant={selectedElement.fontSize === size ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => handleElementUpdate({ fontSize: size })}
                              className="text-xs px-1.5 py-0.5 h-6"
                              data-testid={`button-font-size-${size}`}
                            >
                              {size}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="font-weight" className="text-sm">Weight</Label>
                      <Select
                        value={String(selectedElement.fontWeight)}
                        onValueChange={(value) => handleElementUpdate({ fontWeight: Number(value) })}
                      >
                        <SelectTrigger className="h-8 text-sm" data-testid="select-font-weight">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_WEIGHTS.map(weight => (
                            <SelectItem key={weight.value} value={String(weight.value)}>
                              {weight.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm">Alignment</Label>
                      <div className="flex rounded-md border border-input mt-1">
                        <Button
                          variant={selectedElement.align === 'left' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="flex-1 rounded-none rounded-l-md h-8"
                          onClick={() => handleElementUpdate({ align: 'left' })}
                          data-testid="button-align-left"
                        >
                          <AlignLeft className="w-3 h-3" />
                        </Button>
                        <Button
                          variant={selectedElement.align === 'center' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="flex-1 rounded-none h-8"
                          onClick={() => handleElementUpdate({ align: 'center' })}
                          data-testid="button-align-center"
                        >
                          <AlignCenter className="w-3 h-3" />
                        </Button>
                        <Button
                          variant={selectedElement.align === 'right' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="flex-1 rounded-none rounded-r-md h-8"
                          onClick={() => handleElementUpdate({ align: 'right' })}
                          data-testid="button-align-right"
                        >
                          <AlignRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="text-color" className="text-sm">Text Color</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={selectedElement.color}
                          onChange={(e) => handleElementUpdate({ color: e.target.value })}
                          className="w-8 h-8 rounded-md border border-input cursor-pointer"
                          data-testid="input-text-color"
                        />
                        <Input
                          value={selectedElement.color}
                          onChange={(e) => handleElementUpdate({ color: e.target.value })}
                          className="flex-1 h-8 text-sm"
                          data-testid="input-text-color-hex"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm">Background</Label>
                      <div className="space-y-1.5 mt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={!!selectedElement.bgColor}
                            onCheckedChange={(checked) =>
                              handleElementUpdate({
                                bgColor: checked ? '#000000' : undefined
                              })
                            }
                            data-testid="checkbox-text-background"
                          />
                          <span className="text-sm">Enable background</span>
                        </div>
                        {selectedElement.bgColor && (
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={selectedElement.bgColor}
                              onChange={(e) => handleElementUpdate({ bgColor: e.target.value })}
                              className="w-8 h-8 rounded-md border border-input cursor-pointer"
                              data-testid="input-text-background-color"
                            />
                            <Input
                              value={selectedElement.bgColor}
                              onChange={(e) => handleElementUpdate({ bgColor: e.target.value })}
                              className="flex-1 h-8 text-sm"
                              data-testid="input-text-background-hex"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {selectedElement.type === 'image' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="image-width" className="text-sm">Width</Label>
                        <Input
                          id="image-width"
                          type="number"
                          value={selectedElement.width}
                          onChange={(e) => handleElementUpdate({ width: Number(e.target.value) })}
                          className="h-8 text-sm"
                          data-testid="input-image-width"
                        />
                      </div>
                      <div>
                        <Label htmlFor="image-height" className="text-sm">Height</Label>
                        <Input
                          id="image-height"
                          type="number"
                          value={selectedElement.height}
                          onChange={(e) => handleElementUpdate({ height: Number(e.target.value) })}
                          className="h-8 text-sm"
                          data-testid="input-image-height"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="corner-radius" className="text-sm">Corner Radius</Label>
                      <Input
                        id="corner-radius"
                        type="number"
                        value={selectedElement.cornerRadius || 0}
                        onChange={(e) => handleElementUpdate({ cornerRadius: Number(e.target.value) })}
                        className="h-8 text-sm"
                        data-testid="input-corner-radius"
                      />
                    </div>

                    {selectedElement.isGif && activePane && (
                      <div className="p-3 bg-muted/50 rounded-md space-y-2">
                        <div>
                          <Label htmlFor="gif-scene-duration" className="text-sm font-medium">GIF Playback Duration</Label>
                          <p className="text-xs text-muted-foreground mt-1 mb-2">
                            This GIF loops continuously for the scene duration
                          </p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Slider
                              id="gif-scene-duration"
                              min={1}
                              max={60}
                              step={0.5}
                              value={[activePane.durationSec]}
                              onValueChange={([value]) => updatePane(activePane.id, { durationSec: value })}
                              className="flex-1"
                              data-testid="slider-gif-scene-duration"
                            />
                            <Input
                              type="number"
                              min={1}
                              max={60}
                              step={0.5}
                              value={activePane.durationSec}
                              onChange={(e) => {
                                const value = Math.min(60, Math.max(1, Number(e.target.value)));
                                updatePane(activePane.id, { durationSec: value });
                              }}
                              className="w-16 h-8 text-sm"
                              data-testid="input-gif-scene-duration"
                            />
                            <span className="text-xs text-muted-foreground">sec</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {selectedElement.type === 'icon' && (
                  <>
                    <div>
                      <Label htmlFor="icon-name" className="text-sm">Icon Name</Label>
                      <Input
                        id="icon-name"
                        value={selectedElement.name}
                        onChange={(e) => handleElementUpdate({ name: e.target.value })}
                        className="h-8 text-sm"
                        data-testid="input-icon-name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="icon-size" className="text-sm">Size</Label>
                        <Input
                          id="icon-size"
                          type="number"
                          value={selectedElement.size}
                          onChange={(e) => handleElementUpdate({ size: Number(e.target.value) })}
                          className="h-8 text-sm"
                          data-testid="input-icon-size"
                        />
                      </div>
                      <div>
                        <Label htmlFor="stroke-width" className="text-sm">Stroke</Label>
                        <Input
                          id="stroke-width"
                          type="number"
                          value={selectedElement.strokeWidth}
                          onChange={(e) => handleElementUpdate({ strokeWidth: Number(e.target.value) })}
                          className="h-8 text-sm"
                          data-testid="input-stroke-width"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="icon-color" className="text-sm">Icon Color</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={selectedElement.color}
                          onChange={(e) => handleElementUpdate({ color: e.target.value })}
                          className="w-8 h-8 rounded-md border border-input cursor-pointer"
                          data-testid="input-icon-color"
                        />
                        <Input
                          value={selectedElement.color}
                          onChange={(e) => handleElementUpdate({ color: e.target.value })}
                          className="flex-1 h-8 text-sm"
                          data-testid="input-icon-color-hex"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <Label className="text-sm">Opacity</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Slider
                      value={[selectedElement.opacity * 100]}
                      onValueChange={([value]) => handleElementUpdate({ opacity: value / 100 })}
                      max={100}
                      step={1}
                      className="flex-1"
                      data-testid="slider-opacity"
                    />
                    <span className="text-xs text-muted-foreground w-12">
                      {Math.round(selectedElement.opacity * 100)}%
                    </span>
                  </div>
                </div>

                <Accordion type="single" collapsible className="-mx-1">
                  <AccordionItem value="transform" className="border-none">
                    <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
                      Transform
                    </AccordionTrigger>
                    <AccordionContent className="pb-2">
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <Label htmlFor="pos-x" className="text-xs">X Position</Label>
                          <Input
                            id="pos-x"
                            type="number"
                            value={Math.round(selectedElement.x)}
                            onChange={(e) => handleElementUpdate({ x: Number(e.target.value) })}
                            className="h-8 text-sm"
                            data-testid="input-position-x"
                          />
                        </div>
                        <div>
                          <Label htmlFor="pos-y" className="text-xs">Y Position</Label>
                          <Input
                            id="pos-y"
                            type="number"
                            value={Math.round(selectedElement.y)}
                            onChange={(e) => handleElementUpdate({ y: Number(e.target.value) })}
                            className="h-8 text-sm"
                            data-testid="input-position-y"
                          />
                        </div>
                        <div>
                          <Label htmlFor="rotation" className="text-xs">Rotation</Label>
                          <Input
                            id="rotation"
                            type="number"
                            value={Math.round(selectedElement.rotation)}
                            onChange={(e) => handleElementUpdate({ rotation: Number(e.target.value) })}
                            className="h-8 text-sm"
                            data-testid="input-rotation"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Z-Index</Label>
                          <div className="flex gap-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 h-8"
                              onClick={() => handleElementUpdate({ z: selectedElement.z + 1 })}
                              data-testid="button-move-up"
                            >
                              <MoveUp className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 h-8"
                              onClick={() => handleElementUpdate({ z: selectedElement.z - 1 })}
                              data-testid="button-move-down"
                            >
                              <MoveDown className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Separator className="my-2" />

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-sm"
                    onClick={() => duplicateElement(selectedElementId!)}
                    data-testid="button-duplicate-element"
                  >
                    <Copy className="w-3 h-3 mr-1.5" />
                    Duplicate
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1 h-8 text-sm"
                    onClick={() => deleteElement(selectedElementId!)}
                    data-testid="button-delete-element"
                  >
                    <Trash2 className="w-3 h-3 mr-1.5" />
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground text-center">
                  Select an element on the canvas to edit its properties
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="document" className="flex-1 overflow-y-auto p-4 min-h-0">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-3">Canvas Size</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="canvas-width">Width</Label>
                    <Input
                      id="canvas-width"
                      type="number"
                      value={project.canvas.width}
                      onChange={(e) => updateCanvas({ width: Number(e.target.value) })}
                      data-testid="input-canvas-width"
                    />
                  </div>
                  <div>
                    <Label htmlFor="canvas-height">Height</Label>
                    <Input
                      id="canvas-height"
                      type="number"
                      value={project.canvas.height}
                      onChange={(e) => updateCanvas({ height: Number(e.target.value) })}
                      data-testid="input-canvas-height"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="canvas-background">Background Color</Label>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="color"
                    value={project.canvas.background}
                    onChange={(e) => updateCanvas({ background: e.target.value })}
                    className="w-10 h-10 rounded-md border border-input cursor-pointer"
                    data-testid="input-canvas-background-color"
                  />
                  <Input
                    value={project.canvas.background}
                    onChange={(e) => updateCanvas({ background: e.target.value })}
                    className="flex-1"
                    data-testid="input-canvas-background-hex"
                  />
                </div>
              </div>

              {activePane && (
                <div>
                  <Label htmlFor="pane-background">Scene Background</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="color"
                      value={activePane.bgColor}
                      onChange={(e) => {
                        if (project.activePaneId) {
                          const { updatePane } = useProject.getState();
                          updatePane(project.activePaneId, { bgColor: e.target.value });
                        }
                      }}
                      className="w-10 h-10 rounded-md border border-input cursor-pointer"
                      data-testid="input-pane-background-color"
                    />
                    <Input
                      value={activePane.bgColor}
                      onChange={(e) => {
                        if (project.activePaneId) {
                          const { updatePane } = useProject.getState();
                          updatePane(project.activePaneId, { bgColor: e.target.value });
                        }
                      }}
                      className="flex-1"
                      data-testid="input-pane-background-hex"
                    />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="brand" className="flex-1 overflow-y-auto min-h-0">
            <BrandPanel />
          </TabsContent>

          <TabsContent value="library" className="flex-1 overflow-y-auto min-h-0">
            <LibraryPanel />
          </TabsContent>
        </Tabs>
      </div>
    </aside>
  );
}
