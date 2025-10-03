# LinkedIn Video Post Editor

## Overview

This is a browser-first drag-and-drop video editor designed specifically for creating short LinkedIn video posts (15-45 seconds). The application allows users to create square videos using text, images, and icons with an interface that's designed to be simpler than Canva. The editor supports multiple scenes (panes), drag/resize/rotate functionality, and includes brand import capabilities from external URLs.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: shadcn/ui component library with Tailwind CSS for styling
- **Canvas Rendering**: react-konva (Konva.js wrapper) for the main canvas with Stage/Layer/Transformer architecture
- **State Management**: Zustand with persistence middleware for client-side state
- **Routing**: wouter for lightweight client-side routing
- **Drag & Drop**: @dnd-kit/core for reordering panes and layers
- **Icons**: Lucide React for UI icons and selectable canvas elements
- **Fonts**: Google Fonts integration with on-the-fly loading

### Backend Architecture
- **Server**: Express.js with TypeScript
- **Development Setup**: Vite middleware integration for hot module replacement
- **Storage**: PostgreSQL database with Drizzle ORM for user-scoped data persistence
- **Authentication**: Replit Auth with support for Google, GitHub, and email login
- **Session Management**: PostgreSQL session store with connect-pg-simple
- **Brand Scraping**: Playwright with Chromium for extracting brand colors and fonts from URLs
- **API Structure**: RESTful endpoints for project CRUD and brand import functionality

### Canvas System
- **Rendering Engine**: Konva.js for high-performance 2D canvas rendering
- **Element Types**: Text, Image, and Icon elements with common properties (position, rotation, opacity, z-index)
- **Transform Controls**: Interactive resize, rotate, and drag handles via Konva Transformer
- **Export System**: Canvas-to-video using MediaRecorder API and HTMLCanvasElement.captureStream()
- **Aspect Ratios**: Configurable canvas dimensions with safe area overlay
- **Animated GIF Support**: Hybrid rendering approach with HTML overlays for preview and frame compositing for export

### Pane Management
- **Scene System**: Multiple panes (scenes) with individual durations and background colors
- **Timeline**: Left sidebar with thumbnail previews and duration controls
- **Reordering**: Drag-and-drop reordering of panes using @dnd-kit
- **Thumbnail Generation**: Automatic canvas-to-image conversion for pane previews

### Element System
- **Text Elements**: Font family, size, weight, color, alignment, and optional background
- **Image Elements**: File upload with resize and corner radius support
- **Icon Elements**: Lucide icon library with size and color customization
- **Layer Management**: Z-index controls and element reordering

### Brand Import System
- **Web Scraping**: Playwright-based extraction of theme colors, CSS variables, and font information
- **Color Extraction**: Automatic parsing of hex, RGB, and HSL color values from CSS
- **Font Detection**: Google Fonts and system font identification
- **Fallback Strategy**: HTML fetch with limited parsing when Playwright is unavailable

### Authentication System
- **Auth Provider**: Replit Auth with OAuth support (Google, GitHub) and email authentication
- **Middleware**: `server/replitAuth.ts` handles authentication setup and session management
- **Route Protection**: `isAuthenticated` middleware on all `/api/*` endpoints
- **User Model**: PostgreSQL `users` table stores id, email, firstName, lastName, profileImageUrl
- **Session Storage**: PostgreSQL-backed sessions using `connect-pg-simple`
- **Data Isolation**: All projects and assets filtered by `userId` at the storage layer
- **Frontend Auth**: 
  - Landing page for logged-out users at `/` with login button
  - `useAuth` hook provides user state and authentication status
  - TopBar displays user info with dropdown menu and logout button
  - Automatic redirect to landing page when unauthenticated

## External Dependencies

- **Database**: Drizzle ORM configured for PostgreSQL with user-scoped data model
- **Cloud Database**: Neon Database integration for production persistence
- **Authentication**: Replit Auth for secure multi-user login
- **Web Scraping**: Playwright with Chromium for brand import functionality
- **Font Services**: Google Fonts API for dynamic font loading
- **Build Tools**: Vite for frontend bundling and development server
- **Deployment**: Replit-optimized with cartographer and dev banner plugins
- **Video Export**: Browser-native MediaRecorder API for WebM video generation
- **File Handling**: Browser File API for image uploads and project import/export

## Testing Infrastructure

### Mock Storage System
- **Test Framework**: Playwright for end-to-end browser testing
- **API Mocking**: Route interception using Playwright's `page.route()` to prevent test data from polluting the real library
- **Storage Isolation**: All test operations use in-memory mock storage (Map-based) instead of PostgreSQL
- **Mock Endpoints**: Complete mocking of `/api/projects`, `/api/assets`, and `/api/brand/scrape` endpoints
- **Test Utilities**: `MockApiHelper` class in `tests/utils/mockApi.ts` handles all API interception and mock data management

### Test Organization
- **Test Directory**: `tests/` contains all Playwright test files
- **Configuration**: `playwright.config.ts` with Chromium browser setup and auto-start dev server
- **Example Tests**: `tests/example.spec.ts` demonstrates mock storage usage patterns
- **Documentation**: `tests/README.md` provides comprehensive guide for writing new tests

### Key Testing Features
1. **Automatic Setup**: `mockApi.setupMocks()` intercepts all API calls before tests run
2. **Pre-population**: `mockApi.addMockProject()` and `mockApi.addMockAsset()` for seeding test data
3. **Verification**: `mockApi.getMockProjects()` and `mockApi.getMockAssets()` for assertions
4. **Cleanup**: `mockApi.clearMocks()` resets state between tests
5. **Isolated Execution**: Tests never touch the real database or project library

### Benefits
- ✅ **No Library Pollution**: Test projects stay in mock storage, real library remains clean
- ✅ **Faster Tests**: No database roundtrips, all operations are in-memory
- ✅ **Reliable Tests**: Same mock data every run, no flaky tests from external dependencies
- ✅ **Safe Testing**: Can't accidentally corrupt production data or user projects

### Authentication Testing
- **Automated Tests**: `tests/auth.spec.ts` verifies landing page display and login button presence
- **Manual Testing Required**: Replit Auth requires real OAuth flows that cannot be fully automated
- **Manual Test Steps**:
  1. Navigate to app while logged out - should see landing page
  2. Click "Sign In to Get Started" button
  3. Complete Replit Auth flow (Google/GitHub/Email)
  4. Should redirect to editor with full functionality
  5. Verify TopBar shows user name/email in dropdown menu
  6. Verify Library page shows only your projects
  7. Create/edit/delete projects - verify all changes are user-scoped
  8. Click logout - should return to landing page
  9. Log in as different user - verify separate workspace with no access to other user's projects

### Animated GIF Testing
- **Manual Testing Required**: GIF upload and animation cannot be fully automated
- **Manual Test Steps**:
  1. Log in to the editor
  2. Click "Image" button in the toolbar
  3. Click "Upload New" from the dropdown
  4. Upload an animated GIF file
  5. Verify the GIF appears on the canvas with animation playing
  6. Drag, resize, and rotate the GIF - verify the animation follows the element
  7. Adjust opacity - verify transparency applies correctly
  8. Create multiple scenes with GIFs - verify each scene maintains its GIF state
  9. Export to PNG - verify static frame is captured
  10. Export to video - verify GIF animation is included in the final video
  11. Test with multiple GIFs in one scene - verify all animations work correctly