import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { projectSchema, brandImportResultSchema, assetSchema, insertAssetSchema } from "@shared/schema";
import { scrapeBrand } from "./services/brand-scraper";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { z } from "zod";

// Helper function to normalize and validate URLs
function normalizeUrl(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Please enter a valid website URL');
  }
  
  let url = input.trim();
  
  // Add https:// if no protocol is specified
  if (!url.match(/^https?:\/\//)) {
    url = `https://${url}`;
  }
  
  // Validate the URL format
  try {
    new URL(url);
    return url;
  } catch {
    throw new Error('Please enter a valid website URL (e.g., google.com or https://google.com)');
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Brand scraping endpoint
  app.get('/api/brand/scrape', async (req, res) => {
    try {
      const rawUrl = req.query.url;
      const url = normalizeUrl(rawUrl as string);
      const result = await scrapeBrand(url);
      const validatedResult = brandImportResultSchema.parse(result);
      res.json(validatedResult);
    } catch (error: any) {
      console.error('Brand scraping error:', error);
      
      // Check if it's a URL validation error vs scraping error
      const isValidationError = error?.message?.includes('valid website URL');
      
      res.status(isValidationError ? 400 : 500).json({ 
        error: error?.message || 'Failed to scrape brand',
        fallback: isValidationError ? null : {
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

  // Asset management endpoints
  
  // Get presigned upload URL for asset upload
  app.post('/api/assets/upload', async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error: any) {
      console.error('Error generating upload URL:', error);
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  });

  // Save asset metadata after successful upload
  app.post('/api/assets', async (req, res) => {
    try {
      const assetData = insertAssetSchema.parse(req.body);
      
      // For public file uploading (no auth required), set basic ACL policy
      const objectStorageService = new ObjectStorageService();
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(assetData.objectPath);
      
      // Set public ACL policy for the uploaded asset
      try {
        await objectStorageService.trySetObjectEntityAclPolicy(assetData.objectPath, {
          owner: 'system', // For now, using 'system' as owner since no auth
          visibility: 'public',
        });
      } catch (error) {
        console.error('Error setting ACL policy:', error);
        // Continue even if ACL fails - the file is still uploaded
      }
      
      const asset = await storage.createAsset({
        ...assetData,
        objectPath: normalizedPath
      });
      
      res.status(201).json(asset);
    } catch (error: any) {
      console.error('Error saving asset:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // List all assets
  app.get('/api/assets', async (req, res) => {
    try {
      const assets = await storage.listAssets();
      res.json(assets);
    } catch (error: any) {
      console.error('Error listing assets:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete asset and its storage object
  app.delete('/api/assets/:id', async (req, res) => {
    try {
      const asset = await storage.getAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      // Try to delete from object storage
      try {
        const objectStorageService = new ObjectStorageService();
        await objectStorageService.deleteObjectEntity(asset.objectPath);
      } catch (error) {
        console.error('Error deleting from object storage:', error);
        // Continue even if object storage deletion fails
      }

      // Delete from local storage
      const deleted = await storage.deleteAsset(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting asset:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Serve uploaded objects (public access)
  app.get('/objects/:objectPath(*)', async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error('Error accessing object:', error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
