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
- **Storage**: In-memory storage with interface for future database integration
- **Brand Scraping**: Playwright with Chromium for extracting brand colors and fonts from URLs
- **API Structure**: RESTful endpoints for project CRUD and brand import functionality

### Canvas System
- **Rendering Engine**: Konva.js for high-performance 2D canvas rendering
- **Element Types**: Text, Image, and Icon elements with common properties (position, rotation, opacity, z-index)
- **Transform Controls**: Interactive resize, rotate, and drag handles via Konva Transformer
- **Export System**: Canvas-to-video using MediaRecorder API and HTMLCanvasElement.captureStream()
- **Aspect Ratios**: Configurable canvas dimensions with safe area overlay

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

## External Dependencies

- **Database**: Drizzle ORM configured for PostgreSQL (currently using in-memory storage)
- **Cloud Database**: Neon Database integration for production persistence
- **Web Scraping**: Playwright with Chromium for brand import functionality
- **Font Services**: Google Fonts API for dynamic font loading
- **Build Tools**: Vite for frontend bundling and development server
- **Deployment**: Replit-optimized with cartographer and dev banner plugins
- **Video Export**: Browser-native MediaRecorder API for WebM video generation
- **File Handling**: Browser File API for image uploads and project import/export