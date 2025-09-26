import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Plus, GripVertical, Copy, Trash2 } from 'lucide-react';
import { useProject } from '@/store/useProject';
import { TEMPLATES } from '@/types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';

function SortablePaneItem({ pane, isActive, onSelect, onUpdate, onDuplicate, onDelete }: {
  pane: any;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (updates: any) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pane.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg p-3 cursor-pointer border-2 transition-colors",
        isActive 
          ? "border-primary bg-accent" 
          : "border-border bg-background hover:border-accent"
      )}
      onClick={onSelect}
      data-testid={`pane-item-${pane.id}`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div 
          className="drag-handle cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium">{pane.name}</span>
        <span className="text-xs text-muted-foreground ml-auto">{pane.durationSec.toFixed(1)}s</span>
      </div>

      {/* Thumbnail */}
      <div 
        className="w-full aspect-square rounded-md mb-2 relative overflow-hidden"
        style={{ backgroundColor: pane.bgColor }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center text-xs">
            {pane.elements.length > 0 && (
              <div className="space-y-1">
                {pane.elements.slice(0, 2).map((el: any) => (
                  <div key={el.id} className="truncate max-w-full">
                    {el.type === 'text' ? el.text.split('\n')[0] : `${el.type}`}
                  </div>
                ))}
                {pane.elements.length > 2 && (
                  <div className="text-xs opacity-75">+{pane.elements.length - 2} more</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Slider
          value={[pane.durationSec]}
          onValueChange={([value]) => onUpdate({ durationSec: value })}
          min={1}
          max={10}
          step={0.5}
          className="flex-1 mr-2"
          data-testid={`slider-duration-${pane.id}`}
        />
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-6 h-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            data-testid={`button-duplicate-pane-${pane.id}`}
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-6 h-6 p-0 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            data-testid={`button-delete-pane-${pane.id}`}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PaneStrip() {
  const { 
    project, 
    addPane, 
    duplicatePane, 
    deletePane, 
    updatePane, 
    setActivePane,
    reorderPanes,
    toggleTemplate,
    isTemplateActive
  } = useProject();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = project!.panes.findIndex(p => p.id === active.id);
      const newIndex = project!.panes.findIndex(p => p.id === over.id);
      const newOrder = arrayMove(project!.panes, oldIndex, newIndex);
      reorderPanes(newOrder.map(p => p.id));
    }
  };


  if (!project) return null;

  return (
    <aside className="w-64 border-r border-border bg-card" data-testid="pane-strip">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Scenes</h2>
          <Button size="sm" onClick={addPane} data-testid="button-add-pane">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={project.panes} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {project.panes.map(pane => (
                <SortablePaneItem
                  key={pane.id}
                  pane={pane}
                  isActive={project.activePaneId === pane.id}
                  onSelect={() => setActivePane(pane.id)}
                  onUpdate={(updates) => updatePane(pane.id, updates)}
                  onDuplicate={() => duplicatePane(pane.id)}
                  onDelete={() => deletePane(pane.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Templates Section */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-3">Quick Templates</h3>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map(template => {
              const isActive = isTemplateActive(template.id);
              return (
                <Button
                  key={template.id}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "p-2 h-auto flex-col text-xs transition-colors",
                    isActive && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => toggleTemplate(template.id)}
                  data-testid={`button-template-${template.id}`}
                >
                  <div className="text-sm mb-1">{template.icon}</div>
                  <div className="leading-tight">{template.name}</div>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
