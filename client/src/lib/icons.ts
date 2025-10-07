import * as TablerIconsModule from '@tabler/icons-react';

export interface IconDefinition {
  name: string;
  component: React.ComponentType<any>;
  category: string;
  keywords: string[];
}

// Handle both default and named exports
const TablerIcons = (TablerIconsModule as any).default || TablerIconsModule;

// Keyword mapping for better search discoverability
const ICON_KEYWORDS: Record<string, string[]> = {
  // Legal & Professional
  'legal': ['gavel', 'scale', 'balance', 'briefcase', 'license', 'certificate', 'file-certificate'],
  'law': ['gavel', 'scale', 'balance', 'briefcase'],
  'justice': ['gavel', 'scale', 'balance'],
  
  // Business & Finance
  'business': ['briefcase', 'building', 'chart', 'presentation', 'tie', 'businessplan'],
  'money': ['coin', 'cash', 'currency', 'wallet', 'credit-card', 'coins', 'currency-dollar', 'moneybag'],
  'finance': ['chart', 'trending-up', 'trending-down', 'wallet', 'coin', 'coins'],
  'payment': ['credit-card', 'wallet', 'cash', 'coin', 'receipt'],
  'shopping': ['shopping-cart', 'basket', 'shopping-bag', 'tag', 'receipt', 'discount'],
  
  // Communication & Social
  'communication': ['message', 'phone', 'mail', 'chat', 'message-circle', 'message-dots'],
  'social': ['share', 'users', 'message-circle', 'heart', 'thumb-up', 'user-plus'],
  'contact': ['phone', 'mail', 'message', 'address-book', 'id-badge'],
  'chat': ['message', 'message-circle', 'message-dots', 'messages', 'bubble'],
  
  // Navigation & Direction
  'navigation': ['arrow-right', 'arrow-left', 'arrow-up', 'arrow-down', 'compass', 'map', 'location'],
  'direction': ['arrow-right', 'arrow-left', 'arrow-up', 'arrow-down', 'arrows'],
  'location': ['map', 'map-pin', 'location', 'compass', 'navigation'],
  
  // Media & Entertainment
  'media': ['photo', 'camera', 'video', 'music', 'microphone', 'player-play'],
  'music': ['music', 'headphones', 'microphone', 'player-play', 'volume'],
  'video': ['video', 'camera', 'movie', 'player-play', 'film'],
  'photo': ['photo', 'camera', 'image', 'panorama'],
  
  // Time & Calendar
  'time': ['clock', 'alarm', 'hourglass', 'calendar-time'],
  'calendar': ['calendar', 'calendar-event', 'calendar-time', 'calendar-plus'],
  'schedule': ['calendar', 'clock', 'alarm', 'calendar-event'],
  
  // Weather & Nature
  'weather': ['cloud', 'sun', 'moon', 'cloud-rain', 'snowflake', 'wind'],
  'nature': ['leaf', 'tree', 'plant', 'flower', 'sun', 'moon'],
  
  // Files & Documents
  'document': ['file', 'file-text', 'files', 'folder', 'clipboard'],
  'file': ['file', 'file-text', 'files', 'folder', 'file-certificate'],
  'folder': ['folder', 'folder-open', 'folders'],
  
  // Security & Privacy
  'security': ['lock', 'shield', 'key', 'shield-check', 'lock-open'],
  'privacy': ['lock', 'eye-off', 'shield', 'incognito'],
  'password': ['lock', 'key', 'shield', 'fingerprint'],
  
  // Technology & Devices
  'technology': ['device-desktop', 'device-mobile', 'laptop', 'code', 'cpu'],
  'computer': ['device-desktop', 'laptop', 'monitor', 'cpu'],
  'mobile': ['device-mobile', 'smartphone', 'tablet'],
  
  // Actions & UI
  'edit': ['edit', 'pencil', 'pen', 'forms'],
  'delete': ['trash', 'x', 'x-circle'],
  'add': ['plus', 'plus-circle', 'circle-plus'],
  'remove': ['minus', 'x', 'trash'],
  'save': ['device-floppy', 'download', 'check'],
  'search': ['search', 'zoom-in', 'magnifying-glass'],
  
  // Health & Medical
  'health': ['heart', 'heartbeat', 'medical-cross', 'stethoscope', 'pill'],
  'medical': ['medical-cross', 'stethoscope', 'pill', 'first-aid-kit', 'hospital'],
  
  // Food & Dining
  'food': ['coffee', 'pizza', 'cake', 'apple', 'tool-kitchen'],
  'restaurant': ['tool-kitchen', 'chef-hat', 'tools-kitchen'],
  
  // Transportation
  'transportation': ['car', 'bus', 'plane', 'bike', 'train', 'rocket'],
  'travel': ['plane', 'luggage', 'map', 'compass', 'world'],
  
  // Education
  'education': ['book', 'school', 'certificate', 'pencil', 'backpack'],
  'learning': ['book', 'bulb', 'certificate', 'school'],
};

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
  const results: string[] = [];
  const seenIcons = new Set<string>();
  
  // Helper to add unique icons
  const addUnique = (icons: string[]) => {
    icons.forEach(icon => {
      if (!seenIcons.has(icon)) {
        seenIcons.add(icon);
        results.push(icon);
      }
    });
  };
  
  // 1. Exact icon name match (highest priority)
  const exactMatches = allIcons.filter(name => 
    name.toLowerCase() === searchTerm
  );
  addUnique(exactMatches);
  
  // 2. Keyword category match (e.g., "legal" → gavel, scale, balance)
  const keywordMatches = ICON_KEYWORDS[searchTerm] || [];
  const validKeywordMatches = keywordMatches.filter(icon => 
    allIcons.includes(icon)
  );
  addUnique(validKeywordMatches);
  
  // 3. Partial keyword match (search term is part of a keyword)
  const partialKeywordMatches: string[] = [];
  Object.entries(ICON_KEYWORDS).forEach(([keyword, icons]) => {
    if (keyword.includes(searchTerm)) {
      partialKeywordMatches.push(...icons.filter(icon => allIcons.includes(icon)));
    }
  });
  addUnique(partialKeywordMatches);
  
  // 4. Icons that start with search term
  const startsWithMatches = allIcons.filter(name => 
    name.toLowerCase().startsWith(searchTerm)
  );
  addUnique(startsWithMatches);
  
  // 5. Icons that contain search term
  const containsMatches = allIcons.filter(name => 
    name.toLowerCase().includes(searchTerm)
  );
  addUnique(containsMatches);
  
  // 6. Icons in keyword lists where the keyword contains the search term
  const relatedKeywordMatches: string[] = [];
  Object.entries(ICON_KEYWORDS).forEach(([keyword, icons]) => {
    // Check if any icon in this keyword's list matches our search
    const matchingIcons = icons.filter(icon => 
      icon.toLowerCase().includes(searchTerm) && allIcons.includes(icon)
    );
    relatedKeywordMatches.push(...matchingIcons);
  });
  addUnique(relatedKeywordMatches);
  
  return results.slice(0, limit);
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
