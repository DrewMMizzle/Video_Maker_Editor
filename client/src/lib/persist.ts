import type { Project } from '@shared/schema';
import { projectSchema } from '@shared/schema';

const STORAGE_KEY = 'linkedin-video-editor-projects';
const AUTO_SAVE_KEY = 'linkedin-video-editor-autosave';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

// Local storage operations
export function saveProjectToStorage(project: Project): void {
  try {
    const existingProjects = getProjectsFromStorage();
    const projectIndex = existingProjects.findIndex(p => p.id === project.id);
    
    if (projectIndex >= 0) {
      existingProjects[projectIndex] = { ...project, updatedAt: new Date().toISOString() };
    } else {
      existingProjects.push(project);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingProjects));
    
    // Also save as latest auto-save
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(project));
  } catch (error) {
    console.error('Failed to save project to storage:', error);
    throw new Error('Unable to save project locally');
  }
}

export function getProjectsFromStorage(): Project[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const projects = JSON.parse(stored);
    
    // Validate each project
    return projects.filter((project: any) => {
      try {
        projectSchema.parse(project);
        return true;
      } catch (error) {
        console.warn('Invalid project found in storage, skipping:', project.id);
        return false;
      }
    });
  } catch (error) {
    console.error('Failed to load projects from storage:', error);
    return [];
  }
}

export function getProjectFromStorage(id: string): Project | null {
  const projects = getProjectsFromStorage();
  return projects.find(p => p.id === id) || null;
}

export function deleteProjectFromStorage(id: string): boolean {
  try {
    const projects = getProjectsFromStorage();
    const filteredProjects = projects.filter(p => p.id !== id);
    
    if (filteredProjects.length === projects.length) {
      return false; // Project not found
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredProjects));
    return true;
  } catch (error) {
    console.error('Failed to delete project from storage:', error);
    return false;
  }
}

export function getAutoSavedProject(): Project | null {
  try {
    const stored = localStorage.getItem(AUTO_SAVE_KEY);
    if (!stored) return null;
    
    const project = JSON.parse(stored);
    projectSchema.parse(project); // Validate
    return project;
  } catch (error) {
    console.warn('Invalid auto-saved project, clearing:', error);
    localStorage.removeItem(AUTO_SAVE_KEY);
    return null;
  }
}

// File operations
export function downloadProject(project: Project): void {
  try {
    // Validate project before export
    projectSchema.parse(project);
    
    const projectData = {
      ...project,
      exportedAt: new Date().toISOString(),
      version: 'v1' as const,
    };
    
    const jsonString = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.id || 'linkedin-video-project'}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download project:', error);
    throw new Error('Unable to export project file');
  }
}

export function loadProjectFromFile(file: File): Promise<Project> {
  return new Promise((resolve, reject) => {
    if (!file.type.includes('json')) {
      reject(new Error('Invalid file type. Please select a JSON file.'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const projectData = JSON.parse(content);
        
        // Validate project structure
        const validatedProject = projectSchema.parse(projectData);
        
        resolve(validatedProject);
      } catch (error) {
        console.error('Failed to parse project file:', error);
        reject(new Error('Invalid project file format'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

// Auto-save functionality
let autoSaveInterval: NodeJS.Timeout | null = null;

export function startAutoSave(getCurrentProject: () => Project | null): void {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
  }
  
  autoSaveInterval = setInterval(() => {
    const project = getCurrentProject();
    if (project) {
      try {
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(project));
      } catch (error) {
        console.warn('Auto-save failed:', error);
      }
    }
  }, AUTO_SAVE_INTERVAL);
}

export function stopAutoSave(): void {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
}

// Project templates and examples
export function getProjectTemplates(): Partial<Project>[] {
  return [
    {
      id: 'template-welcome',
      version: 'v1' as const,
      canvas: { width: 1080, height: 1080, background: '#ffffff' },
      brand: {
        palette: ['#1f2937', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
        fonts: ['Inter', 'Roboto'],
        headings: 'Inter',
        body: 'Inter',
      },
      panes: [
        {
          id: 'welcome-scene',
          name: 'Welcome Scene',
          durationSec: 3,
          bgColor: '#3b82f6',
          elements: [
            {
              id: 'welcome-title',
              type: 'text' as const,
              text: 'Welcome to\nOur Platform',
              x: 540,
              y: 540,
              rotation: 0,
              z: 1,
              opacity: 1,
              fontFamily: 'Inter',
              fontSize: 48,
              fontWeight: 700,
              lineHeight: 1.2,
              color: '#ffffff',
              align: 'center' as const,
              padding: 32,
            }
          ],
        }
      ],
    }
  ];
}

// Export data for external tools
export function exportProjectData(project: Project, format: 'csv' | 'txt' = 'txt'): string {
  if (format === 'csv') {
    const lines = ['Scene,Element Type,Content,Position X,Position Y,Font Size,Color'];
    
    project.panes.forEach(pane => {
      pane.elements.forEach(element => {
        const content = element.type === 'text' ? 
          element.text.replace(/\n/g, ' ') : 
          element.type === 'icon' ? element.name : 'Image';
        
        const fontSize = element.type === 'text' ? element.fontSize : '';
        const color = 'color' in element ? element.color : '';
        
        lines.push(`${pane.name},"${element.type}","${content}",${element.x},${element.y},${fontSize},"${color}"`);
      });
    });
    
    return lines.join('\n');
  }
  
  // Text format
  let output = `LinkedIn Video Project Export\n`;
  output += `Project ID: ${project.id}\n`;
  output += `Canvas: ${project.canvas.width}x${project.canvas.height}\n`;
  output += `Scenes: ${project.panes.length}\n\n`;
  
  project.panes.forEach((pane, index) => {
    output += `Scene ${index + 1}: ${pane.name}\n`;
    output += `Duration: ${pane.durationSec}s\n`;
    output += `Background: ${pane.bgColor}\n`;
    output += `Elements: ${pane.elements.length}\n\n`;
    
    pane.elements.forEach((element, elemIndex) => {
      output += `  Element ${elemIndex + 1} (${element.type}):\n`;
      output += `    Position: (${element.x}, ${element.y})\n`;
      output += `    Opacity: ${Math.round(element.opacity * 100)}%\n`;
      
      if (element.type === 'text') {
        output += `    Text: "${element.text}"\n`;
        output += `    Font: ${element.fontFamily} ${element.fontSize}px\n`;
        output += `    Color: ${element.color}\n`;
      } else if (element.type === 'icon') {
        output += `    Icon: ${element.name}\n`;
        output += `    Size: ${element.size}px\n`;
        output += `    Color: ${element.color}\n`;
      } else if (element.type === 'image') {
        output += `    Size: ${element.width}x${element.height}\n`;
      }
      output += '\n';
    });
  });
  
  return output;
}

// Clear all stored data (for reset/cleanup)
export function clearAllStoredData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(AUTO_SAVE_KEY);
  } catch (error) {
    console.error('Failed to clear stored data:', error);
  }
}

// Get storage usage info
export function getStorageUsage(): { used: number; total: number; percentage: number } | null {
  try {
    if (!('estimate' in navigator.storage)) {
      return null;
    }
    
    // This is async, but we'll return null for now and implement properly if needed
    return null;
  } catch (error) {
    return null;
  }
}
