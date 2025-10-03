import { 
  type Project, 
  type Asset, 
  type InsertAsset,
  type User,
  type UpsertUser,
  projects,
  assets,
  users
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User management (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Project management
  getProject(id: string, userId: string): Promise<Project | undefined>;
  createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<Project>;
  updateProject(id: string, userId: string, project: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string, userId: string): Promise<boolean>;
  listProjects(userId: string): Promise<Project[]>;
  
  // Asset management
  getAsset(id: string, userId: string): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset, userId: string): Promise<Asset>;
  updateAsset(id: string, userId: string, asset: Partial<Asset>): Promise<Asset | undefined>;
  deleteAsset(id: string, userId: string): Promise<boolean>;
  listAssets(userId: string): Promise<Asset[]>;
}

export class DatabaseStorage implements IStorage {
  // User management
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Project management
  async getProject(id: string, userId: string): Promise<Project | undefined> {
    try {
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, userId)));
      
      if (!project) return undefined;

      // Update lastOpenedAt when project is accessed
      const now = new Date();
      await db
        .update(projects)
        .set({ lastOpenedAt: now })
        .where(eq(projects.id, id));

      // Convert database format to Project type
      return {
        id: project.id,
        version: project.version as "v1",
        title: project.title,
        canvas: project.canvas as any,
        brand: project.brand as any,
        panes: project.panes as any,
        activePaneId: project.activePaneId || undefined,
        thumbnail: project.thumbnail || undefined,
        lastOpenedAt: now.toISOString(),
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      };
    } catch (error) {
      console.error('Error getting project:', error);
      return undefined;
    }
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<Project> {
    const id = randomUUID();
    const now = new Date();
    
    const [newProject] = await db
      .insert(projects)
      .values({
        id,
        userId,
        version: project.version,
        title: project.title,
        canvas: project.canvas,
        brand: project.brand,
        panes: project.panes,
        activePaneId: project.activePaneId,
        thumbnail: project.thumbnail,
        lastOpenedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return {
      id: newProject.id,
      version: newProject.version as "v1",
      title: newProject.title,
      canvas: newProject.canvas as any,
      brand: newProject.brand as any,
      panes: newProject.panes as any,
      activePaneId: newProject.activePaneId || undefined,
      thumbnail: newProject.thumbnail || undefined,
      lastOpenedAt: newProject.lastOpenedAt?.toISOString() || now.toISOString(),
      createdAt: newProject.createdAt.toISOString(),
      updatedAt: newProject.updatedAt.toISOString(),
    };
  }

  async updateProject(id: string, userId: string, updates: Partial<Project>): Promise<Project | undefined> {
    try {
      const now = new Date();
      // Convert string dates back to Date objects for database
      const dbUpdates: any = { ...updates };
      if (dbUpdates.lastOpenedAt && typeof dbUpdates.lastOpenedAt === 'string') {
        dbUpdates.lastOpenedAt = new Date(dbUpdates.lastOpenedAt);
      }
      if (dbUpdates.createdAt && typeof dbUpdates.createdAt === 'string') {
        dbUpdates.createdAt = new Date(dbUpdates.createdAt);
      }
      // Note: updatedAt is always set to now, so we don't need to convert it
      
      const [updated] = await db
        .update(projects)
        .set({
          ...dbUpdates,
          updatedAt: now,
        })
        .where(and(eq(projects.id, id), eq(projects.userId, userId)))
        .returning();

      if (!updated) return undefined;

      return {
        id: updated.id,
        version: updated.version as "v1",
        title: updated.title,
        canvas: updated.canvas as any,
        brand: updated.brand as any,
        panes: updated.panes as any,
        activePaneId: updated.activePaneId || undefined,
        thumbnail: updated.thumbnail || undefined,
        lastOpenedAt: updated.lastOpenedAt?.toISOString(),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (error) {
      console.error('Error updating project:', error);
      return undefined;
    }
  }

  async deleteProject(id: string, userId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, userId)));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }

  async listProjects(userId: string): Promise<Project[]> {
    try {
      const projectList = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.updatedAt));

      return projectList.map(project => ({
        id: project.id,
        version: project.version as "v1",
        title: project.title,
        canvas: project.canvas as any,
        brand: project.brand as any,
        panes: project.panes as any,
        activePaneId: project.activePaneId || undefined,
        thumbnail: project.thumbnail || undefined,
        lastOpenedAt: project.lastOpenedAt?.toISOString(),
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      }));
    } catch (error) {
      console.error('Error listing projects:', error);
      return [];
    }
  }

  // Asset management methods
  async getAsset(id: string, userId: string): Promise<Asset | undefined> {
    try {
      const [asset] = await db
        .select()
        .from(assets)
        .where(and(eq(assets.id, id), eq(assets.userId, userId)));
      
      if (!asset) return undefined;

      return {
        id: asset.id,
        filename: asset.filename,
        fileType: asset.fileType,
        fileSize: asset.fileSize,
        uploadedAt: asset.uploadedAt.toISOString(),
        thumbnailUrl: asset.thumbnailUrl || undefined,
        objectPath: asset.objectPath,
        width: asset.width || undefined,
        height: asset.height || undefined,
      };
    } catch (error) {
      console.error('Error getting asset:', error);
      return undefined;
    }
  }

  async createAsset(asset: InsertAsset, userId: string): Promise<Asset> {
    const id = randomUUID();
    const now = new Date();
    
    const [newAsset] = await db
      .insert(assets)
      .values({
        id,
        userId,
        filename: asset.filename,
        fileType: asset.fileType,
        fileSize: asset.fileSize,
        thumbnailUrl: asset.thumbnailUrl,
        objectPath: asset.objectPath,
        width: asset.width,
        height: asset.height,
        uploadedAt: now,
      })
      .returning();

    return {
      id: newAsset.id,
      filename: newAsset.filename,
      fileType: newAsset.fileType,
      fileSize: newAsset.fileSize,
      uploadedAt: newAsset.uploadedAt.toISOString(),
      thumbnailUrl: newAsset.thumbnailUrl || undefined,
      objectPath: newAsset.objectPath,
      width: newAsset.width || undefined,
      height: newAsset.height || undefined,
    };
  }

  async updateAsset(id: string, userId: string, updates: Partial<Asset>): Promise<Asset | undefined> {
    try {
      // Convert string dates back to Date objects for database
      const dbUpdates: any = { ...updates };
      if (dbUpdates.uploadedAt && typeof dbUpdates.uploadedAt === 'string') {
        dbUpdates.uploadedAt = new Date(dbUpdates.uploadedAt);
      }
      
      const [updated] = await db
        .update(assets)
        .set(dbUpdates)
        .where(and(eq(assets.id, id), eq(assets.userId, userId)))
        .returning();

      if (!updated) return undefined;

      return {
        id: updated.id,
        filename: updated.filename,
        fileType: updated.fileType,
        fileSize: updated.fileSize,
        uploadedAt: updated.uploadedAt.toISOString(),
        thumbnailUrl: updated.thumbnailUrl || undefined,
        objectPath: updated.objectPath,
        width: updated.width || undefined,
        height: updated.height || undefined,
      };
    } catch (error) {
      console.error('Error updating asset:', error);
      return undefined;
    }
  }

  async deleteAsset(id: string, userId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(assets)
        .where(and(eq(assets.id, id), eq(assets.userId, userId)));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting asset:', error);
      return false;
    }
  }

  async listAssets(userId: string): Promise<Asset[]> {
    try {
      const assetList = await db
        .select()
        .from(assets)
        .where(eq(assets.userId, userId))
        .orderBy(desc(assets.uploadedAt));

      return assetList.map(asset => ({
        id: asset.id,
        filename: asset.filename,
        fileType: asset.fileType,
        fileSize: asset.fileSize,
        uploadedAt: asset.uploadedAt.toISOString(),
        thumbnailUrl: asset.thumbnailUrl || undefined,
        objectPath: asset.objectPath,
        width: asset.width || undefined,
        height: asset.height || undefined,
      }));
    } catch (error) {
      console.error('Error listing assets:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();
