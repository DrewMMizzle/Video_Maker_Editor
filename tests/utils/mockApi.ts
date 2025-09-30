import { Page } from '@playwright/test';
import type { Project, Asset } from '@shared/schema';

/**
 * Mock API utilities for Playwright tests
 * These intercept API calls so tests don't save to the actual database/library
 */

export class MockApiHelper {
  private mockProjects: Map<string, Project> = new Map();
  private mockAssets: Map<string, Asset> = new Map();

  constructor(private page: Page) {}

  /**
   * Setup all API route mocks before tests run
   */
  async setupMocks() {
    // Register specific mocks FIRST
    await this.mockProjectRoutes();
    await this.mockAssetRoutes();
    await this.mockBrandRoutes();
    
    // Catch-all: Block any unmocked API calls to fail fast
    // This is registered LAST so it only catches unmocked endpoints
    await this.page.route('**/api/**', async (route) => {
      console.error('❌ Unmocked API call detected:', route.request().url());
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Unmocked API call - all API endpoints must be mocked in tests' 
        }),
      });
    });
  }

  /**
   * Mock project CRUD endpoints
   */
  private async mockProjectRoutes() {
    // GET /api/projects - List all projects
    await this.page.route('**/api/projects', async (route) => {
      if (route.request().method() === 'GET') {
        const projects = Array.from(this.mockProjects.values());
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(projects),
        });
      } 
      // POST /api/projects - Create new project
      else if (route.request().method() === 'POST') {
        const projectData = route.request().postDataJSON();
        const newProject: Project = {
          id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...projectData,
        };
        this.mockProjects.set(newProject.id, newProject);
        
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newProject),
        });
      }
    });

    // GET /api/projects/:id - Get single project
    await this.page.route('**/api/projects/*', async (route) => {
      const method = route.request().method();
      const url = route.request().url();
      const projectId = url.split('/').pop()!;

      if (method === 'GET') {
        const project = this.mockProjects.get(projectId);
        if (project) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(project),
          });
        } else {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Project not found' }),
          });
        }
      } 
      // PUT /api/projects/:id - Update project
      else if (method === 'PUT') {
        const updates = route.request().postDataJSON();
        const existingProject = this.mockProjects.get(projectId);
        
        if (existingProject) {
          const updatedProject = {
            ...existingProject,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          this.mockProjects.set(projectId, updatedProject);
          
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(updatedProject),
          });
        } else {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Project not found' }),
          });
        }
      }
      // DELETE /api/projects/:id - Delete project
      else if (method === 'DELETE') {
        const deleted = this.mockProjects.delete(projectId);
        if (deleted) {
          await route.fulfill({ status: 204 });
        } else {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Project not found' }),
          });
        }
      }
    });
  }

  /**
   * Mock asset endpoints
   */
  private async mockAssetRoutes() {
    // GET /api/assets - List all assets
    await this.page.route('**/api/assets', async (route) => {
      if (route.request().method() === 'GET') {
        const assets = Array.from(this.mockAssets.values());
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(assets),
        });
      }
      // POST /api/assets - Create asset (after upload)
      else if (route.request().method() === 'POST') {
        const assetData = route.request().postDataJSON();
        const newAsset: Asset = {
          id: `mock-asset-${Date.now()}`,
          uploadedAt: new Date().toISOString(),
          ...assetData,
        };
        this.mockAssets.set(newAsset.id, newAsset);
        
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newAsset),
        });
      }
    });

    // POST /api/assets/upload - Get upload URL
    await this.page.route('**/api/assets/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          // Use relative same-origin URL to avoid mixed content issues
          uploadURL: '/__mock_upload__/test-file.png' 
        }),
      });
    });

    // Mock the upload endpoint itself (handles PUT for presigned uploads)
    await this.page.route('**/__mock_upload__/**', async (route) => {
      // Accept both PUT (presigned upload) and POST
      if (route.request().method() === 'PUT' || route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    // DELETE /api/assets/:id
    await this.page.route('**/api/assets/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        const assetId = route.request().url().split('/').pop()!;
        const deleted = this.mockAssets.delete(assetId);
        
        if (deleted) {
          await route.fulfill({ status: 204 });
        } else {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Asset not found' }),
          });
        }
      }
    });
  }

  /**
   * Mock brand scraping endpoint
   */
  private async mockBrandRoutes() {
    await this.page.route('**/api/brand/scrape*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          palette: ['#1f2937', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
          fonts: {
            headings: 'Inter',
            body: 'Inter',
            sources: [],
          },
          evidence: {
            themeColor: '#3b82f6',
            cssVars: [],
            googleFonts: [],
            imagesUsedForPalette: [],
            screenshotUsed: false,
          },
        }),
      });
    });
  }

  /**
   * Get all mocked projects (for assertions)
   */
  getMockProjects(): Project[] {
    return Array.from(this.mockProjects.values());
  }

  /**
   * Get all mocked assets (for assertions)
   */
  getMockAssets(): Asset[] {
    return Array.from(this.mockAssets.values());
  }

  /**
   * Clear all mock data between tests
   */
  clearMocks() {
    this.mockProjects.clear();
    this.mockAssets.clear();
  }

  /**
   * Add a mock project manually (for testing specific scenarios)
   */
  addMockProject(project: Project) {
    this.mockProjects.set(project.id, project);
  }

  /**
   * Add a mock asset manually (for testing specific scenarios)
   */
  addMockAsset(asset: Asset) {
    this.mockAssets.set(asset.id, asset);
  }
}
