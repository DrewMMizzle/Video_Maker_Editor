import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface ColorSwatchesProps {
  colors: string[];
  onColorChange: (index: number, color: string) => void;
  maxColors?: number;
}

export default function ColorSwatches({ colors, onColorChange, maxColors = 8 }: ColorSwatchesProps) {
  const handleAddColor = () => {
    if (colors.length < maxColors) {
      onColorChange(colors.length, '#000000');
    }
  };

  return (
    <div className="space-y-3" data-testid="color-swatches">
      <div className="grid grid-cols-4 gap-2">
        {colors.map((color, index) => (
          <div key={index} className="space-y-1">
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(index, e.target.value)}
              className="w-full h-12 rounded-md border border-input cursor-pointer"
              data-testid={`color-swatch-${index}`}
            />
            <div className="text-xs text-center text-muted-foreground font-mono">
              {color.toUpperCase()}
            </div>
          </div>
        ))}
        
        {colors.length < maxColors && (
          <Button
            variant="outline"
            size="sm"
            className="h-12 w-full"
            onClick={handleAddColor}
            data-testid="button-add-color"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
