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
import { AlignLeft, AlignCenter, AlignRight, MoveUp, MoveDown, Copy, Trash2 } from 'lucide-react';
import { useProject } from '@/store/useProject';
import { FONT_FAMILIES, FONT_WEIGHTS } from '@/types';
import BrandPanel from './BrandPanel';

export default function PropertiesPanel() {
  const {
    project,
    selectedElementId,
    updateElement,
    duplicateElement,
    deleteElement,
    updateCanvas,
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
        <Tabs defaultValue="properties" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="properties" data-testid="tab-properties">Properties</TabsTrigger>
            <TabsTrigger value="document" data-testid="tab-document">Document</TabsTrigger>
            <TabsTrigger value="brand" data-testid="tab-brand">Brand</TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="flex-1 overflow-y-auto p-4">
            {selectedElement ? (
              <div className="space-y-6">
                {selectedElement.type === 'text' && (
                  <>
                    <div>
                      <Label htmlFor="text-content">Content</Label>
                      <Textarea
                        id="text-content"
                        value={selectedElement.text}
                        onChange={(e) => handleElementUpdate({ text: e.target.value })}
                        className="min-h-[80px]"
                        data-testid="input-text-content"
                      />
                    </div>

                    <div>
                      <Label htmlFor="font-family">Font Family</Label>
                      <Select
                        value={selectedElement.fontFamily}
                        onValueChange={(value) => handleElementUpdate({ fontFamily: value })}
                      >
                        <SelectTrigger data-testid="select-font-family">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_FAMILIES.map(font => (
                            <SelectItem key={font} value={font}>
                              {font}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="font-size">Size</Label>
                        <Input
                          id="font-size"
                          type="number"
                          value={selectedElement.fontSize}
                          onChange={(e) => handleElementUpdate({ fontSize: Number(e.target.value) })}
                          data-testid="input-font-size"
                        />
                      </div>
                      <div>
                        <Label htmlFor="font-weight">Weight</Label>
                        <Select
                          value={String(selectedElement.fontWeight)}
                          onValueChange={(value) => handleElementUpdate({ fontWeight: Number(value) })}
                        >
                          <SelectTrigger data-testid="select-font-weight">
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
                    </div>

                    <div>
                      <Label>Alignment</Label>
                      <div className="flex rounded-md border border-input mt-2">
                        <Button
                          variant={selectedElement.align === 'left' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="flex-1 rounded-none rounded-l-md"
                          onClick={() => handleElementUpdate({ align: 'left' })}
                          data-testid="button-align-left"
                        >
                          <AlignLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={selectedElement.align === 'center' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="flex-1 rounded-none"
                          onClick={() => handleElementUpdate({ align: 'center' })}
                          data-testid="button-align-center"
                        >
                          <AlignCenter className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={selectedElement.align === 'right' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="flex-1 rounded-none rounded-r-md"
                          onClick={() => handleElementUpdate({ align: 'right' })}
                          data-testid="button-align-right"
                        >
                          <AlignRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="text-color">Text Color</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="color"
                          value={selectedElement.color}
                          onChange={(e) => handleElementUpdate({ color: e.target.value })}
                          className="w-10 h-10 rounded-md border border-input cursor-pointer"
                          data-testid="input-text-color"
                        />
                        <Input
                          value={selectedElement.color}
                          onChange={(e) => handleElementUpdate({ color: e.target.value })}
                          className="flex-1"
                          data-testid="input-text-color-hex"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Background</Label>
                      <div className="space-y-2 mt-2">
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
                              className="w-10 h-10 rounded-md border border-input cursor-pointer"
                              data-testid="input-text-background-color"
                            />
                            <Input
                              value={selectedElement.bgColor}
                              onChange={(e) => handleElementUpdate({ bgColor: e.target.value })}
                              className="flex-1"
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
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="image-width">Width</Label>
                        <Input
                          id="image-width"
                          type="number"
                          value={selectedElement.width}
                          onChange={(e) => handleElementUpdate({ width: Number(e.target.value) })}
                          data-testid="input-image-width"
                        />
                      </div>
                      <div>
                        <Label htmlFor="image-height">Height</Label>
                        <Input
                          id="image-height"
                          type="number"
                          value={selectedElement.height}
                          onChange={(e) => handleElementUpdate({ height: Number(e.target.value) })}
                          data-testid="input-image-height"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="corner-radius">Corner Radius</Label>
                      <Input
                        id="corner-radius"
                        type="number"
                        value={selectedElement.cornerRadius || 0}
                        onChange={(e) => handleElementUpdate({ cornerRadius: Number(e.target.value) })}
                        data-testid="input-corner-radius"
                      />
                    </div>
                  </>
                )}

                {selectedElement.type === 'icon' && (
                  <>
                    <div>
                      <Label htmlFor="icon-name">Icon Name</Label>
                      <Input
                        id="icon-name"
                        value={selectedElement.name}
                        onChange={(e) => handleElementUpdate({ name: e.target.value })}
                        data-testid="input-icon-name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="icon-size">Size</Label>
                        <Input
                          id="icon-size"
                          type="number"
                          value={selectedElement.size}
                          onChange={(e) => handleElementUpdate({ size: Number(e.target.value) })}
                          data-testid="input-icon-size"
                        />
                      </div>
                      <div>
                        <Label htmlFor="stroke-width">Stroke Width</Label>
                        <Input
                          id="stroke-width"
                          type="number"
                          value={selectedElement.strokeWidth}
                          onChange={(e) => handleElementUpdate({ strokeWidth: Number(e.target.value) })}
                          data-testid="input-stroke-width"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="icon-color">Icon Color</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="color"
                          value={selectedElement.color}
                          onChange={(e) => handleElementUpdate({ color: e.target.value })}
                          className="w-10 h-10 rounded-md border border-input cursor-pointer"
                          data-testid="input-icon-color"
                        />
                        <Input
                          value={selectedElement.color}
                          onChange={(e) => handleElementUpdate({ color: e.target.value })}
                          className="flex-1"
                          data-testid="input-icon-color-hex"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <Label>Opacity</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <Slider
                      value={[selectedElement.opacity * 100]}
                      onValueChange={([value]) => handleElementUpdate({ opacity: value / 100 })}
                      max={100}
                      step={1}
                      className="flex-1"
                      data-testid="slider-opacity"
                    />
                    <span className="text-sm text-muted-foreground w-12">
                      {Math.round(selectedElement.opacity * 100)}%
                    </span>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-3">Transform</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="pos-x" className="text-xs">X Position</Label>
                      <Input
                        id="pos-x"
                        type="number"
                        value={Math.round(selectedElement.x)}
                        onChange={(e) => handleElementUpdate({ x: Number(e.target.value) })}
                        className="h-9"
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
                        className="h-9"
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
                        className="h-9"
                        data-testid="input-rotation"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Z-Index</Label>
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 h-9"
                          onClick={() => handleElementUpdate({ z: selectedElement.z + 1 })}
                          data-testid="button-move-up"
                        >
                          <MoveUp className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 h-9"
                          onClick={() => handleElementUpdate({ z: selectedElement.z - 1 })}
                          data-testid="button-move-down"
                        >
                          <MoveDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => duplicateElement(selectedElementId!)}
                    data-testid="button-duplicate-element"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => deleteElement(selectedElementId!)}
                    data-testid="button-delete-element"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
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

          <TabsContent value="document" className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
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

          <TabsContent value="brand" className="flex-1 overflow-y-auto">
            <BrandPanel />
          </TabsContent>
        </Tabs>
      </div>
    </aside>
  );
}
