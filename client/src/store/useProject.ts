import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Project, Pane, Element, Brand } from '@shared/schema';
import type { Element as KonvaElement } from '../types';
import { TEMPLATES } from '../types';
import { generatePaneThumbnail } from '../lib/generateThumbnail';

interface ProjectState {
  project: Project | null;
  selectedElementId: string | null;
  showGrid: boolean;
  isExporting: boolean;
  activeTemplates: Record<string, { templateId: string; originalElements: KonvaElement[] }>;
  
  // UI state
  activePropertiesTab: string;
  
  // Zoom state
  zoomLevel: number;
  isManualZoom: boolean;
  
  // Video playback state
  isPlaying: boolean;
  currentTime: number;
  playbackStartTime: number | null;
  
  // Actions
  createProject: () => void;
  loadProject: (project: Project) => void;
  updateProject: (updates: Partial<Project>) => void;
  
  // Pane management
  addPane: () => void;
  duplicatePane: (paneId: string) => void;
  deletePane: (paneId: string) => void;
  updatePane: (paneId: string, updates: Partial<Pane>) => void;
  setActivePane: (paneId: string) => void;
  reorderPanes: (paneIds: string[]) => void;
  
  // Element management
  addElement: (element: KonvaElement) => void;
  updateElement: (elementId: string, updates: Partial<KonvaElement>) => void;
  deleteElement: (elementId: string) => void;
  duplicateElement: (elementId: string) => void;
  setSelectedElement: (elementId: string | null) => void;
  reorderElements: (elementIds: string[]) => void;
  
  // Canvas
  updateCanvas: (updates: { width?: number; height?: number; background?: string }) => void;
  setShowGrid: (show: boolean) => void;
  
  // UI controls
  setActivePropertiesTab: (tab: string) => void;
  
  // Zoom controls
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToScreen: () => void;
  
  // Video playback controls
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (time: number) => void;
  updateCurrentTime: (time: number) => void;
  getTotalDuration: () => number;
  getCurrentPaneByTime: (time: number) => { pane: Pane; paneIndex: number } | null;
  getPlaybackProgress: () => number;
  
  // Brand
  updateBrand: (brand: Partial<Brand>) => void;
  
  // Export
  setExporting: (isExporting: boolean) => void;
  exportVideoWithStage: (() => Promise<void>) | null;
  setExportVideoFunction: (exportFn: (() => Promise<void>) | null) => void;
  
  // Templates
  toggleTemplate: (templateId: string) => void;
  isTemplateActive: (templateId: string) => boolean;
  
  // Thumbnails
  updatePaneThumbnail: (paneId: string) => Promise<void>;
}

const createDefaultProject = (): Project => ({
  id: nanoid(),
  version: 'v1',
  title: 'Untitled Project',
  canvas: {
    width: 1080,
    height: 1080,
    background: '#ffffff',
  },
  brand: {
    palette: ['#1f2937', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
    fonts: ['Inter', 'Roboto'],
    headings: 'Inter',
    body: 'Inter',
  },
  panes: [
    {
      id: nanoid(),
      name: 'Scene 1',
      durationSec: 3,
      bgColor: '#ffffff',
      elements: [
        {
          id: nanoid(),
          type: 'text',
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
          color: '#000000',
          align: 'center',
          padding: 32,
        }
      ],
    },
    {
      id: nanoid(),
      name: 'Scene 2',
      durationSec: 4,
      bgColor: '#ffffff',
      elements: [
        {
          id: nanoid(),
          type: 'text',
          text: '✓ Feature 1\n✓ Feature 2\n✓ Feature 3',
          x: 540,
          y: 540,
          rotation: 0,
          z: 1,
          opacity: 1,
          fontFamily: 'Inter',
          fontSize: 32,
          fontWeight: 500,
          lineHeight: 1.5,
          color: '#000000',
          align: 'center',
          padding: 24,
        }
      ],
    }
  ],
  activePaneId: undefined,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const useProject = create<ProjectState>()(
  persist(
    (set, get) => ({
      project: null,
      selectedElementId: null,
      showGrid: false,
      isExporting: false,
      exportVideoWithStage: null,
      activeTemplates: {},
      
      // Default UI state
      activePropertiesTab: 'properties',
      
      // Default zoom state
      zoomLevel: 1.0, // 100%
      isManualZoom: false,
      
      // Default playback state
      isPlaying: false,
      currentTime: 0,
      playbackStartTime: null,

      createProject: () => {
        const project = createDefaultProject();
        set({ 
          project: { ...project, activePaneId: project.panes[0]?.id },
          selectedElementId: null 
        });
      },

      loadProject: (project: Project) => {
        set({ project, selectedElementId: null });
      },

      updateProject: (updates: Partial<Project>) => {
        set((state) => ({
          project: state.project ? {
            ...state.project,
            ...updates,
            updatedAt: new Date().toISOString(),
          } : null,
        }));
      },

      addPane: () => {
        const state = get();
        const panes = state.project?.panes || [];
        const previousPane = panes[panes.length - 1];
        
        // Inherit settings from the previous scene, or use defaults if it's the first scene
        const newPane: Pane = {
          id: nanoid(),
          name: `Scene ${panes.length + 1}`,
          durationSec: previousPane?.durationSec ?? 3,
          bgColor: previousPane?.bgColor ?? '#ffffff',
          elements: [],
        };
        
        set((state) => ({
          project: state.project ? {
            ...state.project,
            panes: [...state.project.panes, newPane],
            activePaneId: newPane.id,
            updatedAt: new Date().toISOString(),
          } : null,
        }));
      },

      duplicatePane: (paneId: string) => {
        const state = get();
        if (!state.project) return;

        const pane = state.project.panes.find(p => p.id === paneId);
        if (!pane) return;

        // Deep copy elements to prevent any shared references
        const duplicatedPane: Pane = {
          ...pane,
          id: nanoid(),
          name: `${pane.name} (Copy)`,
          elements: pane.elements.map(el => {
            // Create a deep copy and assign new ID
            const elementCopy = JSON.parse(JSON.stringify(el));
            elementCopy.id = nanoid();
            return elementCopy;
          }),
        };

        set({
          project: {
            ...state.project,
            panes: [...state.project.panes, duplicatedPane],
            activePaneId: duplicatedPane.id,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      deletePane: (paneId: string) => {
        set((state) => {
          if (!state.project || state.project.panes.length <= 1) return state;

          const filteredPanes = state.project.panes.filter(p => p.id !== paneId);
          const wasActive = state.project.activePaneId === paneId;

          return {
            project: {
              ...state.project,
              panes: filteredPanes,
              activePaneId: wasActive ? filteredPanes[0]?.id : state.project.activePaneId,
              updatedAt: new Date().toISOString(),
            },
            selectedElementId: wasActive ? null : state.selectedElementId,
          };
        });
      },

      updatePane: (paneId: string, updates: Partial<Pane>) => {
        set((state) => {
          const newState = {
            project: state.project ? {
              ...state.project,
              panes: state.project.panes.map(p => 
                p.id === paneId ? { ...p, ...updates } : p
              ),
              updatedAt: new Date().toISOString(),
            } : null,
          };

          // Regenerate thumbnail for the updated pane if visual properties changed
          if (updates.bgColor) {
            setTimeout(() => {
              get().updatePaneThumbnail(paneId);
            }, 300);
          }

          return newState;
        });
      },

      setActivePane: (paneId: string) => {
        set((state) => ({
          project: state.project ? {
            ...state.project,
            activePaneId: paneId,
          } : null,
          selectedElementId: null,
        }));
      },

      reorderPanes: (paneIds: string[]) => {
        set((state) => {
          if (!state.project) return state;
          
          const reorderedPanes = paneIds.map(id => 
            state.project!.panes.find(p => p.id === id)!
          ).filter(Boolean);

          return {
            project: {
              ...state.project,
              panes: reorderedPanes,
              updatedAt: new Date().toISOString(),
            },
          };
        });
      },

      addElement: (element: KonvaElement) => {
        set((state) => {
          if (!state.project?.activePaneId) return state;

          const newState = {
            project: {
              ...state.project,
              panes: state.project.panes.map(pane => 
                pane.id === state.project!.activePaneId
                  ? { ...pane, elements: [...pane.elements, element] }
                  : pane
              ),
              updatedAt: new Date().toISOString(),
            },
            selectedElementId: element.id,
          };

          // Regenerate thumbnail for the active pane after adding element
          setTimeout(() => {
            get().updatePaneThumbnail(state.project!.activePaneId!);
          }, 300);

          return newState;
        });
      },

      updateElement: (elementId: string, updates: Partial<KonvaElement>) => {
        set((state) => {
          const newState = {
            project: state.project ? {
              ...state.project,
              panes: state.project.panes.map(pane => ({
                ...pane,
                elements: pane.elements.map(el => 
                  el.id === elementId ? { ...el, ...updates } as Element : el
                ),
              })),
              updatedAt: new Date().toISOString(),
            } : null,
          };

          // Regenerate thumbnail for the pane that contains the updated element
          if (state.project?.activePaneId) {
            setTimeout(() => {
              get().updatePaneThumbnail(state.project!.activePaneId!);
            }, 300);
          }

          return newState;
        });
      },

      deleteElement: (elementId: string) => {
        set((state) => {
          const newState = {
            project: state.project ? {
              ...state.project,
              panes: state.project.panes.map(pane => ({
                ...pane,
                elements: pane.elements.filter(el => el.id !== elementId),
              })),
              updatedAt: new Date().toISOString(),
            } : null,
            selectedElementId: state.selectedElementId === elementId ? null : state.selectedElementId,
          };

          // Regenerate thumbnail for the active pane after deleting element
          if (state.project?.activePaneId) {
            setTimeout(() => {
              get().updatePaneThumbnail(state.project!.activePaneId!);
            }, 300);
          }

          return newState;
        });
      },

      duplicateElement: (elementId: string) => {
        set((state) => {
          if (!state.project?.activePaneId) return state;

          const activePane = state.project.panes.find(p => p.id === state.project!.activePaneId);
          const element = activePane?.elements.find(el => el.id === elementId);
          
          if (!element) return state;

          const duplicatedElement = {
            ...element,
            id: nanoid(),
            x: element.x + 20,
            y: element.y + 20,
          };

          const newState = {
            project: {
              ...state.project,
              panes: state.project.panes.map(pane => 
                pane.id === state.project!.activePaneId
                  ? { ...pane, elements: [...pane.elements, duplicatedElement] }
                  : pane
              ),
              updatedAt: new Date().toISOString(),
            },
            selectedElementId: duplicatedElement.id,
          };

          // Regenerate thumbnail for the active pane after duplicating element
          setTimeout(() => {
            get().updatePaneThumbnail(state.project!.activePaneId!);
          }, 300);

          return newState;
        });
      },

      setSelectedElement: (elementId: string | null) => {
        set({ selectedElementId: elementId });
      },

      reorderElements: (elementIds: string[]) => {
        set((state) => {
          if (!state.project?.activePaneId) return state;

          const activePane = state.project.panes.find(p => p.id === state.project!.activePaneId);
          if (!activePane) return state;

          const reorderedElements = elementIds.map(id => 
            activePane.elements.find(el => el.id === id)!
          ).filter(Boolean);

          const newState = {
            project: {
              ...state.project,
              panes: state.project.panes.map(pane => 
                pane.id === state.project!.activePaneId
                  ? { ...pane, elements: reorderedElements }
                  : pane
              ),
              updatedAt: new Date().toISOString(),
            },
          };

          // Regenerate thumbnail for the active pane after reordering elements
          setTimeout(() => {
            get().updatePaneThumbnail(state.project!.activePaneId!);
          }, 300);

          return newState;
        });
      },

      updateCanvas: (updates) => {
        set((state) => {
          const newState = {
            project: state.project ? {
              ...state.project,
              canvas: { ...state.project.canvas, ...updates },
              updatedAt: new Date().toISOString(),
            } : null,
          };

          // Regenerate all pane thumbnails after canvas changes
          if (state.project && (updates.width || updates.height || updates.background)) {
            setTimeout(() => {
              state.project!.panes.forEach(pane => {
                if (pane.thumbnail) {
                  get().updatePaneThumbnail(pane.id);
                }
              });
            }, 300);
          }

          return newState;
        });
      },

      setShowGrid: (show: boolean) => {
        set({ showGrid: show });
      },

      // UI controls
      setActivePropertiesTab: (tab: string) => {
        set({ activePropertiesTab: tab });
      },

      // Zoom controls
      setZoom: (zoom: number) => {
        const clampedZoom = Math.min(Math.max(zoom, 0.1), 4.0); // Clamp between 10% and 400%
        set({ zoomLevel: clampedZoom, isManualZoom: true });
      },

      zoomIn: () => {
        const state = get();
        const currentZoom = state.zoomLevel;
        const newZoom = currentZoom < 1 ? currentZoom + 0.1 : currentZoom + 0.25;
        const clampedZoom = Math.min(newZoom, 4.0);
        set({ zoomLevel: clampedZoom, isManualZoom: true });
      },

      zoomOut: () => {
        const state = get();
        const currentZoom = state.zoomLevel;
        const newZoom = currentZoom <= 1 ? currentZoom - 0.1 : currentZoom - 0.25;
        const clampedZoom = Math.max(newZoom, 0.1);
        set({ zoomLevel: clampedZoom, isManualZoom: true });
      },

      fitToScreen: () => {
        set({ isManualZoom: false });
      },

      // Video playback controls implementation
      playVideo: () => {
        set({ 
          isPlaying: true, 
          playbackStartTime: Date.now() - (get().currentTime * 1000)
        });
      },

      pauseVideo: () => {
        set({ isPlaying: false, playbackStartTime: null });
      },

      stopVideo: () => {
        set({ 
          isPlaying: false, 
          currentTime: 0, 
          playbackStartTime: null 
        });
        // Reset to first pane when stopping
        const state = get();
        if (state.project?.panes.length) {
          get().setActivePane(state.project.panes[0].id);
        }
      },

      seekTo: (time: number) => {
        const totalDuration = get().getTotalDuration();
        const clampedTime = Math.max(0, Math.min(time, totalDuration));
        
        set((state) => ({
          currentTime: clampedTime,
          playbackStartTime: state.isPlaying ? Date.now() - (clampedTime * 1000) : null
        }));

        // Update active pane based on seek time
        const paneData = get().getCurrentPaneByTime(clampedTime);
        if (paneData) {
          get().setActivePane(paneData.pane.id);
        }
      },

      updateCurrentTime: (time: number) => {
        const totalDuration = get().getTotalDuration();
        if (time >= totalDuration) {
          // Video finished, stop playback
          get().stopVideo();
          return;
        }
        
        set({ currentTime: time });
        
        // Update active pane based on current time
        const paneData = get().getCurrentPaneByTime(time);
        if (paneData) {
          const state = get();
          if (state.project?.activePaneId !== paneData.pane.id) {
            get().setActivePane(paneData.pane.id);
          }
        }
      },

      getTotalDuration: () => {
        const state = get();
        if (!state.project?.panes.length) return 0;
        return state.project.panes.reduce((total, pane) => total + pane.durationSec, 0);
      },

      getCurrentPaneByTime: (time: number) => {
        const state = get();
        if (!state.project?.panes.length) return null;
        
        let accumulatedTime = 0;
        for (let i = 0; i < state.project.panes.length; i++) {
          const pane = state.project.panes[i];
          if (time >= accumulatedTime && time < accumulatedTime + pane.durationSec) {
            return { pane, paneIndex: i };
          }
          accumulatedTime += pane.durationSec;
        }
        
        // If time is at the very end, return the last pane
        const lastPane = state.project.panes[state.project.panes.length - 1];
        return { pane: lastPane, paneIndex: state.project.panes.length - 1 };
      },

      getPlaybackProgress: () => {
        const state = get();
        const totalDuration = get().getTotalDuration();
        if (totalDuration === 0) return 0;
        return Math.min(state.currentTime / totalDuration, 1);
      },

      updateBrand: (brand: Partial<Brand>) => {
        set((state) => ({
          project: state.project ? {
            ...state.project,
            brand: { ...state.project.brand, ...brand },
            updatedAt: new Date().toISOString(),
          } : null,
        }));
      },

      setExporting: (isExporting: boolean) => {
        set({ isExporting });
      },

      setExportVideoFunction: (exportFn: (() => Promise<void>) | null) => {
        set({ exportVideoWithStage: exportFn });
      },

      toggleTemplate: (templateId: string) => {
        set((state) => {
          if (!state.project?.activePaneId) return state;

          const paneId = state.project.activePaneId;
          const isActive = state.activeTemplates[paneId]?.templateId === templateId;

          if (isActive) {
            // Revert to original elements
            const originalElements = state.activeTemplates[paneId].originalElements;
            const newTemplates = { ...state.activeTemplates };
            delete newTemplates[paneId];

            const newState = {
              ...state,
              project: {
                ...state.project,
                panes: state.project.panes.map(pane => 
                  pane.id === paneId
                    ? { ...pane, elements: originalElements as Element[] }
                    : pane
                ),
                updatedAt: new Date().toISOString(),
              },
              activeTemplates: newTemplates,
            };

            // Regenerate thumbnail after reverting template
            setTimeout(() => {
              get().updatePaneThumbnail(paneId);
            }, 300);

            return newState;
          } else {
            // Store original elements and apply template
            const currentPane = state.project.panes.find(p => p.id === paneId);
            if (!currentPane) return state;

            const template = TEMPLATES.find(t => t.id === templateId);
            if (!template) return state;

            const originalElements = [...currentPane.elements];
            const newElements = template.elements.map(el => ({
              ...el,
              id: nanoid(),
            })) as KonvaElement[];

            const newState = {
              ...state,
              project: {
                ...state.project,
                panes: state.project.panes.map(pane => 
                  pane.id === paneId
                    ? { ...pane, elements: [...originalElements, ...newElements] as Element[] }
                    : pane
                ),
                updatedAt: new Date().toISOString(),
              },
              activeTemplates: {
                ...state.activeTemplates,
                [paneId]: { templateId, originalElements },
              },
            };

            // Regenerate thumbnail after applying template
            setTimeout(() => {
              get().updatePaneThumbnail(paneId);
            }, 300);

            return newState;
          }
        });
      },

      isTemplateActive: (templateId: string) => {
        const state = get();
        if (!state.project?.activePaneId) return false;
        
        const paneId = state.project.activePaneId;
        return state.activeTemplates[paneId]?.templateId === templateId;
      },

      updatePaneThumbnail: async (paneId: string) => {
        const state = get();
        if (!state.project) return;

        const pane = state.project.panes.find(p => p.id === paneId);
        if (!pane) return;

        try {
          const thumbnail = await generatePaneThumbnail(
            pane,
            state.project.canvas.width,
            state.project.canvas.height
          );

          set((prevState) => ({
            project: prevState.project ? {
              ...prevState.project,
              panes: prevState.project.panes.map(p =>
                p.id === paneId ? { ...p, thumbnail } : p
              ),
              updatedAt: new Date().toISOString(),
            } : null,
          }));
        } catch (error) {
          console.warn('Failed to generate pane thumbnail:', error);
        }
      },
    }),
    {
      name: 'linkedin-video-editor',
      partialize: (state) => ({ 
        project: state.project,
        activeTemplates: state.activeTemplates
      }),
    }
  )
);
