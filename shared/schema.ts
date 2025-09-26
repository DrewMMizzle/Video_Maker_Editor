import { z } from "zod";

export type RGBHex = `#${string}`;

export const elementBaseSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'image', 'icon']),
  x: z.number(),
  y: z.number(),
  rotation: z.number().default(0),
  z: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
});

export const textElementSchema = elementBaseSchema.extend({
  type: z.literal('text'),
  text: z.string(),
  fontFamily: z.string().default('Inter'),
  fontSize: z.number().default(24),
  fontWeight: z.union([z.number(), z.string()]).default(400),
  lineHeight: z.number().default(1.2),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
  align: z.enum(['left', 'center', 'right']).default('center'),
  padding: z.number().default(0),
  bgColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const imageElementSchema = elementBaseSchema.extend({
  type: z.literal('image'),
  src: z.string(),
  width: z.number(),
  height: z.number(),
  cornerRadius: z.number().optional(),
});

export const iconElementSchema = elementBaseSchema.extend({
  type: z.literal('icon'),
  name: z.string(),
  size: z.number().default(24),
  strokeWidth: z.number().default(2),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
});

export const paneSchema = z.object({
  id: z.string(),
  name: z.string(),
  durationSec: z.number().min(1).max(10).default(3),
  bgColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
  elements: z.array(z.union([textElementSchema, imageElementSchema, iconElementSchema])),
  thumbnail: z.string().optional(),
});

export const brandSchema = z.object({
  palette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)),
  fonts: z.array(z.string()),
  headings: z.string().optional(),
  body: z.string().optional(),
});

export const projectSchema = z.object({
  id: z.string(),
  version: z.literal('v1'),
  title: z.string().min(1).max(100).default('Untitled Project'),
  canvas: z.object({
    width: z.number().default(1080),
    height: z.number().default(1080),
    background: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
  }),
  brand: brandSchema.default({
    palette: ['#1f2937', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
    fonts: ['Inter', 'Roboto'],
  }),
  panes: z.array(paneSchema),
  activePaneId: z.string().optional(),
  thumbnail: z.string().optional(), // base64 data URL for preview
  lastOpenedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const brandImportResultSchema = z.object({
  palette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)),
  fonts: z.object({
    headings: z.string().optional(),
    body: z.string().optional(),
    sources: z.array(z.string()),
  }),
  evidence: z.object({
    themeColor: z.string().nullable(),
    cssVars: z.array(z.string()),
    googleFonts: z.array(z.string()),
    imagesUsedForPalette: z.array(z.string()),
    screenshotUsed: z.boolean(),
  }),
});

export type ElementBase = z.infer<typeof elementBaseSchema>;
export type TextElement = z.infer<typeof textElementSchema>;
export type ImageElement = z.infer<typeof imageElementSchema>;
export type IconElement = z.infer<typeof iconElementSchema>;
export type Element = TextElement | ImageElement | IconElement;
export type Pane = z.infer<typeof paneSchema>;
export type Brand = z.infer<typeof brandSchema>;
export type Project = z.infer<typeof projectSchema>;
export type BrandImportResult = z.infer<typeof brandImportResultSchema>;
