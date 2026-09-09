import { useCallback, useEffect, useRef, useState } from "react";
import { fontById } from "@/lib/catalog";
import { isPanel, objectBounds } from "@/lib/measure";
import { useEditor } from "@/lib/store";
import { cn } from "@/lib/utils";

type Drag =
  | { kind: "pan"; x: number; y: number; camX: number; camY: number }
  | { kind: "move"; id: string; ox: number; oy: number; x: number; y: number }
  | { kind: "scale"; id: string; startSize: number; dist: number }
  | { kind: "rotate"; id: string; start: number; angle: number };

export function Canvas2D() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const objects = useEditor((s) => s.objects);
  const selectedId = useEditor((s) => s.selectedId);
  const hydrated = useEditor((s) => s.hydrated);
  const select = useEditor((s) => s.select);
  const updateSelected = useEditor((s) => s.updateSelected);
  const commit = useEditor((s) => s.commit);
  const [cam, setCam] = useState({ x: 0, y: 0, zoom: 0.85 });
  const [drag, setDrag] = useState<Drag | null>(null);
  const [editing, setEditing] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - rect.width / 2) / cam.zoom + cam.x,
        y: (clientY - rect.top - rect.height / 2) / cam.zoom + cam.y,
      };
    },
    [cam],
  );

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      setCam((c) => ({ ...c, zoom: Math.min(3.2, Math.max(0.18, c.zoom * factor)) }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const hitTest = (wx: number, wy: number) => {
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i]!;
      const b = objectBounds(obj, hydrated);
      const dx = wx - obj.x;
      const dy = wy - obj.y;
      const rad = (-obj.rotation * Math.PI) / 180;
      const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
      if (Math.abs(lx) <= b.width / 2 + 12 && Math.abs(ly) <= b.height / 2 + 12) return obj.id;
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (editing) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
      pinch.current = { dist, zoom: cam.zoom };
      setDrag(null);
      return;
    }
    const handle = (e.target as HTMLElement).dataset.handle;
    const world = toWorld(e.clientX, e.clientY);
    const obj = objects.find((o) => o.id === selectedId);
    if (handle === "scale" && obj) {
      commit();
      const dist = Math.hypot(world.x - obj.x, world.y - obj.y);
      setDrag({ kind: "scale", id: obj.id, startSize: obj.fontSize, dist });
      return;
    }
    if (handle === "rotate" && obj) {
      commit();
      setDrag({
        kind: "rotate",
        id: obj.id,
        start: obj.rotation,
        angle: Math.atan2(world.y - obj.y, world.x - obj.x),
      });
      return;
    }
    const id = hitTest(world.x, world.y);
    select(id);
    if (id) {
      const target = objects.find((o) => o.id === id);
      if (target) {
        commit();
        setDrag({ kind: "move", id, ox: target.x, oy: target.y, x: world.x, y: world.y });
      }
    } else {
      setDrag({ kind: "pan", x: e.clientX, y: e.clientY, camX: cam.x, camY: cam.y });
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (pointers.current.size === 2 && pinch.current) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
      const z = Math.min(3.2, Math.max(0.18, pinch.current.zoom * (dist / pinch.current.dist)));
      setCam((c) => ({ ...c, zoom: z }));
      return;
    }
    if (!drag) return;
    const world = toWorld(e.clientX, e.clientY);
    if (drag.kind === "pan") {
      setCam((c) => ({
        ...c,
        x: drag.camX - (e.clientX - drag.x) / c.zoom,
        y: drag.camY - (e.clientY - drag.y) / c.zoom,
      }));
    } else if (drag.kind === "move") {
      useEditor.setState({
        objects: useEditor.getState().objects.map((o) =>
          o.id === drag.id ? { ...o, x: drag.ox + (world.x - drag.x), y: drag.oy + (world.y - drag.y) } : o,
        ),
      });
    } else if (drag.kind === "scale") {
      const obj = useEditor.getState().objects.find((o) => o.id === drag.id);
      if (!obj) return;
      const dist = Math.hypot(world.x - obj.x, world.y - obj.y);
      const next = Math.min(800, Math.max(40, drag.startSize * (dist / Math.max(8, drag.dist))));
      updateSelected({ fontSize: Math.round(next) });
    } else if (drag.kind === "rotate") {
      const obj = useEditor.getState().objects.find((o) => o.id === drag.id);
      if (!obj) return;
      const angle = Math.atan2(world.y - obj.y, world.x - obj.x);
      const deg = drag.start + ((angle - drag.angle) * 180) / Math.PI;
      updateSelected({ rotation: Math.round(deg) });
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    setDrag(null);
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full touch-none overflow-hidden bg-canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onDoubleClick={(e) => {
        const w = toWorld(e.clientX, e.clientY);
        if (hitTest(w.x, w.y)) setEditing(true);
      }}
    >
      <Grid cam={cam} />
      <div
        className="absolute left-1/2 top-1/2 origin-center will-change-transform"
        style={{
          transform: `translate(-50%, -50%) translate(${-cam.x * cam.zoom}px, ${-cam.y * cam.zoom}px) scale(${cam.zoom})`,
        }}
      >
        {objects.map((obj) => {
          const selected = obj.id === selectedId;
      const b = objectBounds(obj, hydrated);
          const font = fontById(obj.fontId);
          return (
            <div
              key={obj.id}
              className="absolute"
              style={{
                left: `${obj.x}px`,
                top: `${obj.y}px`,
                width: `${b.width}px`,
                height: `${b.height}px`,
                transform: `translate(-50%, -50%) rotate(${obj.rotation}deg)`,
              }}
            >
              {isPanel(obj) && (
                <div
                  className="absolute inset-0"
                  style={{
                    background: obj.signType === "banner" ? obj.fill : obj.sideColor,
                    boxShadow:
                      obj.signType === "lightbox" || obj.signType === "box"
                        ? `0 0 0 ${Math.max(6, obj.depthMm * 0.12)}px ${obj.sideColor}`
                        : "none",
                  }}
                />
              )}
              {editing && selected ? (
                <input
                  autoFocus
                  value={obj.text}
                  onChange={(e) => updateSelected({ text: e.target.value.toUpperCase() })}
                  onBlur={() => setEditing(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setEditing(false);
                  }}
                  className="absolute inset-0 bg-transparent text-center outline-none"
                  style={{
                    fontFamily: `"${font.family}", sans-serif`,
                    fontSize: obj.fontSize,
                    fontWeight: 700,
                    letterSpacing: `${obj.letterSpacing}em`,
                    color: isPanel(obj) && obj.signType !== "banner" ? obj.fill : obj.fill,
                    lineHeight: 1,
                  }}
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center whitespace-pre"
                  style={{
                    fontFamily: `"${font.family}", sans-serif`,
                    fontSize: obj.fontSize,
                    fontWeight: 700,
                    letterSpacing: `${obj.letterSpacing}em`,
                    color: obj.fill,
                    lineHeight: 1,
                    textShadow:
                      obj.lighting === "neon"
                        ? `0 0 12px ${obj.fill}, 0 0 28px ${obj.fill}`
                        : obj.lighting === "face" || obj.lighting === "both"
                          ? `0 0 18px color-mix(in oklab, ${obj.fill} 55%, transparent)`
                          : "none",
                    WebkitTextStroke:
                      obj.signType === "volume" || obj.signType === "lit"
                        ? `${Math.max(1, obj.fontSize * 0.018)}px ${obj.sideColor}`
                        : undefined,
                  }}
                >
                  {obj.text}
                </div>
              )}
              {selected && !editing && (
                <>
                  <div className="pointer-events-none absolute -inset-1 border border-accent/80" />
                  <button
                    type="button"
                    data-handle="scale"
                    className="absolute -right-2 -bottom-2 size-4 rounded-sm bg-accent shadow-sm"
                    aria-label="Размер"
                  />
                  <button
                    type="button"
                    data-handle="rotate"
                    className="absolute left-1/2 -top-6 size-4 -translate-x-1/2 rounded-full bg-accent shadow-sm"
                    aria-label="Поворот"
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-fg/80 px-2 py-1 text-xs text-accent-fg tabular-nums">
        {Math.round(cam.zoom * 100)}% · мм
      </div>
    </div>
  );
}

function Grid({ cam }: { cam: { x: number; y: number; zoom: number } }) {
  const step = cam.zoom > 1.4 ? 50 : cam.zoom > 0.7 ? 100 : 200;
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 opacity-70")}
      style={{
        backgroundImage: `linear-gradient(to right, rgba(23,22,20,0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(23,22,20,0.05) 1px, transparent 1px)`,
        backgroundSize: `${step * cam.zoom}px ${step * cam.zoom}px`,
        backgroundPosition: `calc(50% - ${cam.x * cam.zoom}px) calc(50% - ${cam.y * cam.zoom}px)`,
      }}
    />
  );
}
