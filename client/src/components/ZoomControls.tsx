import { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useProject } from '@/store/useProject';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ZOOM_PRESETS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1.0 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2.0 },
  { label: '300%', value: 3.0 },
  { label: '400%', value: 4.0 },
];

export function ZoomControls() {
  const { zoomLevel, setZoom, zoomIn, zoomOut, fitToScreen } = useProject();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const displayZoom = Math.round(zoomLevel * 100);

  const handlePresetZoom = (value: number) => {
    setZoom(value);
    setIsDropdownOpen(false);
  };

  const handleFitToScreen = () => {
    fitToScreen();
    setIsDropdownOpen(false);
  };

  return (
    <div className="flex items-center gap-1" data-testid="zoom-controls">
      {/* Zoom Out Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={zoomOut}
        disabled={zoomLevel <= 0.1}
        className="h-8 w-8 p-0"
        data-testid="button-zoom-out"
        title="Zoom out (Ctrl + -)"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>

      {/* Zoom Percentage Dropdown */}
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 font-mono text-xs"
            data-testid="button-zoom-percentage"
            title="Click to select zoom level"
          >
            {displayZoom}%
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" data-testid="dropdown-zoom-presets">
          <DropdownMenuItem
            onClick={handleFitToScreen}
            data-testid="option-fit-to-screen"
            className="font-mono text-xs"
          >
            <Maximize2 className="mr-2 h-4 w-4" />
            Fit to screen
          </DropdownMenuItem>
          {ZOOM_PRESETS.map((preset) => (
            <DropdownMenuItem
              key={preset.value}
              onClick={() => handlePresetZoom(preset.value)}
              data-testid={`option-zoom-${preset.value}`}
              className={`font-mono text-xs ${
                Math.abs(zoomLevel - preset.value) < 0.01
                  ? 'bg-accent text-accent-foreground'
                  : ''
              }`}
            >
              {preset.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Zoom In Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={zoomIn}
        disabled={zoomLevel >= 4.0}
        className="h-8 w-8 p-0"
        data-testid="button-zoom-in"
        title="Zoom in (Ctrl + +)"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
    </div>
  );
}