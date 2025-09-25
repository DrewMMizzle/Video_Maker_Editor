import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import * as Icons from 'lucide-react';
import { Search } from 'lucide-react';

interface IconPickerProps {
  onSelect: (iconName: string) => void;
}

// Get all lucide icon names
const iconNames = Object.keys(Icons).filter(name => 
  name !== 'default' && 
  name !== 'createLucideIcon' &&
  typeof Icons[name as keyof typeof Icons] === 'function'
);

export default function IconPicker({ onSelect }: IconPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIcons = iconNames.filter(name =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4" data-testid="icon-picker">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search icons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-icon-search"
        />
      </div>

      <ScrollArea className="h-64">
        <div className="grid grid-cols-6 gap-2">
          {filteredIcons.slice(0, 60).map(iconName => {
            const IconComponent = Icons[iconName as keyof typeof Icons] as React.ComponentType<any>;
            
            return (
              <Button
                key={iconName}
                variant="outline"
                size="sm"
                className="aspect-square p-2"
                onClick={() => onSelect(iconName)}
                title={iconName}
                data-testid={`icon-${iconName}`}
              >
                <IconComponent className="w-4 h-4" />
              </Button>
            );
          })}
        </div>
        
        {filteredIcons.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No icons found for "{searchTerm}"
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
