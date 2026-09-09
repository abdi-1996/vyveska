import { Image as ImageIcon, Palette, Plus, SlidersHorizontal, Type } from "lucide-react";
import { useState, type ReactNode } from "react";
import { PropertiesPanel } from "./PropertiesPanel";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/lib/store";
import { cn } from "@/lib/utils";

export function MobileDock() {
  const addText = useEditor((s) => s.addText);
  const setFacadeOpen = useEditor((s) => s.setFacadeOpen);
  const [sheet, setSheet] = useState(false);

  return (
    <>
      {sheet && (
        <div className="absolute inset-x-0 bottom-16 z-20 max-h-[70%] overflow-hidden rounded-t-xl border border-border bg-surface shadow-lg md:hidden">
          <div className="flex items-center justify-between px-4 py-2">
            <p className="text-sm font-medium">Свойства</p>
            <button type="button" className="text-sm text-muted" onClick={() => setSheet(false)}>
              Закрыть
            </button>
          </div>
          <div className="max-h-[60dvh] overflow-y-auto">
            <PropertiesPanel />
          </div>
        </div>
      )}
      <nav className="flex h-16 shrink-0 items-center justify-around border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        <DockBtn label="Текст" onClick={() => addText()}>
          <Plus className="size-5" />
        </DockBtn>
        <DockBtn label="Шрифт" onClick={() => setSheet(true)}>
          <Type className="size-5" />
        </DockBtn>
        <DockBtn label="Тип" onClick={() => setSheet(true)}>
          <SlidersHorizontal className="size-5" />
        </DockBtn>
        <DockBtn label="Цвет" onClick={() => setSheet(true)}>
          <Palette className="size-5" />
        </DockBtn>
        <DockBtn label="Фасад" onClick={() => setFacadeOpen(true)}>
          <ImageIcon className="size-5" />
        </DockBtn>
      </nav>
    </>
  );
}

function DockBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 text-[10px] text-muted")}
    >
      {children}
      {label}
    </button>
  );
}

export function SideTools() {
  const addText = useEditor((s) => s.addText);
  const setFacadeOpen = useEditor((s) => s.setFacadeOpen);
  return (
    <div className="hidden w-14 flex-col items-center gap-1 border-r border-border bg-surface py-3 lg:flex">
      <Button variant="ghost" size="icon" onClick={() => addText()} aria-label="Добавить текст">
        <Plus />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => setFacadeOpen(true)} aria-label="Фасад">
        <ImageIcon />
      </Button>
    </div>
  );
}
