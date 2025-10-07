import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { searchIcons, getIconComponent } from '@/lib/icons';

interface IconPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectIcon: (iconName: string) => void;
}

export default function IconPickerModal({ open, onOpenChange, onSelectIcon }: IconPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const displayedIcons = useMemo(() => {
    return searchIcons(searchQuery, 100);
  }, [searchQuery]);

  const handleIconClick = (iconName: string) => {
    onSelectIcon(iconName);
    onOpenChange(false);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]" data-testid="icon-picker-modal">
        <DialogHeader>
          <DialogTitle>Choose an Icon</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-icon-search"
              autoFocus
            />
          </div>

          <ScrollArea className="h-[400px] rounded-md border p-4">
            <div className="grid grid-cols-6 gap-2">
              {displayedIcons.map((iconName) => {
                const IconComponent = getIconComponent(iconName);
                if (!IconComponent) return null;

                return (
                  <Button
                    key={iconName}
                    variant="ghost"
                    className="h-16 flex flex-col items-center justify-center gap-1 hover:bg-accent"
                    onClick={() => handleIconClick(iconName)}
                    data-testid={`icon-option-${iconName}`}
                  >
                    <IconComponent className="w-6 h-6" />
                    <span className="text-xs text-muted-foreground truncate max-w-full px-1">
                      {iconName}
                    </span>
                  </Button>
                );
              })}
            </div>

            {displayedIcons.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No icons found matching "{searchQuery}"
              </div>
            )}
          </ScrollArea>

          <div className="text-sm text-muted-foreground">
            Showing {displayedIcons.length} icons
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
