import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { projectSchema, brandImportResultSchema } from "@shared/schema";
import { scrapeBrand } from "./services/brand-scraper";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Brand scraping endpoint
  app.get('/api/brand/scrape', async (req, res) => {
    try {
      const url = z.string().url().parse(req.query.url);
      const result = await scrapeBrand(url);
      const validatedResult = brandImportResultSchema.parse(result);
      res.json(validatedResult);
    } catch (error: any) {
      console.error('Brand scraping error:', error);
      res.status(500).json({ 
        error: error?.message || 'Failed to scrape brand',
        fallback: {
          palette: ['#1f2937', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
          fonts: { headings: 'Inter', body: 'Inter', sources: [] },
          evidence: { themeColor: null, cssVars: [], googleFonts: [], imagesUsedForPalette: [], screenshotUsed: false }
        }
      });
    }
  });

  // Project CRUD endpoints
  app.get('/api/projects', async (req, res) => {
    try {
      const projects = await storage.listProjects();
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/projects/:id', async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/projects', async (req, res) => {
    try {
      const projectData = projectSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse(req.body);
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/projects/:id', async (req, res) => {
    try {
      const updates = projectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, updates);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json(project);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/projects/:id', async (req, res) => {
    try {
      const deleted = await storage.deleteProject(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
