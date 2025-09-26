import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { FilePlus, FolderOpen, Save, SaveAll, Video, Image as ImageIcon, Library, Trash2, ChevronDown } from 'lucide-react';
import { useProject } from '@/store/useProject';
import { ASPECT_RATIOS } from '@/types';
import { loadProjectFromFile } from '@/lib/persist';
import { exportVideo } from '@/lib/exportVideo';
import { exportCurrentPane } from '@/lib/exportImages';
import { generateThumbnail } from '@/lib/generateThumbnail';
import { useToast } from '@/hooks/use-toast';
import { useRef, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { Project } from '@shared/schema';

export default function TopBar() {
  const { 
    project, 
    createProject, 
    loadProject, 
    updateCanvas,
    isExporting,
    setExporting
  } = useProject();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Dialog states
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');

  // Current project info
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectTitle, setCurrentProjectTitle] = useState<string>('Untitled Project');

  // Load project by ID on mount if coming from Library
  useEffect(() => {
    const loadProjectId = localStorage.getItem('loadProjectId');
    if (loadProjectId) {
      localStorage.removeItem('loadProjectId'); // Clear the flag
      // Fetch and load the project
      fetchProjectById.mutate(loadProjectId);
    }
  }, []);

  // Update current project info when project changes
  useEffect(() => {
    if (project) {
      setCurrentProjectId(project.id || null);
      setCurrentProjectTitle(project.title || 'Untitled Project');
    }
  }, [project]);

  // Fetch project by ID mutation
  const fetchProjectById = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiRequest('GET', `/api/projects/${projectId}`);
      return response.json();
    },
    onSuccess: (projectData: Project) => {
      loadProject(projectData);
      setCurrentProjectId(projectData.id);
      setCurrentProjectTitle(projectData.title);
      toast({
        title: 'Project loaded',
        description: `Loaded "${projectData.title}" successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to load project',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Save project mutation
  const saveProjectMutation = useMutation({
    mutationFn: async ({ projectData, thumbnail }: { projectData: any; thumbnail?: string }) => {
      if (currentProjectId) {
        // Update existing project
        const response = await apiRequest('PUT', `/api/projects/${currentProjectId}`, {
          ...projectData,
          thumbnail,
          lastOpenedAt: new Date().toISOString()
        });
        return response.json();
      } else {
        // Create new project
        const response = await apiRequest('POST', '/api/projects', {
          ...projectData,
          thumbnail,
          lastOpenedAt: new Date().toISOString()
        });
        return response.json();
      }
    },
    onSuccess: (savedProject: Project) => {
      setCurrentProjectId(savedProject.id);
      setCurrentProjectTitle(savedProject.title);
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: 'Project saved',
        description: `"${savedProject.title}" has been saved successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save project',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Save As mutation
  const saveAsProjectMutation = useMutation({
    mutationFn: async ({ projectData, title, thumbnail }: { projectData: any; title: string; thumbnail?: string }) => {
      // Strip server-managed fields before POST
      const { id, createdAt, updatedAt, lastOpenedAt, ...cleanProjectData } = projectData;
      
      const response = await apiRequest('POST', '/api/projects', {
        ...cleanProjectData,
        title,
        thumbnail,
        lastOpenedAt: new Date().toISOString()
      });
      return response.json();
    },
    onSuccess: (savedProject: Project) => {
      setCurrentProjectId(savedProject.id);
      setCurrentProjectTitle(savedProject.title);
      // Update store title to match saved title
      if (project) {
        project.title = savedProject.title;
      }
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setSaveAsDialogOpen(false);
      setNewProjectTitle('');
      toast({
        title: 'Project saved as new copy',
        description: `"${savedProject.title}" has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save project',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await apiRequest('DELETE', `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      // Reset to new project after deletion
      handleNewProject();
      toast({
        title: 'Project deleted',
        description: 'The project has been permanently deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete project',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleNewProject = () => {
    createProject();
    setCurrentProjectId(null);
    setCurrentProjectTitle('Untitled Project');
    toast({
      title: "New project created",
      description: "Started with a fresh canvas and demo scenes.",
    });
  };

  const handleOpenLibrary = () => {
    setLocation('/library');
  };

  // Keep legacy file import functionality
  const handleImportFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileLoad = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const projectData = await loadProjectFromFile(file);
      loadProject(projectData);
      setCurrentProjectId(null); // This is an imported project, not saved to database yet
      setCurrentProjectTitle(projectData.title || 'Imported Project');
      toast({
        title: "Project loaded",
        description: `Loaded "${projectData.title || 'project'}" successfully.`,
      });
    } catch (error) {
      toast({
        title: "Failed to load project",
        description: "The file format is invalid or corrupted.",
        variant: "destructive",
      });
    }
  };

  const handleSaveProject = async () => {
    if (!project) return;
    
    try {
      // Generate thumbnail
      const thumbnail = await generateThumbnail(project);
      
      // Save to database
      await saveProjectMutation.mutateAsync({ 
        projectData: project,
        thumbnail 
      });
    } catch (error) {
      console.error('Failed to save project:', error);
      // Fallback to local save
      toast({
        title: "Project saved locally",
        description: "Saved to browser storage as backup.",
      });
    }
  };

  const handleSaveAs = async (title: string) => {
    if (!project) return;
    
    try {
      // Generate thumbnail
      const thumbnail = await generateThumbnail(project);
      
      // Save as new project
      await saveAsProjectMutation.mutateAsync({ 
        projectData: project,
        title,
        thumbnail 
      });
    } catch (error) {
      console.error('Failed to save project as:', error);
    }
  };

  const handleDeleteProject = () => {
    if (!currentProjectId) {
      toast({
        title: "No project to delete",
        description: "This project hasn't been saved yet.",
        variant: "destructive",
      });
      return;
    }
    
    setDeleteDialogOpen(true);
  };

  const confirmDeleteProject = () => {
    if (currentProjectId) {
      deleteProjectMutation.mutate(currentProjectId);
      setDeleteDialogOpen(false);
    }
  };

  const handleSaveAsDialog = () => {
    if (!project) return;
    setNewProjectTitle(currentProjectTitle);
    setSaveAsDialogOpen(true);
  };

  const confirmSaveAs = () => {
    if (newProjectTitle.trim()) {
      handleSaveAs(newProjectTitle.trim());
    }
  };

  // Auto-save before export with fresh thumbnail
  const autoSaveBeforeExport = async () => {
    if (!project) return;

    try {
      // Generate fresh thumbnail
      const thumbnail = await generateThumbnail(project);
      
      if (currentProjectId) {
        // Try to update existing project first
        try {
          await new Promise((resolve, reject) => {
            saveProjectMutation.mutate({ 
              projectData: project, 
              thumbnail 
            }, {
              onSuccess: resolve,
              onError: reject
            });
          });
        } catch (updateError: any) {
          // If update fails (e.g., 404 project not found), create new project instead
          console.warn('Failed to update existing project, creating new one:', updateError);
          const title = currentProjectTitle || 'Untitled Project';
          await new Promise((resolve, reject) => {
            saveAsProjectMutation.mutate({ 
              projectData: project, 
              title, 
              thumbnail 
            }, {
              onSuccess: (savedProject) => {
                // Update the current project ID to the newly created project
                setCurrentProjectId(savedProject.id);
                setCurrentProjectTitle(savedProject.title);
                resolve(savedProject);
              },
              onError: reject
            });
          });
        }
      } else {
        // Create new project with default title
        const title = currentProjectTitle || 'Untitled Project';
        await new Promise((resolve, reject) => {
          saveAsProjectMutation.mutate({ 
            projectData: project, 
            title, 
            thumbnail 
          }, {
            onSuccess: (savedProject) => {
              // Update the current project ID to the newly created project
              setCurrentProjectId(savedProject.id);
              setCurrentProjectTitle(savedProject.title);
              resolve(savedProject);
            },
            onError: reject
          });
        });
      }
    } catch (error) {
      // If auto-save fails, continue with export anyway
      console.warn('Auto-save before export failed, continuing with export:', error);
    }
  };

  const handleExportVideo = async () => {
    if (!project || isExporting) return;

    try {
      setExporting(true);
      
      // Auto-save project with fresh thumbnail before exporting
      await autoSaveBeforeExport();
      
      await exportVideo(project);
      toast({
        title: "Video exported and saved",
        description: "WebM video file has been downloaded and project has been saved.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Unable to export video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPNG = async () => {
    if (!project || !project.activePaneId) return;

    try {
      // Auto-save project with fresh thumbnail before exporting
      await autoSaveBeforeExport();
      
      await exportCurrentPane(project, project.activePaneId);
      toast({
        title: "PNG exported and saved",
        description: "Image file has been downloaded and project has been saved.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Unable to export PNG. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAspectRatioChange = (value: string) => {
    const ratio = ASPECT_RATIOS.find(r => r.value === value);
    if (ratio) {
      updateCanvas({
        width: ratio.width,
        height: ratio.height,
      });
    }
  };

  const currentAspectRatio = ASPECT_RATIOS.find(r => 
    r.width === project?.canvas.width && r.height === project?.canvas.height
  )?.value || '1:1';

  return (
    <header className="border-b border-border bg-card px-4 py-3" data-testid="top-bar">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">LinkedIn Video Editor</h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleNewProject}
              data-testid="button-new-project"
            >
              <FilePlus className="w-4 h-4 mr-2" />
              New
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleOpenLibrary}
              data-testid="button-open-library"
            >
              <Library className="w-4 h-4 mr-2" />
              Library
            </Button>

            {/* Save dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  disabled={saveProjectMutation.isPending || saveAsProjectMutation.isPending}
                  data-testid="button-save-dropdown"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem 
                  onClick={handleSaveProject}
                  disabled={saveProjectMutation.isPending}
                  data-testid="button-save"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveProjectMutation.isPending ? 'Saving...' : 'Save'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleSaveAsDialog}
                  disabled={saveAsProjectMutation.isPending}
                  data-testid="button-save-as"
                >
                  <SaveAll className="w-4 h-4 mr-2" />
                  Save As...
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleImportFile}
                  data-testid="button-import-file"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Import File
                </DropdownMenuItem>
                {currentProjectId && (
                  <DropdownMenuItem 
                    onClick={handleDeleteProject}
                    disabled={deleteProjectMutation.isPending}
                    className="text-destructive"
                    data-testid="button-delete-current"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleteProjectMutation.isPending ? 'Deleting...' : 'Delete Project'}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Aspect:</label>
            <Select value={currentAspectRatio} onValueChange={handleAspectRatioChange}>
              <SelectTrigger className="w-32" data-testid="select-aspect-ratio">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_RATIOS.map(ratio => (
                  <SelectItem key={ratio.value} value={ratio.value}>
                    {ratio.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <Button 
            onClick={handleExportVideo} 
            disabled={isExporting}
            data-testid="button-export-video"
          >
            <Video className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Video'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportPNG}
            data-testid="button-export-png"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Export PNG
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileLoad}
        className="hidden"
      />

      {/* Save As Dialog */}
      <Dialog open={saveAsDialogOpen} onOpenChange={setSaveAsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Project As</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              placeholder="Enter project title"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  confirmSaveAs();
                } else if (e.key === 'Escape') {
                  setSaveAsDialogOpen(false);
                }
              }}
              autoFocus
              data-testid="input-save-as-title"
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setSaveAsDialogOpen(false)}
                data-testid="button-cancel-save-as"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmSaveAs}
                disabled={!newProjectTitle.trim() || saveAsProjectMutation.isPending}
                data-testid="button-confirm-save-as"
              >
                {saveAsProjectMutation.isPending ? 'Saving...' : 'Save As'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{currentProjectTitle}"? This action cannot be undone and all project data will be permanently lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-current">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteProject} 
              disabled={deleteProjectMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-current"
            >
              {deleteProjectMutation.isPending ? 'Deleting...' : 'Delete Project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
