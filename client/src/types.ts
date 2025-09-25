export type RGBHex = `#${string}`;

export interface KonvaElement {
  id: string;
  type: 'text' | 'image' | 'icon';
  x: number;
  y: number;
  rotation: number;
  z: number;
  opacity: number;
}

export interface KonvaText extends KonvaElement {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  lineHeight: number;
  color: RGBHex;
  align: 'left' | 'center' | 'right';
  padding: number;
  bgColor?: RGBHex;
}

export interface KonvaImage extends KonvaElement {
  type: 'image';
  src: string;
  width: number;
  height: number;
  cornerRadius?: number;
}

export interface KonvaIcon extends KonvaElement {
  type: 'icon';
  name: string;
  size: number;
  strokeWidth: number;
  color: RGBHex;
}

export type Element = KonvaText | KonvaImage | KonvaIcon;

export interface AspectRatio {
  label: string;
  value: string;
  width: number;
  height: number;
}

export const ASPECT_RATIOS: AspectRatio[] = [
  { label: 'Square (1:1)', value: '1:1', width: 1080, height: 1080 },
  { label: 'Portrait (9:16)', value: '9:16', width: 1080, height: 1920 },
  { label: 'Landscape (16:9)', value: '16:9', width: 1920, height: 1080 },
  { label: 'Instagram (4:5)', value: '4:5', width: 1080, height: 1350 },
];

export const FONT_FAMILIES = [
  'Inter',
  'Roboto',
  'Playfair Display',
  'Open Sans',
  'Montserrat',
  'Poppins',
  'Lora',
  'Merriweather',
  'Source Sans Pro',
  'Nunito Sans',
];

export const FONT_WEIGHTS = [
  { label: 'Light', value: 300 },
  { label: 'Regular', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'Semibold', value: 600 },
  { label: 'Bold', value: 700 },
  { label: 'Black', value: 900 },
];

export const TEMPLATES = [
  {
    id: 'headline-sub',
    name: 'Headline + Sub',
    icon: '📰',
    elements: [
      {
        id: 'title',
        type: 'text' as const,
        text: 'Your Headline Here',
        x: 540,
        y: 450,
        rotation: 0,
        z: 1,
        opacity: 1,
        fontFamily: 'Inter',
        fontSize: 48,
        fontWeight: 700,
        lineHeight: 1.2,
        color: '#1f2937' as RGBHex,
        align: 'center' as const,
        padding: 0,
      },
      {
        id: 'subtitle',
        type: 'text' as const,
        text: 'Supporting text goes here',
        x: 540,
        y: 580,
        rotation: 0,
        z: 2,
        opacity: 1,
        fontFamily: 'Inter',
        fontSize: 24,
        fontWeight: 400,
        lineHeight: 1.4,
        color: '#6b7280' as RGBHex,
        align: 'center' as const,
        padding: 0,
      }
    ]
  },
  {
    id: 'quote-card',
    name: 'Quote Card',
    icon: '💬',
    elements: [
      {
        id: 'quote',
        type: 'text' as const,
        text: '"Your inspiring quote here"',
        x: 540,
        y: 540,
        rotation: 0,
        z: 1,
        opacity: 1,
        fontFamily: 'Playfair Display',
        fontSize: 36,
        fontWeight: 400,
        lineHeight: 1.4,
        color: '#1f2937' as RGBHex,
        align: 'center' as const,
        padding: 40,
        bgColor: '#f9fafb' as RGBHex,
      }
    ]
  },
  {
    id: 'checklist',
    name: 'Checklist',
    icon: '✅',
    elements: [
      {
        id: 'check1',
        type: 'text' as const,
        text: '✓ Feature one',
        x: 540,
        y: 400,
        rotation: 0,
        z: 1,
        opacity: 1,
        fontFamily: 'Inter',
        fontSize: 28,
        fontWeight: 500,
        lineHeight: 1.5,
        color: '#059669' as RGBHex,
        align: 'center' as const,
        padding: 0,
      },
      {
        id: 'check2',
        type: 'text' as const,
        text: '✓ Feature two',
        x: 540,
        y: 480,
        rotation: 0,
        z: 2,
        opacity: 1,
        fontFamily: 'Inter',
        fontSize: 28,
        fontWeight: 500,
        lineHeight: 1.5,
        color: '#059669' as RGBHex,
        align: 'center' as const,
        padding: 0,
      },
      {
        id: 'check3',
        type: 'text' as const,
        text: '✓ Feature three',
        x: 540,
        y: 560,
        rotation: 0,
        z: 3,
        opacity: 1,
        fontFamily: 'Inter',
        fontSize: 28,
        fontWeight: 500,
        lineHeight: 1.5,
        color: '#059669' as RGBHex,
        align: 'center' as const,
        padding: 0,
      }
    ]
  }
];
