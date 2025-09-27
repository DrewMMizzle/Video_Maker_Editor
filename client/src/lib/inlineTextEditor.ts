import type Konva from "konva";

type Props = {
  stage: Konva.Stage;
  textNode: Konva.Text;
  initialValue: string;
  fontSize?: number;
  fontFamily?: string;
  onCommit: (value: string) => void;
  onCancel?: () => void;
};

export function startInlineEdit({
  stage,
  textNode,
  initialValue,
  fontSize,
  fontFamily,
  onCommit,
  onCancel,
}: Props) {
  const container = stage.container();
  const area = document.createElement("textarea");
  area.value = initialValue;
  area.setAttribute("data-testid", "input-text-editing");

  // Position the textarea over the text node
  const tr = textNode.getClientRect({ relativeTo: stage });
  const stageBox = container.getBoundingClientRect();
  const scale = stage.scaleX(); // assuming uniform scale

  area.style.position = "absolute";
  area.style.left = stageBox.left + tr.x * scale + "px";
  area.style.top = stageBox.top + tr.y * scale + "px";
  area.style.width = tr.width * scale + "px";
  area.style.height = tr.height * scale + "px";
  area.style.margin = "0";
  area.style.padding = "2px 4px";
  area.style.border = "1px solid #999";
  area.style.outline = "none";
  area.style.resize = "none";
  area.style.background = "white";
  area.style.fontSize = `${fontSize ?? textNode.fontSize()}px`;
  area.style.fontFamily = fontFamily ?? textNode.fontFamily();
  area.style.lineHeight = "1.2";
  area.style.zIndex = "1000";
  area.style.borderRadius = "4px";
  area.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";

  // Lock node interactions while editing
  const prevListening = textNode.listening();
  const prevDraggable = textNode.draggable();
  textNode.listening(false);
  textNode.draggable(false);

  document.body.appendChild(area);
  area.focus();
  area.select();

  const finish = (commit: boolean) => {
    area.removeEventListener("keydown", onKey);
    area.removeEventListener("blur", onBlur);
    area.remove();
    
    // Restore node interaction state
    textNode.listening(prevListening);
    textNode.draggable(prevDraggable);
    
    if (commit) onCommit(area.value);
    else onCancel?.();
    stage.draw();
  };

  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      finish(true);
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      finish(false);
    }
  };
  const onBlur = () => finish(true);

  area.addEventListener("keydown", onKey);
  area.addEventListener("blur", onBlur);
}