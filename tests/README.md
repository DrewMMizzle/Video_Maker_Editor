# Test Suite with Mock Storage

This directory contains Playwright tests that use **mock storage** to prevent test data from polluting the real project library.

## How Mock Storage Works

All tests intercept API calls using Playwright's route mocking:
- ✅ Projects saved during tests go to **in-memory mock storage**
- ✅ Tests never touch the **real PostgreSQL database**
- ✅ Mock data is **cleared after each test**
- ✅ Your actual library remains **completely unaffected**

## Running Tests

```bash
# Run all tests
npx playwright test

# Run tests in UI mode (interactive)
npx playwright test --ui

# Run a specific test file
npx playwright test tests/example.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Generate test report
npx playwright show-report
```

## Test Structure

```
tests/
├── utils/
│   └── mockApi.ts          # API mocking utilities
├── example.spec.ts         # Example tests with mock storage
└── README.md              # This file
```

## Writing New Tests

```typescript
import { test, expect } from '@playwright/test';
import { MockApiHelper } from './utils/mockApi';

test.describe('Your Test Suite', () => {
  let mockApi: MockApiHelper;

  test.beforeEach(async ({ page }) => {
    // Setup mock API before each test
    mockApi = new MockApiHelper(page);
    await mockApi.setupMocks();
    await page.goto('/');
  });

  test.afterEach(async () => {
    // Clear mock data after each test
    mockApi.clearMocks();
  });

  test('your test case', async ({ page }) => {
    // Your test code here
    // All API calls will be mocked automatically
  });
});
```

## Key Features

### 1. **Automatic API Mocking**
```typescript
await mockApi.setupMocks();
```
This single line mocks all API endpoints:
- `/api/projects` (GET, POST, PUT, DELETE)
- `/api/assets` (GET, POST, DELETE)
- `/api/assets/upload` (POST) - Returns mock upload URL
- `/api/brand/scrape` (GET)
- **Catch-all blocker** - Any unmocked API call fails fast with error

### 2. **Pre-populate Mock Data**
```typescript
mockApi.addMockProject({
  id: 'test-123',
  title: 'Test Project',
  // ... other fields
});
```

### 3. **Verify Mock Data**
```typescript
const projects = mockApi.getMockProjects();
expect(projects.length).toBe(1);
```

### 4. **Clean State Between Tests**
```typescript
mockApi.clearMocks(); // Resets all mock data
```

## Benefits

1. **Isolation** - Tests don't interfere with each other or real data
2. **Speed** - No database roundtrips, tests run faster
3. **Safety** - Can't accidentally corrupt your project library
4. **Reliability** - Same mock data every time, no flaky tests
5. **Clean Library** - Your library stays clean, no test projects

## What Gets Mocked

| Endpoint | Real Behavior | Mock Behavior |
|----------|--------------|---------------|
| `POST /api/projects` | Saves to PostgreSQL | Saves to in-memory Map |
| `GET /api/projects` | Queries database | Returns mock projects |
| `PUT /api/projects/:id` | Updates database | Updates mock Map |
| `DELETE /api/projects/:id` | Deletes from DB | Deletes from mock Map |
| `POST /api/assets` | Saves to DB + Object Storage | Saves to mock Map |
| `GET /api/brand/scrape` | Scrapes real website | Returns mock brand data |

## Troubleshooting

### Tests still saving to library?
Make sure you call `await mockApi.setupMocks()` in `beforeEach`

### Mock data persisting between tests?
Call `mockApi.clearMocks()` in `afterEach`

### Need to see what's in mock storage?
```typescript
console.log('Mock projects:', mockApi.getMockProjects());
console.log('Mock assets:', mockApi.getMockAssets());
```
