import { lazy, Suspense, useEffect, useRef } from "react";
import { Toaster, toast } from "sonner";
import { Canvas2D } from "./Canvas2D";
import { FacadeStudio } from "./FacadeStudio";
import { MobileDock, SideTools } from "./MobileDock";
import { PropertiesPanel } from "./PropertiesPanel";
import { TopBar } from "./TopBar";
import { ensureUiFonts } from "@/lib/fonts";
import { useEditor } from "@/lib/store";

const Viewport3D = lazy(() => import("./Viewport3D").then((m) => ({ default: m.Viewport3D })));

export function EditorApp() {
  const mode = useEditor((s) => s.mode);
  const rendering = useEditor((s) => s.rendering);
  const setHydrated = useEditor((s) => s.setHydrated);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      await ensureUiFonts();
      try {
        await useEditor.persist.rehydrate();
      } catch {
        /* ignore */
      }
      const st = useEditor.getState();
      if (!st.objects.length) st.newDocument();
      setHydrated(true);
    })();
  }, [setHydrated]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) useEditor.getState().redo();
        else useEditor.getState().undo();
      }
      if (meta && e.key.toLowerCase() === "d") {
        e.preventDefault();
        useEditor.getState().duplicateSelected();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const t = e.target as HTMLElement;
        if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
        e.preventDefault();
        useEditor.getState().removeSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onExport = () => {
    const canvas = captureRef.current?.querySelector("canvas");
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "vyveska.png";
      a.click();
      toast("Сохранено PNG");
      return;
    }
    toast("Перейдите в 3D или Рендер, чтобы сохранить картинку");
  };

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      <Toaster position="top-center" theme="light" />
      <TopBar onExport={onExport} />
      <div className="flex min-h-0 flex-1">
        <SideTools />
        <div ref={captureRef} className="relative min-w-0 flex-1">
          {mode === "layout" ? (
            <Canvas2D />
          ) : (
            <Suspense fallback={<StageFallback label="Собираем 3D…" />}>
              <Viewport3D />
            </Suspense>
          )}
          {rendering && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-fg/55">
              <p className="font-display text-sm text-accent-fg">Рендер сцены</p>
              <div className="mt-3 h-1 w-40 overflow-hidden rounded-full bg-canvas/20">
                <div className="h-full w-2/3 animate-pulse bg-accent-fg" />
              </div>
              <p className="mt-2 text-xs text-accent-fg/70">Буквы · тени · свет на фасаде</p>
            </div>
          )}
        </div>
        <aside className="hidden w-72 shrink-0 border-l border-border bg-surface md:block">
          <PropertiesPanel />
        </aside>
      </div>
      <MobileDock />
      <FacadeStudio />
    </div>
  );
}

function StageFallback({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center bg-surface-2 text-sm text-muted">{label}</div>
  );
}
