import type { FontId, LightingId, MaterialId, SignObject, SignTypeId } from "./types";
import { uid } from "./utils";

export const SIGN_TYPES: {
  id: SignTypeId;
  label: string;
  hint: string;
  depthMm: number;
  standoffMm: number;
  lighting: LightingId;
  faceMaterial: MaterialId;
  sideMaterial: MaterialId;
  panel: boolean;
}[] = [
  {
    id: "sign",
    label: "Вывески",
    hint: "Наборная вывеска",
    depthMm: 40,
    standoffMm: 20,
    lighting: "none",
    faceMaterial: "pvc",
    sideMaterial: "pvc",
    panel: false,
  },
  {
    id: "lit",
    label: "Световые",
    hint: "С внутренней подсветкой",
    depthMm: 80,
    standoffMm: 40,
    lighting: "face",
    faceMaterial: "acrylic",
    sideMaterial: "pvc",
    panel: false,
  },
  {
    id: "banner",
    label: "Баннер",
    hint: "Печать на виниле",
    depthMm: 4,
    standoffMm: 0,
    lighting: "none",
    faceMaterial: "banner",
    sideMaterial: "banner",
    panel: true,
  },
  {
    id: "volume",
    label: "Объёмные",
    hint: "Лицо + борт + глубина",
    depthMm: 60,
    standoffMm: 40,
    lighting: "face",
    faceMaterial: "acrylic",
    sideMaterial: "pvc",
    panel: false,
  },
  {
    id: "pseudo",
    label: "Псевдобуквы",
    hint: "Плоские на относе",
    depthMm: 8,
    standoffMm: 15,
    lighting: "none",
    faceMaterial: "composite",
    sideMaterial: "composite",
    panel: false,
  },
  {
    id: "simple",
    label: "Простые",
    hint: "Плоский рез 3–10 мм",
    depthMm: 8,
    standoffMm: 0,
    lighting: "none",
    faceMaterial: "pvc",
    sideMaterial: "pvc",
    panel: false,
  },
  {
    id: "lightbox",
    label: "Lightbox",
    hint: "Светящийся короб",
    depthMm: 100,
    standoffMm: 0,
    lighting: "face",
    faceMaterial: "acrylic",
    sideMaterial: "metal",
    panel: true,
  },
  {
    id: "neon",
    label: "Neon",
    hint: "Контур и ореол",
    depthMm: 12,
    standoffMm: 30,
    lighting: "neon",
    faceMaterial: "acrylic",
    sideMaterial: "composite",
    panel: false,
  },
  {
    id: "box",
    label: "Короб",
    hint: "Объёмный световой короб",
    depthMm: 120,
    standoffMm: 0,
    lighting: "face",
    faceMaterial: "acrylic",
    sideMaterial: "metal",
    panel: true,
  },
];

export const MATERIALS: { id: MaterialId; label: string; hint: string }[] = [
  { id: "pvc", label: "ПВХ", hint: "Вспененный пластик" },
  { id: "acrylic", label: "Акрил", hint: "Оргстекло, свет" },
  { id: "composite", label: "Композит", hint: "АКП, улица" },
  { id: "metal", label: "Металл", hint: "Алюминий / сталь" },
  { id: "banner", label: "Баннер", hint: "Винил, печать" },
];

export const LIGHTING: { id: LightingId; label: string; hint: string }[] = [
  { id: "none", label: "Нет", hint: "Без света" },
  { id: "face", label: "Лицо", hint: "Светится перед" },
  { id: "halo", label: "Контражур", hint: "Ореол на стене" },
  { id: "both", label: "Комби", hint: "Лицо и ореол" },
  { id: "neon", label: "Неон", hint: "Контур + отсвет" },
];

export const FONTS: { id: FontId; label: string; family: string; file: string }[] = [
  { id: "unbounded", label: "Unbounded", family: "Unbounded", file: "/fonts/unbounded.ttf" },
  { id: "montserrat", label: "Montserrat", family: "Montserrat", file: "/fonts/montserrat.ttf" },
  { id: "oswald", label: "Oswald", family: "Oswald", file: "/fonts/oswald.ttf" },
  { id: "rubik", label: "Rubik", family: "Rubik", file: "/fonts/rubik.ttf" },
  { id: "manrope", label: "Manrope", family: "Manrope", file: "/fonts/manrope.ttf" },
  { id: "playfair", label: "Playfair", family: "Playfair Display", file: "/fonts/playfair.ttf" },
  { id: "ptsans", label: "PT Sans", family: "PT Sans", file: "/fonts/ptsans.ttf" },
];

export const SIGN_COLORS = [
  "#f4f1ea",
  "#171614",
  "#c43b3b",
  "#1e3a34",
  "#2c4a78",
  "#d8c4a2",
  "#c9ccd1",
  "#e2b15c",
  "#f27a3d",
  "#6b1d2a",
];

export function fontById(id: FontId) {
  return FONTS.find((f) => f.id === id) ?? FONTS[0];
}

export function typeById(id: SignTypeId) {
  return SIGN_TYPES.find((t) => t.id === id) ?? SIGN_TYPES[0];
}

export function createDefaultObject(partial?: Partial<SignObject>): SignObject {
  const t = typeById(partial?.signType ?? "volume");
  return {
    id: uid(),
    text: "КАФЕ",
    x: 0,
    y: 0,
    rotation: 0,
    fontSize: 280,
    fontId: "unbounded",
    letterSpacing: 0.06,
    fill: "#f4f1ea",
    sideColor: "#26221c",
    signType: t.id,
    faceMaterial: t.faceMaterial,
    sideMaterial: t.sideMaterial,
    depthMm: t.depthMm,
    standoffMm: t.standoffMm,
    lighting: t.lighting,
    ...partial,
  };
}
