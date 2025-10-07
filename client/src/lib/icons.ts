import * as TablerIconsModule from '@tabler/icons-react';

export interface IconDefinition {
  name: string;
  component: React.ComponentType<any>;
  category: string;
  keywords: string[];
}

// Handle both default and named exports
const TablerIcons = (TablerIconsModule as any).default || TablerIconsModule;

// Helper to convert kebab-case to Tabler's IconPascalCase format
function kebabToTablerName(kebabName: string): string {
  // Convert "arrow-up" to "IconArrowUp"
  const pascalCase = kebabName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  return `Icon${pascalCase}`;
}

// Helper to convert Tabler's IconPascalCase to kebab-case
function tablerToKebabName(tablerName: string): string {
  // Convert "IconArrowUp" to "arrow-up" or "Icon24Hours" to "24-hours"
  if (!tablerName.startsWith('Icon')) return tablerName;
  
  const withoutPrefix = tablerName.slice(4); // Remove "Icon" prefix
  const withDashes = withoutPrefix.replace(/([A-Z])/g, '-$1').toLowerCase();
  
  // Remove leading dash only if it exists (won't exist for numeric prefixes like "24Hours")
  return withDashes.startsWith('-') ? withDashes.slice(1) : withDashes;
}

// Get all available Tabler icons in kebab-case format
export function getAllIconNames(): string[] {
  const allKeys = Object.keys(TablerIcons);
  
  // Tabler icons are React components (objects), not functions
  const iconKeys = allKeys.filter(name => 
    name.startsWith('Icon') && 
    TablerIcons[name] !== undefined
  );
  
  return iconKeys.map(tablerToKebabName);
}

// Get icon component by kebab-case name
export function getIconComponent(kebabName: string): React.ComponentType<any> | null {
  const tablerName = kebabToTablerName(kebabName);
  const IconComponent = TablerIcons[tablerName];
  
  // Tabler icons are React components (objects), return if exists
  if (IconComponent !== undefined) {
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
    'star', 'heart', 'thumb-up', 'check', 'x', 'plus', 'minus',
    'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down',
    'home', 'user', 'mail', 'phone', 'message-circle',
    'calendar', 'clock', 'search', 'settings', 'menu'
  ];
}

// Validate icon name exists
export function isValidIconName(name: string): boolean {
  return getAllIconNames().includes(name);
}

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
