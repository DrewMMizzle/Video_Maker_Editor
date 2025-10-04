import { z } from "zod";
import { sql } from 'drizzle-orm';
import { 
  pgTable, 
  varchar, 
  text, 
  integer, 
  timestamp, 
  jsonb,
  serial,
  index
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

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
  isGif: z.boolean().optional(),
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
  durationSec: z.number().min(1).max(60).default(3),
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
  thumbnail: z.string().refine(
    (val) => !val || val.length <= 500000, // ~500KB limit for base64
    { message: "Thumbnail must be under 500KB" }
  ).optional(), // base64 data URL for preview
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

export const assetSchema = z.object({
  id: z.string(),
  filename: z.string(),
  fileType: z.string(), // MIME type like 'image/jpeg', 'image/png'
  fileSize: z.number(), // Size in bytes
  uploadedAt: z.string().datetime(),
  thumbnailUrl: z.string().optional(), // URL to thumbnail version
  objectPath: z.string(), // Path in object storage like '/objects/uploads/uuid'
  width: z.number().optional(), // Image width if applicable
  height: z.number().optional(), // Image height if applicable
});

export const insertAssetSchema = assetSchema.omit({ id: true, uploadedAt: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;

// Database table definitions
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  version: varchar("version").notNull().default("v1"),
  title: varchar("title", { length: 100 }).notNull().default("Untitled Project"),
  canvas: jsonb("canvas").notNull(),
  brand: jsonb("brand").notNull(),
  panes: jsonb("panes").notNull(),
  activePaneId: varchar("active_pane_id"),
  thumbnail: text("thumbnail"),
  lastOpenedAt: timestamp("last_opened_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const assets = pgTable("assets", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  filename: varchar("filename").notNull(),
  fileType: varchar("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  thumbnailUrl: varchar("thumbnail_url"),
  objectPath: varchar("object_path").notNull(),
  width: integer("width"),
  height: integer("height"),
});

// Create insert schemas using drizzle-zod
export const insertProjectSchema = createInsertSchema(projects).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertAssetSchemaDB = createInsertSchema(assets).omit({ 
  id: true, 
  uploadedAt: true 
});

// Export types
export type ElementBase = z.infer<typeof elementBaseSchema>;
export type TextElement = z.infer<typeof textElementSchema>;
export type ImageElement = z.infer<typeof imageElementSchema>;
export type IconElement = z.infer<typeof iconElementSchema>;
export type Element = TextElement | ImageElement | IconElement;
export type Pane = z.infer<typeof paneSchema>;
export type Brand = z.infer<typeof brandSchema>;
export type Project = z.infer<typeof projectSchema>;
export type BrandImportResult = z.infer<typeof brandImportResultSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertAssetDB = z.infer<typeof insertAssetSchemaDB>;

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
