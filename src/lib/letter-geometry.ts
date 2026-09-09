import * as opentype from "opentype.js";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { fontById } from "./catalog";
import type { FontId } from "./types";

const fontCache = new Map<string, Promise<opentype.Font>>();

export function loadOpentype(fontId: FontId) {
  const font = fontById(fontId);
  const cached = fontCache.get(font.file);
  if (cached) return cached;
  const job = opentype.load(font.file);
  fontCache.set(font.file, job);
  return job;
}

type PathCmd = {
  type: string;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
};

function pathToShapePath(commands: PathCmd[]) {
  const shapePath = new THREE.ShapePath();
  for (const cmd of commands) {
    const x = cmd.x ?? 0;
    const y = cmd.y ?? 0;
    switch (cmd.type) {
      case "M":
        shapePath.moveTo(x, -y);
        break;
      case "L":
        shapePath.lineTo(x, -y);
        break;
      case "C":
        shapePath.bezierCurveTo(cmd.x1 ?? 0, -(cmd.y1 ?? 0), cmd.x2 ?? 0, -(cmd.y2 ?? 0), x, -y);
        break;
      case "Q":
        shapePath.quadraticCurveTo(cmd.x1 ?? 0, -(cmd.y1 ?? 0), x, -y);
        break;
      case "Z":
        shapePath.currentPath?.closePath();
        break;
      default:
        break;
    }
  }
  return shapePath;
}

function glyphsToShapes(font: opentype.Font, text: string, fontSizeMm: number, tracking: number) {
  const size = fontSizeMm / 1000;
  const extra = tracking * size;
  let x = 0;
  const commands: PathCmd[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === " ") {
      const space = font.charToGlyph(" ").advanceWidth ?? font.unitsPerEm * 0.33;
      x += (space / font.unitsPerEm) * size + extra;
      continue;
    }
    const glyph = font.charToGlyph(ch);
    const path = glyph.getPath(x, 0, size);
    commands.push(...(path.commands as PathCmd[]));
    x += ((glyph.advanceWidth ?? font.unitsPerEm * 0.5) / font.unitsPerEm) * size + extra;
  }
  return pathToShapePath(commands).toShapes();
}

function contourToTube(points: THREE.Vector2[], radius: number) {
  if (points.length < 3) return null;
  const pts = points.map((p) => new THREE.Vector3(p.x, p.y, 0));
  const curve = new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.12);
  return new THREE.TubeGeometry(curve, Math.max(32, pts.length * 2), radius, 7, true);
}

function centerGeometry(geo: THREE.BufferGeometry) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  if (!bb) return { width: 1, height: 0.4 };
  const cx = (bb.min.x + bb.max.x) / 2;
  const cy = (bb.min.y + bb.max.y) / 2;
  geo.translate(-cx, -cy, -bb.min.z);
  return { width: bb.max.x - bb.min.x, height: bb.max.y - bb.min.y };
}

export type LetterBuild = {
  extrude: THREE.BufferGeometry;
  neon: THREE.BufferGeometry | null;
  width: number;
  height: number;
};

export async function buildLetterGeometry(opts: {
  text: string;
  fontId: FontId;
  fontSize: number;
  letterSpacing: number;
  depthMm: number;
}): Promise<LetterBuild | null> {
  const text = opts.text.trim();
  if (!text) return null;
  const font = await loadOpentype(opts.fontId);
  let shapes = glyphsToShapes(font, text, opts.fontSize, opts.letterSpacing);
  if (!shapes.length) {
    shapes = pathToShapePath(
      font.getPath(text, 0, 0, opts.fontSize / 1000).commands as PathCmd[],
    ).toShapes();
  }
  if (!shapes.length) return null;

  try {
    const depth = Math.max(0.002, opts.depthMm / 1000);
    const bevel = Math.min(0.004, depth * 0.12);
    const extrude = new THREE.ExtrudeGeometry(shapes, {
      depth,
      bevelEnabled: depth > 0.012,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 1,
      curveSegments: 8,
    });
    extrude.computeVertexNormals();
    const { width, height } = centerGeometry(extrude);

    const tubes: THREE.BufferGeometry[] = [];
    const radius = Math.max(0.004, (opts.fontSize / 1000) * 0.045);
    for (const shape of shapes) {
      const tube = contourToTube(shape.getPoints(72), radius);
      if (tube) tubes.push(tube);
      for (const hole of shape.holes) {
        const ht = contourToTube(hole.getPoints(48), radius * 0.85);
        if (ht) tubes.push(ht);
      }
    }
    const neon = tubes.length ? mergeGeometries(tubes, false) : null;
    if (neon) {
      neon.computeVertexNormals();
      centerGeometry(neon);
    }

    return { extrude, neon, width, height };
  } catch {
    return null;
  }
}
