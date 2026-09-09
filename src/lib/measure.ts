import { fontById } from "./catalog";
import type { SignObject } from "./types";

let ctx: CanvasRenderingContext2D | null = null;

function getCtx() {
  if (ctx) return ctx;
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  ctx = c.getContext("2d");
  return ctx;
}

export function measureObject(obj: SignObject, precise = false) {
  if (!precise) {
    const width = Math.max(40, obj.text.length * obj.fontSize * 0.62);
    return { width, height: obj.fontSize * 1.15 };
  }
  const font = fontById(obj.fontId);
  const context = getCtx();
  if (!context) {
    const width = Math.max(40, obj.text.length * obj.fontSize * 0.62);
    return { width, height: obj.fontSize * 1.15 };
  }
  context.font = `700 ${obj.fontSize}px "${font.family}", sans-serif`;
  const spacing = obj.letterSpacing * obj.fontSize;
  const text = obj.text.length ? obj.text : " ";
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    width += context.measureText(text[i]!).width;
    if (i < text.length - 1) width += spacing;
  }
  const height = obj.fontSize * 1.12;
  return { width: Math.max(24, width), height };
}

export function objectBounds(obj: SignObject, precise = false) {
  const { width, height } = measureObject(obj, precise);
  const pad = isPanel(obj) ? obj.fontSize * 0.28 : 0;
  return {
    width: width + pad * 2,
    height: height + pad * 2,
  };
}

export function isPanel(obj: SignObject) {
  return obj.signType === "banner" || obj.signType === "lightbox" || obj.signType === "box";
}
