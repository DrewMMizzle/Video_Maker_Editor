import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Download } from 'lucide-react';
import { useProject } from '@/store/useProject';
import { FONT_FAMILIES } from '@/types';
// ColorSwatches import not needed here for now

export default function BrandPanel() {
  const { project, updateBrand } = useProject();
  const [showImportModal, setShowImportModal] = useState(false);

  if (!project) return null;

  const handleColorChange = (index: number, color: string) => {
    const newPalette = [...project.brand.palette];
    newPalette[index] = color;
    updateBrand({ palette: newPalette });
  };

  const handleFontChange = (type: 'headings' | 'body', font: string) => {
    updateBrand({ [type]: font });
  };

  return (
    <div className="p-4 space-y-6" data-testid="brand-panel">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Brand Colors</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportModal(true)}
            data-testid="button-import-brand"
          >
            <Download className="w-4 h-4 mr-2" />
            Import from URL
          </Button>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {project.brand.palette.map((color, index) => (
            <div key={index} className="space-y-1">
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorChange(index, e.target.value)}
                className="w-full h-12 rounded-md border border-input cursor-pointer"
              />
              <div className="text-xs text-center text-muted-foreground font-mono">
                {color.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Typography</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="heading-font">Heading Font</Label>
            <Select
              value={project.brand.headings || 'Inter'}
              onValueChange={(value) => handleFontChange('headings', value)}
            >
              <SelectTrigger data-testid="select-heading-font">
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

          <div>
            <Label htmlFor="body-font">Body Font</Label>
            <Select
              value={project.brand.body || 'Inter'}
              onValueChange={(value) => handleFontChange('body', value)}
            >
              <SelectTrigger data-testid="select-body-font">
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
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Font Preview</h3>
        <div className="space-y-2 p-4 rounded-lg border border-border bg-background">
          <div 
            className="text-lg font-bold"
            style={{ fontFamily: project.brand.headings || 'Inter' }}
          >
            Heading Font - {project.brand.headings || 'Inter'} Bold
          </div>
          <div 
            className="text-sm"
            style={{ fontFamily: project.brand.body || 'Inter' }}
          >
            Body text font - {project.brand.body || 'Inter'} Regular for readable content
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Quick Apply</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              updateBrand({
                palette: ['#1f2937', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
                headings: 'Inter',
                body: 'Inter',
              });
            }}
            data-testid="button-apply-modern"
          >
            <Palette className="w-4 h-4 mr-2" />
            Modern
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              updateBrand({
                palette: ['#0f172a', '#1e293b', '#475569', '#94a3b8', '#f1f5f9'],
                headings: 'Playfair Display',
                body: 'Source Serif Pro',
              });
            }}
            data-testid="button-apply-elegant"
          >
            <Palette className="w-4 h-4 mr-2" />
            Elegant
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              updateBrand({
                palette: ['#7c3aed', '#a855f7', '#c084fc', '#ddd6fe', '#f3f4f6'],
                headings: 'Montserrat',
                body: 'Open Sans',
              });
            }}
            data-testid="button-apply-creative"
          >
            <Palette className="w-4 h-4 mr-2" />
            Creative
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              updateBrand({
                palette: ['#dc2626', '#ea580c', '#f59e0b', '#eab308', '#22c55e'],
                headings: 'Roboto',
                body: 'Roboto',
              });
            }}
            data-testid="button-apply-energetic"
          >
            <Palette className="w-4 h-4 mr-2" />
            Energetic
          </Button>
        </div>
      </div>
    </div>
  );
}
