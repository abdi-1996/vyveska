import { FONTS } from "./catalog";
import type { FontId } from "./types";

type Loaded = { ready: Promise<void> };

const faces = new Map<FontId, Loaded>();

export function ensureUiFonts() {
  if (typeof document === "undefined") return Promise.resolve();
  const jobs = FONTS.map((font) => {
    const existing = faces.get(font.id);
    if (existing) return existing.ready;
    const face = new FontFace(font.family, `url(${font.file})`, {
      weight: "100 900",
      style: "normal",
      display: "swap",
    });
    const ready = face
      .load()
      .then((loaded) => {
        document.fonts.add(loaded);
      })
      .catch(() => undefined);
    faces.set(font.id, { ready });
    return ready;
  });
  return Promise.all(jobs).then(() => undefined);
}
