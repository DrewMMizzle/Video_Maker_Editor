import { type Project, type Asset, type InsertAsset } from "@shared/schema";
import { randomUUID } from "crypto";

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

export class MemStorage implements IStorage {
  private projects: Map<string, Project>;
  private assets: Map<string, Asset>;
  private readonly MAX_PROJECTS = 100;
  private readonly MAX_ASSETS = 500;

  constructor() {
    this.projects = new Map();
    this.assets = new Map();
  }

  async getProject(id: string): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (project) {
      // Update lastOpenedAt when project is accessed
      const updatedProject = {
        ...project,
        lastOpenedAt: new Date().toISOString()
      };
      this.projects.set(id, updatedProject);
      return updatedProject;
    }
    return undefined;
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    // Check storage limit
    if (this.projects.size >= this.MAX_PROJECTS) {
      throw new Error(`Storage limit reached. Maximum ${this.MAX_PROJECTS} projects allowed.`);
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const newProject: Project = { 
      ...project, 
      id, 
      createdAt: now, 
      updatedAt: now,
      lastOpenedAt: now
    };
    this.projects.set(id, newProject);
    return newProject;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const existing = this.projects.get(id);
    if (!existing) return undefined;
    
    const updated: Project = { 
      ...existing, 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }

  async listProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  // Asset management methods
  async getAsset(id: string): Promise<Asset | undefined> {
    return this.assets.get(id);
  }

  async createAsset(asset: InsertAsset): Promise<Asset> {
    // Check storage limit
    if (this.assets.size >= this.MAX_ASSETS) {
      throw new Error(`Storage limit reached. Maximum ${this.MAX_ASSETS} assets allowed.`);
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const newAsset: Asset = { 
      ...asset, 
      id, 
      uploadedAt: now
    };
    this.assets.set(id, newAsset);
    return newAsset;
  }

  async updateAsset(id: string, updates: Partial<Asset>): Promise<Asset | undefined> {
    const existing = this.assets.get(id);
    if (!existing) return undefined;
    
    const updated: Asset = { 
      ...existing, 
      ...updates
    };
    this.assets.set(id, updated);
    return updated;
  }

  async deleteAsset(id: string): Promise<boolean> {
    return this.assets.delete(id);
  }

  async listAssets(): Promise<Asset[]> {
    return Array.from(this.assets.values()).sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }
}

export const storage = new MemStorage();
