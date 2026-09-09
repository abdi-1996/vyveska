import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { analyzeFacadeImage, fileToFacadeSrc, makeFacadeState } from "@/lib/facade-analyze";
import { useEditor } from "@/lib/store";
import type { Uv } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FacadeStudio() {
  const open = useEditor((s) => s.facadeOpen);
  const setOpen = useEditor((s) => s.setFacadeOpen);
  const facade = useEditor((s) => s.facade);
  const setFacade = useEditor((s) => s.setFacade);
  const patch = useEditor((s) => s.patchFacade);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<null | { kind: "corner" | "calA" | "calB"; index?: number }>(null);

  if (!open) return null;

  const importFile = async (file: File) => {
    setBusy(true);
    try {
      const { src, width, height } = await fileToFacadeSrc(file);
      setFacade(makeFacadeState(src, width, height));
    } finally {
      setBusy(false);
    }
  };

  const loadSample = async () => {
    setBusy(true);
    try {
      const img = await fetch("/facades/sample.jpg").then((r) => r.blob());
      const file = new File([img], "sample.jpg", { type: "image/jpeg" });
      await importFile(file);
    } finally {
      setBusy(false);
    }
  };

  const analyze = async () => {
    if (!facade) return;
    setBusy(true);
    try {
      const corners = await analyzeFacadeImage(facade.src);
      patch({ corners, analyzed: true });
    } finally {
      setBusy(false);
    }
  };

  const toUv = (el: HTMLDivElement, clientX: number, clientY: number): Uv => {
    const rect = el.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-bg/95">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <p className="font-display text-sm font-semibold">Фасад</p>
        <div className="ml-auto flex gap-1">
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            Импорт
          </Button>
          <Button variant="secondary" size="sm" onClick={loadSample}>
            Пример
          </Button>
          <Button size="sm" onClick={analyze} disabled={!facade || busy}>
            {busy ? "Анализ…" : "Анализировать"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Готово
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
          }}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative min-h-0 flex-1 bg-surface-2">
          {facade ? (
            <div
              className="relative mx-auto flex h-full max-w-5xl items-center justify-center p-3"
            >
              <div
                className="relative touch-none"
                style={{ aspectRatio: `${facade.width} / ${facade.height}`, height: "100%", maxWidth: "100%" }}
                onPointerMove={(e) => {
                  if (!drag || !facade) return;
                  const uv = toUv(e.currentTarget, e.clientX, e.clientY);
                  if (drag.kind === "corner" && drag.index != null) {
                    const corners = [...facade.corners] as typeof facade.corners;
                    corners[drag.index] = uv;
                    patch({ corners });
                  } else if (drag.kind === "calA") patch({ calStart: uv });
                  else if (drag.kind === "calB") patch({ calEnd: uv });
                }}
                onPointerUp={() => setDrag(null)}
              >
                <img
                  src={facade.src}
                  alt="Фасад"
                  className="h-full w-full object-contain"
                  draggable={false}
                />
                <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
                  <polygon
                    points={facade.corners.map((c) => `${c.x},${c.y}`).join(" ")}
                    fill="rgba(30,58,52,0.12)"
                    stroke="#1e3a34"
                    strokeWidth="0.004"
                  />
                  {facade.calStart && facade.calEnd && (
                    <line
                      x1={facade.calStart.x}
                      y1={facade.calStart.y}
                      x2={facade.calEnd.x}
                      y2={facade.calEnd.y}
                      stroke="#8f2d2d"
                      strokeWidth="0.004"
                    />
                  )}
                </svg>
                {facade.corners.map((c, i) => (
                  <Handle key={i} uv={c} onDown={() => setDrag({ kind: "corner", index: i })} />
                ))}
                {facade.calStart && (
                  <Handle uv={facade.calStart} tone="danger" onDown={() => setDrag({ kind: "calA" })} />
                )}
                {facade.calEnd && (
                  <Handle uv={facade.calEnd} tone="danger" onDown={() => setDrag({ kind: "calB" })} />
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="font-display text-lg">Импорт фасада</p>
              <p className="max-w-sm text-sm text-muted text-pretty">
                Загрузите фото здания. Анализ найдёт стену и перспективу. Размер задаётся по детали —
                двери или окну.
              </p>
              <Button onClick={() => fileRef.current?.click()}>Выбрать фото</Button>
              <Button variant="secondary" onClick={loadSample}>
                Открыть пример
              </Button>
            </div>
          )}
        </div>
        <aside className="w-full shrink-0 border-t border-border bg-surface p-4 md:w-72 md:border-l md:border-t-0">
          <p className="text-xs font-medium uppercase tracking-wide text-subtle">Размер по детали</p>
          <p className="mt-2 text-sm text-muted text-pretty">
            Красные точки — известный размер на фото. Например ширина витрины.
          </p>
          <label className="mt-3 block text-xs text-muted">Длина детали, м</label>
          <Input
            className="mt-1"
            type="number"
            min={0.2}
            max={20}
            step={0.1}
            value={facade?.calMeters ?? 1.2}
            onChange={(e) => patch({ calMeters: Number(e.target.value) || 1.2 })}
            disabled={!facade}
          />
          <p className="mt-4 text-xs text-subtle">
            {facade?.analyzed
              ? "Стена размечена. Углы можно подвинуть пальцем."
              : "Нажмите «Анализировать», затем проверьте углы стены."}
          </p>
        </aside>
      </div>
    </div>
  );
}

function Handle({
  uv,
  onDown,
  tone = "accent",
}: {
  uv: Uv;
  onDown: () => void;
  tone?: "accent" | "danger";
}) {
  return (
    <button
      type="button"
      className={cn(
        "absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas",
        tone === "danger" ? "bg-danger" : "bg-accent",
      )}
      style={{ left: `${uv.x * 100}%`, top: `${uv.y * 100}%` }}
      onPointerDown={(e) => {
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        onDown();
      }}
    />
  );
}
