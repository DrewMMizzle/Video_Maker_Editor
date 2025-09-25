import { type Project } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project>;
  updateProject(id: string, project: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  listProjects(): Promise<Project[]>;
}

export class MemStorage implements IStorage {
  private projects: Map<string, Project>;

  constructor() {
    this.projects = new Map();
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const newProject: Project = { 
      ...project, 
      id, 
      createdAt: now, 
      updatedAt: now 
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
}

export const storage = new MemStorage();
