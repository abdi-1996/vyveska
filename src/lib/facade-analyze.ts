import type { FacadeState, Uv } from "./types";

function defaultCorners(): [Uv, Uv, Uv, Uv] {
  return [
    { x: 0.12, y: 0.18 },
    { x: 0.88, y: 0.2 },
    { x: 0.9, y: 0.62 },
    { x: 0.1, y: 0.6 },
  ];
}

export function makeFacadeState(src: string, width: number, height: number, analyzed = false): FacadeState {
  return {
    src,
    width,
    height,
    corners: defaultCorners(),
    calStart: { x: 0.42, y: 0.72 },
    calEnd: { x: 0.58, y: 0.72 },
    calMeters: 1.2,
    analyzed,
  };
}

export async function fileToFacadeSrc(file: File) {
  const bitmap = await createImageBitmap(file);
  const max = 1920;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return {
    src: canvas.toDataURL("image/jpeg", 0.84),
    width: canvas.width,
    height: canvas.height,
  };
}

export async function analyzeFacadeImage(src: string): Promise<[Uv, Uv, Uv, Uv]> {
  const img = await loadImage(src);
  const w = 280;
  const h = Math.max(1, Math.round((img.height / img.width) * w));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return defaultCorners();
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  const rowBright: number[] = [];
  for (let y = 0; y < h; y++) {
    let s = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      s += (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
    }
    rowBright.push(s / w);
  }

  let skyEnd = 0;
  const topAvg = average(rowBright.slice(0, Math.max(4, Math.floor(h * 0.12))));
  for (let y = 0; y < h * 0.4; y++) {
    if (rowBright[y]! > topAvg - 8 && rowBright[y]! > 150) skyEnd = y;
    else if (y > h * 0.08) break;
  }

  let groundStart = h - 1;
  for (let y = h - 1; y > h * 0.45; y--) {
    if (rowBright[y]! < 90) {
      groundStart = y;
      break;
    }
  }

  const bandTop = clamp01((skyEnd + h * 0.04) / h);
  const bandBot = clamp01((groundStart - h * 0.04) / h);
  const y0 = Math.min(bandTop, 0.42);
  const y1 = Math.max(bandBot, y0 + 0.22);

  const colEdge: number[] = new Array(w).fill(0);
  for (let x = 2; x < w - 2; x++) {
    let acc = 0;
    for (let y = Math.floor(y0 * h); y < Math.floor(y1 * h); y++) {
      const i = (y * w + x) * 4;
      const l = (y * w + x - 1) * 4;
      const r = (y * w + x + 1) * 4;
      acc += Math.abs(data[i]! - data[l]!) + Math.abs(data[i]! - data[r]!);
    }
    colEdge[x] = acc;
  }

  const left = findPeak(colEdge, 0, Math.floor(w * 0.35), true) / w;
  const right = findPeak(colEdge, Math.floor(w * 0.65), w - 1, false) / w;

  const insetL = clamp01(Math.min(left + 0.02, 0.22));
  const insetR = clamp01(Math.max(right - 0.02, 0.78));
  const vanish = 0.035;

  return [
    { x: insetL + vanish, y: y0 },
    { x: insetR - vanish, y: y0 + 0.012 },
    { x: insetR + 0.012, y: y1 },
    { x: insetL - 0.01, y: y1 - 0.01 },
  ];
}

export function facadeScale(facade: FacadeState) {
  const { corners, calStart, calEnd, calMeters } = facade;
  const quadW = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y);
  if (calStart && calEnd && calMeters > 0.05) {
    const uvDist = Math.hypot(calEnd.x - calStart.x, calEnd.y - calStart.y);
    if (uvDist > 0.01) {
      const metersPerUvX = calMeters / uvDist;
      return {
        widthM: Math.max(0.6, quadW * metersPerUvX),
        heightM: Math.max(0.4, Math.hypot(corners[3].x - corners[0].x, corners[3].y - corners[0].y) * metersPerUvX),
      };
    }
  }
  return { widthM: 4.2, heightM: 1.8 };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

function average(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function findPeak(values: number[], from: number, to: number, fromLeft: boolean) {
  let best = fromLeft ? from : to;
  let bestV = -1;
  if (fromLeft) {
    for (let i = from; i <= to; i++) {
      if ((values[i] ?? 0) > bestV) {
        bestV = values[i] ?? 0;
        best = i;
      }
    }
  } else {
    for (let i = to; i >= from; i--) {
      if ((values[i] ?? 0) > bestV) {
        bestV = values[i] ?? 0;
        best = i;
      }
    }
  }
  return best;
}
