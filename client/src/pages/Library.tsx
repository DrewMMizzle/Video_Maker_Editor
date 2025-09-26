import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Search, Grid3X3, List, MoreVertical, Trash2, Edit3, Calendar, Plus } from 'lucide-react';
import type { Project } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

type ViewMode = 'grid' | 'list';

export default function Library() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Fetch projects list
  const { 
    data: projects = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    select: (data) => {
      // Sort by lastOpenedAt (most recent first), then by updatedAt
      return [...data].sort((a, b) => {
        const aDate = new Date(a.lastOpenedAt || a.updatedAt);
        const bDate = new Date(b.lastOpenedAt || b.updatedAt);
        return bDate.getTime() - aDate.getTime();
      });
    }
  });

  // Filter projects based on search term
  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Rename project mutation
  const renameProjectMutation = useMutation({
    mutationFn: async ({ projectId, title }: { projectId: string; title: string }) => {
      const response = await apiRequest('PUT', `/api/projects/${projectId}`, { title });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: 'Project renamed',
        description: 'The project title has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error renaming project',
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
      toast({
        title: 'Project deleted',
        description: 'The project has been permanently deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting project',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update lastOpenedAt mutation
  const updateLastOpenedMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await apiRequest('PUT', `/api/projects/${projectId}`, { 
        lastOpenedAt: new Date().toISOString() 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
  });

  // Load project (navigate to editor)
  const handleLoadProject = (project: Project) => {
    // Update lastOpenedAt timestamp
    updateLastOpenedMutation.mutate(project.id);
    // Store the project ID for the editor to load
    localStorage.setItem('loadProjectId', project.id);
    setLocation('/');
  };

  // Create new project
  const handleNewProject = () => {
    localStorage.removeItem('loadProjectId'); // Ensure clean slate
    setLocation('/');
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="library-error">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-destructive">Failed to load projects</h2>
          <p className="text-muted-foreground">{(error as Error).message}</p>
          <Button onClick={() => refetch()} data-testid="button-retry">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="library-page">
      {/* Header */}
      <div className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleNewProject}
                data-testid="button-back-editor"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Editor
              </Button>
              <h1 className="text-2xl font-bold" data-testid="text-title">
                Project Library
              </h1>
              <Badge variant="secondary" data-testid="text-project-count">
                {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search"
                />
              </div>
              
              {/* View mode toggle */}
              <div className="flex items-center border rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  data-testid="button-view-grid"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  data-testid="button-view-list"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              
              {/* New project button */}
              <Button onClick={handleNewProject} data-testid="button-new-project">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="space-y-6" data-testid="loading-skeleton">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <Skeleton className="h-40 w-full rounded-lg" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-state">
            {searchTerm ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">No projects found</h3>
                <p className="text-muted-foreground">
                  No projects match "{searchTerm}". Try a different search term.
                </p>
                <Button variant="outline" onClick={() => setSearchTerm('')} data-testid="button-clear-search">
                  Clear Search
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">No projects yet</h3>
                <p className="text-muted-foreground">
                  Start creating your first LinkedIn video project!
                </p>
                <Button onClick={handleNewProject} data-testid="button-create-first">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
            : "space-y-4"
          }>
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                viewMode={viewMode}
                onLoad={() => handleLoadProject(project)}
                onRename={(title) => renameProjectMutation.mutate({ projectId: project.id, title })}
                onDelete={() => deleteProjectMutation.mutate(project.id)}
                isRenaming={renameProjectMutation.isPending}
                isDeleting={deleteProjectMutation.isPending}
                formatRelativeTime={formatRelativeTime}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  viewMode: ViewMode;
  onLoad: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  isRenaming: boolean;
  isDeleting: boolean;
  formatRelativeTime: (date: string) => string;
}

function ProjectCard({ project, viewMode, onLoad, onRename, onDelete, isRenaming, isDeleting, formatRelativeTime }: ProjectCardProps) {
  if (viewMode === 'list') {
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow" data-testid={`card-project-${project.id}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            {/* Thumbnail */}
            <div className="flex-shrink-0">
              {project.thumbnail ? (
                <img 
                  src={project.thumbnail} 
                  alt={project.title}
                  className="w-16 h-16 object-cover rounded-lg border"
                  data-testid={`img-thumbnail-${project.id}`}
                />
              ) : (
                <div className="w-16 h-16 bg-muted rounded-lg border flex items-center justify-center">
                  <Grid3X3 className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate" data-testid={`text-title-${project.id}`}>
                {project.title}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                <span data-testid={`text-updated-${project.id}`}>
                  <Calendar className="h-3 w-3 inline mr-1" />
                  {formatRelativeTime(project.lastOpenedAt || project.updatedAt)}
                </span>
                <span data-testid={`text-panes-${project.id}`}>
                  {project.panes.length} {project.panes.length === 1 ? 'scene' : 'scenes'}
                </span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Button size="sm" onClick={onLoad} data-testid={`button-load-${project.id}`}>
                Open
              </Button>
              <ProjectActions 
                onRename={onRename} 
                onDelete={onDelete} 
                isRenaming={isRenaming}
                isDeleting={isDeleting} 
                project={project}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" data-testid={`card-project-${project.id}`}>
      <CardHeader className="pb-3" onClick={onLoad}>
        {/* Thumbnail */}
        <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
          {project.thumbnail ? (
            <img 
              src={project.thumbnail} 
              alt={project.title}
              className="w-full h-full object-cover"
              data-testid={`img-thumbnail-${project.id}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Grid3X3 className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate mb-1" data-testid={`text-title-${project.id}`}>
              {project.title}
            </h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <div data-testid={`text-updated-${project.id}`}>
                <Calendar className="h-3 w-3 inline mr-1" />
                {formatRelativeTime(project.lastOpenedAt || project.updatedAt)}
              </div>
              <div data-testid={`text-panes-${project.id}`}>
                {project.panes.length} {project.panes.length === 1 ? 'scene' : 'scenes'}
              </div>
            </div>
          </div>
          
          <ProjectActions 
            onRename={onRename} 
            onDelete={onDelete} 
            isRenaming={isRenaming}
            isDeleting={isDeleting} 
            project={project}
          />
        </div>
        
        <Button className="w-full mt-3" size="sm" onClick={onLoad} data-testid={`button-load-${project.id}`}>
          Open Project
        </Button>
      </CardContent>
    </Card>
  );
}

interface ProjectActionsProps {
  onRename: (title: string) => void;
  onDelete: () => void;
  isRenaming: boolean;
  isDeleting: boolean;
  project: Project;
}

function ProjectActions({ onRename, onDelete, isRenaming, isDeleting, project }: ProjectActionsProps) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(project.title);

  const handleRename = () => {
    if (newTitle.trim() && newTitle.trim() !== project.title) {
      onRename(newTitle.trim());
      setRenameDialogOpen(false);
    }
  };

  const handleRenameDialogOpenChange = (open: boolean) => {
    setRenameDialogOpen(open);
    if (open) {
      setNewTitle(project.title); // Reset to current title when opening
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" data-testid={`button-actions-${project.id}`}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Rename Dialog */}
        <Dialog open={renameDialogOpen} onOpenChange={handleRenameDialogOpenChange}>
          <DialogTrigger asChild>
            <DropdownMenuItem 
              onSelect={(e) => e.preventDefault()}
              data-testid={`button-rename-${project.id}`}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Rename Project
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter project title"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRename();
                  } else if (e.key === 'Escape') {
                    setRenameDialogOpen(false);
                  }
                }}
                autoFocus
                data-testid={`input-rename-${project.id}`}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setRenameDialogOpen(false)}
                  data-testid={`button-cancel-rename-${project.id}`}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRename}
                  disabled={!newTitle.trim() || newTitle.trim() === project.title || isRenaming}
                  data-testid={`button-confirm-rename-${project.id}`}
                >
                  {isRenaming ? 'Renaming...' : 'Rename'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem 
              onSelect={(e) => e.preventDefault()}
              className="text-destructive"
              data-testid={`button-delete-${project.id}`}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Project
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{project.title}"? This action cannot be undone and all project data will be permanently lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid={`button-cancel-delete-${project.id}`}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={onDelete} 
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid={`button-confirm-delete-${project.id}`}
              >
                {isDeleting ? 'Deleting...' : 'Delete Project'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}