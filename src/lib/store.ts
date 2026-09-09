import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createDefaultObject, typeById } from "./catalog";
import type { FacadeState, SignObject, SignTypeId, ViewMode } from "./types";

type Snapshot = {
  objects: SignObject[];
  selectedId: string | null;
  facade: FacadeState | null;
};

type EditorState = {
  objects: SignObject[];
  selectedId: string | null;
  facade: FacadeState | null;
  mode: ViewMode;
  night: boolean;
  rendering: boolean;
  facadeOpen: boolean;
  hydrated: boolean;
  past: Snapshot[];
  future: Snapshot[];
  setHydrated: (v: boolean) => void;
  select: (id: string | null) => void;
  setMode: (mode: ViewMode) => void;
  setNight: (v: boolean) => void;
  setRendering: (v: boolean) => void;
  setFacadeOpen: (v: boolean) => void;
  addText: (text?: string) => void;
  updateSelected: (patch: Partial<SignObject>) => void;
  applyType: (type: SignTypeId) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  commit: () => void;
  undo: () => void;
  redo: () => void;
  setFacade: (facade: FacadeState | null) => void;
  patchFacade: (patch: Partial<FacadeState>) => void;
  newDocument: () => void;
};

function snap(s: EditorState): Snapshot {
  return {
    objects: s.objects.map((o) => ({ ...o })),
    selectedId: s.selectedId,
    facade: s.facade ? { ...s.facade, corners: [...s.facade.corners] } : null,
  };
}

const seed = createDefaultObject({ text: "КАФЕ" });

export const useEditor = create<EditorState>()(
  persist(
    (set, get) => ({
      objects: [seed],
      selectedId: seed.id,
      facade: null,
      mode: "layout",
      night: false,
      rendering: false,
      facadeOpen: false,
      hydrated: false,
      past: [],
      future: [],
      setHydrated: (v) => set({ hydrated: v }),
      select: (id) => set({ selectedId: id }),
      setMode: (mode) => set({ mode, night: mode === "render" ? get().night : get().night }),
      setNight: (v) => set({ night: v }),
      setRendering: (v) => set({ rendering: v }),
      setFacadeOpen: (v) => set({ facadeOpen: v }),
      addText: (text = "ТЕКСТ") => {
        get().commit();
        const selected = get().objects.find((o) => o.id === get().selectedId);
        const obj = createDefaultObject({
          text,
          y: (selected?.y ?? 0) + 220,
          signType: selected?.signType,
          fill: selected?.fill,
          fontId: selected?.fontId,
        });
        set({ objects: [...get().objects, obj], selectedId: obj.id });
      },
      updateSelected: (patch) => {
        const id = get().selectedId;
        if (!id) return;
        set({
          objects: get().objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        });
      },
      applyType: (type) => {
        const id = get().selectedId;
        if (!id) return;
        get().commit();
        const t = typeById(type);
        set({
          objects: get().objects.map((o) =>
            o.id === id
              ? {
                  ...o,
                  signType: t.id,
                  depthMm: t.depthMm,
                  standoffMm: t.standoffMm,
                  lighting: t.lighting,
                  faceMaterial: t.faceMaterial,
                  sideMaterial: t.sideMaterial,
                }
              : o,
          ),
        });
      },
      removeSelected: () => {
        const id = get().selectedId;
        if (!id) return;
        get().commit();
        const next = get().objects.filter((o) => o.id !== id);
        set({ objects: next, selectedId: next.at(-1)?.id ?? null });
      },
      duplicateSelected: () => {
        const id = get().selectedId;
        const src = get().objects.find((o) => o.id === id);
        if (!src) return;
        get().commit();
        const copy = {
          ...src,
          id: crypto.randomUUID(),
          x: src.x + 40,
          y: src.y + 40,
        };
        set({ objects: [...get().objects, copy], selectedId: copy.id });
      },
      commit: () => {
        const s = get();
        set({ past: [...s.past.slice(-40), snap(s)], future: [] });
      },
      undo: () => {
        const s = get();
        const prev = s.past.at(-1);
        if (!prev) return;
        set({
          past: s.past.slice(0, -1),
          future: [snap(s), ...s.future],
          objects: prev.objects,
          selectedId: prev.selectedId,
          facade: prev.facade,
        });
      },
      redo: () => {
        const s = get();
        const next = s.future[0];
        if (!next) return;
        set({
          future: s.future.slice(1),
          past: [...s.past, snap(s)],
          objects: next.objects,
          selectedId: next.selectedId,
          facade: next.facade,
        });
      },
      setFacade: (facade) => set({ facade }),
      patchFacade: (patch) => {
        const facade = get().facade;
        if (!facade) return;
        set({ facade: { ...facade, ...patch } });
      },
      newDocument: () => {
        const obj = createDefaultObject({ text: "КАФЕ" });
        set({
          objects: [obj],
          selectedId: obj.id,
          facade: null,
          mode: "layout",
          past: [],
          future: [],
        });
      },
    }),
    {
      name: "vyveska-doc-v1",
      skipHydration: true,
      partialize: (s) => ({
        objects: s.objects,
        selectedId: s.selectedId,
        facade: s.facade,
      }),
    },
  ),
);
