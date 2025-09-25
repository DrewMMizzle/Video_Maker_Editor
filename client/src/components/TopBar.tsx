import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { FilePlus, FolderOpen, Save, Video, Image as ImageIcon } from 'lucide-react';
import { useProject } from '@/store/useProject';
import { ASPECT_RATIOS } from '@/types';
import { downloadProject, loadProjectFromFile } from '@/lib/persist';
import { exportVideo } from '@/lib/exportVideo';
import { exportCurrentPane } from '@/lib/exportImages';
import { useToast } from '@/hooks/use-toast';
import { useRef } from 'react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNewProject = () => {
    createProject();
    toast({
      title: "New project created",
      description: "Started with a fresh canvas and demo scenes.",
    });
  };

  const handleOpenProject = () => {
    fileInputRef.current?.click();
  };

  const handleFileLoad = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const projectData = await loadProjectFromFile(file);
      loadProject(projectData);
      toast({
        title: "Project loaded",
        description: `Loaded "${projectData.id}" successfully.`,
      });
    } catch (error) {
      toast({
        title: "Failed to load project",
        description: "The file format is invalid or corrupted.",
        variant: "destructive",
      });
    }
  };

  const handleSaveProject = () => {
    if (!project) return;
    
    downloadProject(project);
    toast({
      title: "Project saved",
      description: "Downloaded project file to your computer.",
    });
  };

  const handleExportVideo = async () => {
    if (!project || isExporting) return;

    try {
      setExporting(true);
      await exportVideo(project);
      toast({
        title: "Video exported",
        description: "WebM video file has been downloaded.",
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
      await exportCurrentPane(project, project.activePaneId);
      toast({
        title: "PNG exported",
        description: "Image file has been downloaded.",
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
              onClick={handleOpenProject}
              data-testid="button-open-project"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Open
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSaveProject}
              data-testid="button-save-project"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
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
    </header>
  );
}
