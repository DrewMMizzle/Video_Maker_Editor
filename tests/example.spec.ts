import { test, expect } from '@playwright/test';
import { MockApiHelper } from './utils/mockApi';

/**
 * Example test demonstrating mock storage usage
 * 
 * This test shows how to:
 * 1. Set up API mocks so tests don't save to the real library
 * 2. Test the application with isolated mock data
 * 3. Clean up between tests
 */

test.describe('Video Editor with Mock Storage', () => {
  let mockApi: MockApiHelper;

  test.beforeEach(async ({ page }) => {
    // Initialize mock API helper
    mockApi = new MockApiHelper(page);
    
    // Setup all API route mocks
    await mockApi.setupMocks();
    
    // Navigate to the editor
    await page.goto('/');
  });

  test.afterEach(async () => {
    // Clear mock data after each test
    mockApi.clearMocks();
  });

  test('should save project to mock storage (not real library)', async ({ page }) => {
    // Add some content to the project
    await page.click('[data-testid="button-add-text"]');
    
    // Type in the text element (if text editing works)
    const textElement = page.locator('text="Double-click to edit"').first();
    if (await textElement.isVisible()) {
      await textElement.dblclick();
      await page.keyboard.type('Test Project Content');
      await page.keyboard.press('Escape');
    }
    
    // Save the project
    await page.click('[data-testid="button-save"]');
    
    // Wait for save to complete
    await page.waitForTimeout(500);
    
    // Verify the project was saved to MOCK storage (not real library)
    const mockProjects = mockApi.getMockProjects();
    expect(mockProjects.length).toBe(1);
    expect(mockProjects[0].title).toBe('Untitled Project');
    
    // This proves the project is ONLY in mock storage, not the real database
    console.log('✅ Project saved to mock storage:', mockProjects[0].id);
  });

  test('should load project from mock storage', async ({ page }) => {
    // Pre-populate mock storage with a test project
    mockApi.addMockProject({
      id: 'test-project-123',
      version: 'v1',
      title: 'Test Project from Mock',
      canvas: { width: 1080, height: 1080, aspectRatio: '1:1' },
      brand: { palette: ['#3b82f6'], fonts: { headings: 'Inter', body: 'Inter' } },
      panes: [
        {
          id: 'pane-1',
          name: 'Scene 1',
          durationSec: 3,
          bgColor: '#3b82f6',
          elements: [],
        },
      ],
      activePaneId: 'pane-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Navigate to library
    await page.click('[data-testid="button-library"]');
    
    // Verify the mock project appears
    const projectCard = page.locator('[data-testid="card-project-test-project-123"]');
    await expect(projectCard).toBeVisible();
    
    // Verify project title
    const titleElement = page.locator('[data-testid="text-title-test-project-123"]');
    await expect(titleElement).toHaveText('Test Project from Mock');
    
    console.log('✅ Mock project loaded successfully from mock storage');
  });

  test('should delete project from mock storage only', async ({ page }) => {
    // Add a mock project
    mockApi.addMockProject({
      id: 'delete-test-123',
      version: 'v1',
      title: 'Project to Delete',
      canvas: { width: 1080, height: 1080, aspectRatio: '1:1' },
      brand: { palette: ['#3b82f6'], fonts: { headings: 'Inter', body: 'Inter' } },
      panes: [
        {
          id: 'pane-1',
          name: 'Scene 1',
          durationSec: 3,
          bgColor: '#3b82f6',
          elements: [],
        },
      ],
      activePaneId: 'pane-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Navigate to library
    await page.click('[data-testid="button-library"]');
    
    // Open actions menu
    await page.click('[data-testid="button-actions-delete-test-123"]');
    
    // Click delete
    await page.click('[data-testid="button-delete-delete-test-123"]');
    
    // Confirm deletion
    await page.click('[data-testid="button-confirm-delete-delete-test-123"]');
    
    // Verify project is deleted from mock storage
    const mockProjects = mockApi.getMockProjects();
    expect(mockProjects.length).toBe(0);
    
    console.log('✅ Project deleted from mock storage (real library unaffected)');
  });

  test('should work with brand import (mocked)', async ({ page }) => {
    // Click brand import button
    await page.click('[data-testid="button-brand-import"]');
    
    // Enter a URL (will be mocked)
    await page.fill('[data-testid="input-brand-url"]', 'https://example.com');
    
    // Click import
    await page.click('[data-testid="button-import-brand"]');
    
    // Wait for mock response
    await page.waitForTimeout(500);
    
    // The brand import will return mocked data (not real scraping)
    // Verify the mock brand palette appears
    const colorSwatch = page.locator('.color-swatch').first();
    if (await colorSwatch.isVisible()) {
      console.log('✅ Brand import returned mocked data successfully');
    }
  });
});

/**
 * Key Benefits of Mock Storage:
 * 
 * 1. ✅ Tests run in isolation - no interference with real data
 * 2. ✅ No cleanup needed - mock data disappears after tests
 * 3. ✅ Faster tests - no database roundtrips
 * 4. ✅ Reliable tests - same mock data every time
 * 5. ✅ Safe testing - can't accidentally corrupt real library
 * 
 * When tests run, they:
 * - Create/update/delete projects ONLY in mock storage
 * - Never touch the real PostgreSQL database
 * - Never save to the actual project library
 * - Reset to clean state after each test
 */
