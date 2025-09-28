import { 
  type Project, 
  type Asset, 
  type InsertAsset,
  projects,
  assets
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Project management
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project>;
  updateProject(id: string, project: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  listProjects(): Promise<Project[]>;
  
  // Asset management
  getAsset(id: string): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: string, asset: Partial<Asset>): Promise<Asset | undefined>;
  deleteAsset(id: string): Promise<boolean>;
  listAssets(): Promise<Asset[]>;
}

export class DatabaseStorage implements IStorage {
  // Project management
  async getProject(id: string): Promise<Project | undefined> {
    try {
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, id));
      
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

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const id = randomUUID();
    const now = new Date();
    
    const [newProject] = await db
      .insert(projects)
      .values({
        id,
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

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    try {
      const now = new Date();
      // Convert string dates back to Date objects for database
      const dbUpdates: any = { ...updates };
      if (dbUpdates.lastOpenedAt && typeof dbUpdates.lastOpenedAt === 'string') {
        dbUpdates.lastOpenedAt = new Date(dbUpdates.lastOpenedAt);
      }
      
      const [updated] = await db
        .update(projects)
        .set({
          ...dbUpdates,
          updatedAt: now,
        })
        .where(eq(projects.id, id))
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

  async deleteProject(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(projects)
        .where(eq(projects.id, id));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }

  async listProjects(): Promise<Project[]> {
    try {
      const projectList = await db
        .select()
        .from(projects)
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
  async getAsset(id: string): Promise<Asset | undefined> {
    try {
      const [asset] = await db
        .select()
        .from(assets)
        .where(eq(assets.id, id));
      
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

  async createAsset(asset: InsertAsset): Promise<Asset> {
    const id = randomUUID();
    const now = new Date();
    
    const [newAsset] = await db
      .insert(assets)
      .values({
        id,
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

  async updateAsset(id: string, updates: Partial<Asset>): Promise<Asset | undefined> {
    try {
      // Convert string dates back to Date objects for database
      const dbUpdates: any = { ...updates };
      if (dbUpdates.uploadedAt && typeof dbUpdates.uploadedAt === 'string') {
        dbUpdates.uploadedAt = new Date(dbUpdates.uploadedAt);
      }
      
      const [updated] = await db
        .update(assets)
        .set(dbUpdates)
        .where(eq(assets.id, id))
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

  async deleteAsset(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(assets)
        .where(eq(assets.id, id));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting asset:', error);
      return false;
    }
  }

  async listAssets(): Promise<Asset[]> {
    try {
      const assetList = await db
        .select()
        .from(assets)
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
