import * as LucideIcons from 'lucide-react';

export interface IconDefinition {
  name: string;
  component: React.ComponentType<any>;
  category: string;
  keywords: string[];
}

// Categorize Lucide icons
const ICON_CATEGORIES: Record<string, string[]> = {
  'arrows': [
    'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
    'arrow-up-right', 'arrow-down-right', 'arrow-down-left', 'arrow-up-left',
    'chevron-up', 'chevron-down', 'chevron-left', 'chevron-right',
    'move', 'move-diagonal', 'move-horizontal', 'move-vertical'
  ],
  'media': [
    'play', 'pause', 'stop', 'skip-forward', 'skip-back', 'rewind', 'fast-forward',
    'volume', 'volume-1', 'volume-2', 'volume-x', 'music', 'video', 'camera', 'image'
  ],
  'communication': [
    'message-circle', 'message-square', 'mail', 'phone', 'phone-call',
    'send', 'share', 'share-2', 'at-sign', 'hash'
  ],
  'interface': [
    'menu', 'x', 'plus', 'minus', 'search', 'settings', 'more-horizontal', 'more-vertical',
    'edit', 'edit-2', 'edit-3', 'trash', 'trash-2', 'save', 'download', 'upload'
  ],
  'business': [
    'briefcase', 'building', 'building-2', 'home', 'office-building',
    'chart-bar', 'chart-line', 'trending-up', 'trending-down', 'activity'
  ],
  'social': [
    'heart', 'thumbs-up', 'thumbs-down', 'star', 'bookmark', 'flag',
    'user', 'users', 'user-plus', 'user-minus', 'user-check'
  ],
  'objects': [
    'book', 'calendar', 'clock', 'globe', 'map-pin', 'shopping-cart',
    'credit-card', 'key', 'lock', 'unlock', 'shield', 'award'
  ],
  'shapes': [
    'circle', 'square', 'triangle', 'hexagon', 'diamond', 'star',
    'heart', 'droplet', 'flame', 'zap'
  ]
};

// Get all available Lucide icons
export function getAllIconNames(): string[] {
  return Object.keys(LucideIcons).filter(name => 
    name !== 'default' && 
    name !== 'createLucideIcon' &&
    typeof LucideIcons[name as keyof typeof LucideIcons] === 'function'
  );
}

// Get icon component by name
export function getIconComponent(name: string): React.ComponentType<any> | null {
  const iconName = name as keyof typeof LucideIcons;
  const IconComponent = LucideIcons[iconName];
  
  if (typeof IconComponent === 'function') {
    return IconComponent as React.ComponentType<any>;
  }
  
  return null;
}

// Search icons by keyword
export function searchIcons(query: string, limit: number = 50): string[] {
  const searchTerm = query.toLowerCase().trim();
  
  if (!searchTerm) {
    return getAllIconNames().slice(0, limit);
  }
  
  const allIcons = getAllIconNames();
  
  // Exact matches first
  const exactMatches = allIcons.filter(name => 
    name.toLowerCase() === searchTerm
  );
  
  // Starts with matches
  const startsWithMatches = allIcons.filter(name => 
    name.toLowerCase().startsWith(searchTerm) && 
    !exactMatches.includes(name)
  );
  
  // Contains matches
  const containsMatches = allIcons.filter(name => 
    name.toLowerCase().includes(searchTerm) && 
    !exactMatches.includes(name) && 
    !startsWithMatches.includes(name)
  );
  
  return [...exactMatches, ...startsWithMatches, ...containsMatches].slice(0, limit);
}

// Get icons by category
export function getIconsByCategory(category: string): string[] {
  return ICON_CATEGORIES[category] || [];
}

// Get all categories
export function getIconCategories(): string[] {
  return Object.keys(ICON_CATEGORIES);
}

// Get category for an icon
export function getIconCategory(iconName: string): string | null {
  for (const [category, icons] of Object.entries(ICON_CATEGORIES)) {
    if (icons.includes(iconName)) {
      return category;
    }
  }
  return null;
}

// Convert icon name to display format
export function formatIconName(iconName: string): string {
  return iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Get popular/recommended icons
export function getPopularIcons(): string[] {
  return [
    'star', 'heart', 'thumbs-up', 'check', 'x', 'plus', 'minus',
    'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down',
    'home', 'user', 'mail', 'phone', 'message-circle',
    'calendar', 'clock', 'search', 'settings', 'menu'
  ];
}

// Validate icon name exists
export function isValidIconName(name: string): boolean {
  return getAllIconNames().includes(name);
}

// Get icon SVG path data (for custom rendering)
export function getIconSVGData(iconName: string): string | null {
  try {
    const IconComponent = getIconComponent(iconName);
    if (!IconComponent) return null;
    
    // This is a simplified approach - in practice, you might need 
    // to render the component and extract the SVG path
    return null;
  } catch (error) {
    return null;
  }
}

// Icon presets for common use cases
export const ICON_PRESETS = {
  social: ['heart', 'thumbs-up', 'share-2', 'message-circle', 'users'],
  business: ['briefcase', 'chart-bar', 'trending-up', 'building', 'award'],
  media: ['play', 'pause', 'video', 'camera', 'image'],
  interface: ['menu', 'search', 'settings', 'edit', 'trash-2'],
  arrows: ['arrow-right', 'arrow-left', 'arrow-up', 'arrow-down', 'chevron-right'],
  shapes: ['circle', 'square', 'triangle', 'star', 'heart']
};

// Get random icons for suggestions
export function getRandomIcons(count: number = 12): string[] {
  const allIcons = getAllIconNames();
  const shuffled = allIcons.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Create icon element data for canvas
export function createIconElement(
  iconName: string,
  x: number = 0,
  y: number = 0,
  options: {
    size?: number;
    color?: string;
    strokeWidth?: number;
    rotation?: number;
    opacity?: number;
  } = {}
) {
  return {
    type: 'icon' as const,
    name: iconName,
    x,
    y,
    size: options.size || 24,
    color: options.color || '#000000',
    strokeWidth: options.strokeWidth || 2,
    rotation: options.rotation || 0,
    z: 0,
    opacity: options.opacity || 1,
  };
}
