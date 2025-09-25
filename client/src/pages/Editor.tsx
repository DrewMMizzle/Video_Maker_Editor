import { useEffect } from 'react';
import TopBar from '@/components/TopBar';
import PaneStrip from '@/components/PaneStrip';
import StageCanvas from '@/components/StageCanvas';
import PropertiesPanel from '@/components/PropertiesPanel';
import BrandImportModal from '@/components/BrandImportModal';
import { useProject } from '@/store/useProject';

export default function Editor() {
  const { project, createProject } = useProject();

  useEffect(() => {
    if (!project) {
      createProject();
    }
  }, [project, createProject]);

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      
      <div className="flex flex-1 overflow-hidden">
        <PaneStrip />
        <StageCanvas />
        <PropertiesPanel />
      </div>
      
      <BrandImportModal />
    </div>
  );
}
