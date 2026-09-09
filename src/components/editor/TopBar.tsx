import type { ReactNode } from "react";
import { Box, Image as ImageIcon, Redo2, SunMoon, Undo2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/lib/store";
import { cn } from "@/lib/utils";

export function TopBar({ onExport }: { onExport: () => void }) {
  const mode = useEditor((s) => s.mode);
  const setMode = useEditor((s) => s.setMode);
  const setRendering = useEditor((s) => s.setRendering);
  const setFacadeOpen = useEditor((s) => s.setFacadeOpen);
  const night = useEditor((s) => s.night);
  const setNight = useEditor((s) => s.setNight);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const past = useEditor((s) => s.past);
  const future = useEditor((s) => s.future);

  const renderScene = () => {
    setMode("render");
    setRendering(true);
    window.setTimeout(() => setRendering(false), 700);
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface px-2 pt-[env(safe-area-inset-top)] md:h-14 md:px-3">
      <div className="min-w-0 pl-1">
        <p className="font-display text-sm font-semibold tracking-tight text-fg">Вывеска</p>
        <p className="hidden text-[11px] leading-none text-subtle sm:block">Студия объёмных букв</p>
      </div>
      <div className="mx-auto flex rounded-lg bg-surface-2 p-0.5">
        <ModeBtn active={mode === "layout"} onClick={() => setMode("layout")}>
          2D
        </ModeBtn>
        <ModeBtn active={mode === "wireframe"} onClick={() => setMode("wireframe")}>
          <Box className="size-3.5" />
          3D
        </ModeBtn>
        <ModeBtn active={mode === "render"} onClick={renderScene}>
          Рендер
        </ModeBtn>
      </div>
      <div className="ml-auto flex items-center gap-0.5">
        <Button variant="ghost" size="icon-sm" onClick={undo} disabled={!past.length} aria-label="Отменить">
          <Undo2 />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={redo} disabled={!future.length} aria-label="Повторить">
          <Redo2 />
        </Button>
        <Button
          variant={night ? "default" : "ghost"}
          size="icon-sm"
          onClick={() => setNight(!night)}
          aria-label="Вечер"
        >
          <SunMoon />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => setFacadeOpen(true)} aria-label="Фасад">
          <ImageIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onExport} aria-label="Экспорт">
          <Download />
        </Button>
      </div>
    </header>
  );
}

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 min-w-11 items-center justify-center gap-1 rounded-md px-2.5 text-xs font-medium",
        active ? "bg-accent text-accent-fg" : "text-muted",
      )}
    >
      {children}
    </button>
  );
}
