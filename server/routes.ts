import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { projectSchema, brandImportResultSchema, assetSchema, insertAssetSchema } from "@shared/schema";
import { scrapeBrand } from "./services/brand-scraper";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";

const execAsync = promisify(exec);

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
  // Setup authentication middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Brand scraping endpoint (protected)
  app.get('/api/brand/scrape', isAuthenticated, async (req, res) => {
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
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projects = await storage.listProjects(userId);
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await storage.getProject(req.params.id, userId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectData = projectSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse(req.body);
      const project = await storage.createProject(projectData, userId);
      res.status(201).json(project);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = projectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, userId, updates);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json(project);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deleted = await storage.deleteProject(req.params.id, userId);
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
  app.post('/api/assets/upload', isAuthenticated, async (req, res) => {
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
  app.post('/api/assets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assetData = insertAssetSchema.parse(req.body);
      
      const objectStorageService = new ObjectStorageService();
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(assetData.objectPath);
      
      // Set public ACL policy for the uploaded asset
      try {
        await objectStorageService.trySetObjectEntityAclPolicy(assetData.objectPath, {
          owner: userId,
          visibility: 'public',
        });
      } catch (error) {
        console.error('Error setting ACL policy:', error);
        // Continue even if ACL fails - the file is still uploaded
      }
      
      const asset = await storage.createAsset({
        ...assetData,
        objectPath: normalizedPath
      }, userId);
      
      res.status(201).json(asset);
    } catch (error: any) {
      console.error('Error saving asset:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // List all assets
  app.get('/api/assets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assets = await storage.listAssets(userId);
      res.json(assets);
    } catch (error: any) {
      console.error('Error listing assets:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete asset and its storage object
  app.delete('/api/assets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const asset = await storage.getAsset(req.params.id, userId);
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
      const deleted = await storage.deleteAsset(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting asset:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Convert MP4 asset to GIF
  app.post('/api/assets/:id/convert-to-gif', isAuthenticated, async (req: any, res) => {
    const tempDir = '/tmp';
    let inputPath = '';
    let outputPath = '';
    
    try {
      const userId = req.user.claims.sub;
      const asset = await storage.getAsset(req.params.id, userId);
      
      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      
      if (!asset.fileType.startsWith('video/')) {
        return res.status(400).json({ error: 'Asset is not a video file' });
      }
      
      // Get duration from request body (default to 10 seconds)
      // 999 is used as a sentinel value for "full video length"
      const rawDuration = req.body?.duration;
      const duration = Number(rawDuration ?? 10);
      
      // Validate duration: must be a finite number, 5-30 seconds, or 999 (full length)
      if (!Number.isFinite(duration) || (duration !== 999 && (duration < 5 || duration > 30))) {
        return res.status(400).json({ 
          error: 'Duration must be between 5 and 30 seconds, or 999 for full video length' 
        });
      }
      
      const objectStorageService = new ObjectStorageService();
      
      // Download MP4 from object storage to temp file
      const objectFile = await objectStorageService.getObjectEntityFile(asset.objectPath);
      const mp4Buffer = await objectFile.download();
      
      inputPath = path.join(tempDir, `${randomUUID()}.mp4`);
      outputPath = path.join(tempDir, `${randomUUID()}.gif`);
      
      await fs.writeFile(inputPath, mp4Buffer[0]);
      
      // Run Python conversion script with virtual environment Python
      const scriptPath = path.join(process.cwd(), 'server', 'convertToGif.py');
      const pythonPath = path.join(process.cwd(), '.pythonlibs', 'bin', 'python3');
      const { stdout, stderr } = await execAsync(
        `"${pythonPath}" "${scriptPath}" "${inputPath}" "${outputPath}" ${duration} 10 500`
      );
      
      if (stderr && !stderr.includes('SUCCESS')) {
        throw new Error(`Conversion failed: ${stderr}`);
      }
      
      // Upload GIF to object storage
      const gifBuffer = await fs.readFile(outputPath);
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      
      await fetch(uploadURL, {
        method: 'PUT',
        body: gifBuffer,
        headers: {
          'Content-Type': 'image/gif',
        },
      });
      
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      
      // Calculate GIF dimensions (max 500px width, preserving aspect ratio)
      const maxWidth = 500;
      let width = asset.width || maxWidth;
      let height = asset.height || maxWidth;
      
      if (width > maxWidth) {
        const aspectRatio = height / width;
        width = maxWidth;
        height = Math.floor(maxWidth * aspectRatio);
      }
      
      // Set public ACL policy for the uploaded GIF
      try {
        await objectStorageService.trySetObjectEntityAclPolicy(uploadURL, {
          owner: userId,
          visibility: 'public',
        });
      } catch (error) {
        console.error('Error setting ACL policy:', error);
      }
      
      // Create new asset record for GIF
      const gifAsset = await storage.createAsset({
        filename: asset.filename.replace(/\.[^/.]+$/, '.gif'),
        fileType: 'image/gif',
        fileSize: gifBuffer.length,
        objectPath: normalizedPath,
        width,
        height,
      }, userId);
      
      res.status(201).json(gifAsset);
      
    } catch (error: any) {
      console.error('Error converting to GIF:', error);
      res.status(500).json({ error: error.message || 'Conversion failed' });
    } finally {
      // Clean up temp files
      try {
        if (inputPath) await fs.unlink(inputPath).catch(() => {});
        if (outputPath) await fs.unlink(outputPath).catch(() => {});
      } catch (e) {
        console.error('Error cleaning up temp files:', e);
      }
    }
  });

  // Serve uploaded objects (public access) with optimized headers
  app.get('/objects/:objectPath(*)', async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      
      // Get file metadata for better MIME type detection
      const [metadata] = await objectFile.getMetadata();
      const fileName = req.path.split('/').pop() || '';
      
      // Detect MIME type from file extension as fallback
      const detectMime = (path: string): string => {
        const ext = path.toLowerCase().split('.').pop();
        switch (ext) {
          case 'jpg':
          case 'jpeg':
            return 'image/jpeg';
          case 'png':
            return 'image/png';
          case 'gif':
            return 'image/gif';
          case 'webp':
            return 'image/webp';
          case 'svg':
            return 'image/svg+xml';
          default:
            return metadata.contentType || 'application/octet-stream';
        }
      };
      
      // Set optimized headers with CORS support
      res.setHeader('Content-Type', detectMime(fileName));
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Content-Length', metadata.size || '0');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      // Download with optimized settings
      await objectStorageService.downloadObject(objectFile, res, 31536000); // 1 year cache
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
