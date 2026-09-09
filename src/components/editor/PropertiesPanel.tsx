import type { ReactNode } from "react";
import { FONTS, LIGHTING, MATERIALS, SIGN_COLORS, SIGN_TYPES } from "@/lib/catalog";
import { useEditor } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Copy, Trash2 } from "lucide-react";

export function PropertiesPanel() {
  const objects = useEditor((s) => s.objects);
  const selectedId = useEditor((s) => s.selectedId);
  const obj = objects.find((o) => o.id === selectedId);
  const update = useEditor((s) => s.updateSelected);
  const applyType = useEditor((s) => s.applyType);
  const commit = useEditor((s) => s.commit);
  const duplicate = useEditor((s) => s.duplicateSelected);
  const remove = useEditor((s) => s.removeSelected);

  if (!obj) {
    return (
      <div className="flex h-full flex-col justify-center px-5 text-sm text-muted">
        Выберите текст на холсте или добавьте новый.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-subtle">Текст</p>
        <Input
          className="mt-2"
          value={obj.text}
          onFocus={() => commit()}
          onChange={(e) => update({ text: e.target.value })}
        />
        <div className="mt-3 grid grid-cols-2 gap-1">
          {FONTS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                commit();
                update({ fontId: f.id });
              }}
              className={cn(
                "h-10 rounded-md px-2 text-left text-xs",
                obj.fontId === f.id ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg",
              )}
              style={{ fontFamily: `"${f.family}", sans-serif` }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <Separator />
      <div className="px-4 py-3">
        <Field label={`Размер  ${obj.fontSize} мм`}>
          <Slider
            min={40}
            max={720}
            step={2}
            value={[obj.fontSize]}
            onValueCommit={() => commit()}
            onValueChange={([v]) => update({ fontSize: v ?? obj.fontSize })}
          />
        </Field>
        <Field label={`Трекинг  ${obj.letterSpacing.toFixed(2)}`}>
          <Slider
            min={-0.08}
            max={0.35}
            step={0.01}
            value={[obj.letterSpacing]}
            onValueCommit={() => commit()}
            onValueChange={([v]) => update({ letterSpacing: v ?? 0 })}
          />
        </Field>
        <Field label={`Поворот  ${obj.rotation}°`}>
          <Slider
            min={-180}
            max={180}
            step={1}
            value={[obj.rotation]}
            onValueCommit={() => commit()}
            onValueChange={([v]) => update({ rotation: v ?? 0 })}
          />
        </Field>
      </div>
      <Separator />
      <div className="px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-subtle">Тип вывески</p>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {SIGN_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => applyType(t.id)}
              className={cn(
                "flex min-h-11 flex-col items-start rounded-md px-2 py-1.5 text-left",
                obj.signType === t.id ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg",
              )}
            >
              <span className="text-xs font-medium leading-tight">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <Separator />
      <div className="px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-subtle">Цвет лица</p>
        <Swatches
          value={obj.fill}
          onChange={(fill) => {
            commit();
            update({ fill });
          }}
        />
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-subtle">Цвет борта</p>
        <Swatches
          value={obj.sideColor}
          onChange={(sideColor) => {
            commit();
            update({ sideColor });
          }}
        />
      </div>
      <Separator />
      <div className="px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-subtle">Материал лица</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {MATERIALS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                commit();
                update({ faceMaterial: m.id });
              }}
              className={cn(
                "h-8 rounded-md px-2 text-xs",
                obj.faceMaterial === m.id ? "bg-accent text-accent-fg" : "bg-surface-2",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-subtle">Подсветка</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {LIGHTING.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                commit();
                update({ lighting: l.id });
              }}
              className={cn(
                "h-8 rounded-md px-2 text-xs",
                obj.lighting === l.id ? "bg-accent text-accent-fg" : "bg-surface-2",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        <Field label={`Глубина  ${obj.depthMm} мм`}>
          <Slider
            min={3}
            max={180}
            step={1}
            value={[obj.depthMm]}
            onValueCommit={() => commit()}
            onValueChange={([v]) => update({ depthMm: v ?? obj.depthMm })}
          />
        </Field>
        <Field label={`Относ  ${obj.standoffMm} мм`}>
          <Slider
            min={0}
            max={200}
            step={1}
            value={[obj.standoffMm]}
            onValueCommit={() => commit()}
            onValueChange={([v]) => update({ standoffMm: v ?? 0 })}
          />
        </Field>
      </div>
      <div className="mt-auto flex gap-2 p-4">
        <Button variant="secondary" className="flex-1" onClick={duplicate}>
          <Copy /> Дубль
        </Button>
        <Button variant="outline" className="flex-1" onClick={remove}>
          <Trash2 /> Удалить
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-3 block">
      <span className="text-xs text-muted tabular-nums">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Swatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {SIGN_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          onClick={() => onChange(c)}
          className={cn(
            "size-7 rounded-sm",
            value.toLowerCase() === c.toLowerCase() ? "ring-2 ring-fg ring-offset-1 ring-offset-surface" : "",
          )}
          style={{ background: c, boxShadow: "var(--shadow-border)" }}
        />
      ))}
    </div>
  );
}
