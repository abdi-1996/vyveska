export type SignTypeId =
  | "sign"
  | "lit"
  | "banner"
  | "volume"
  | "pseudo"
  | "simple"
  | "lightbox"
  | "neon"
  | "box";

export type MaterialId = "pvc" | "acrylic" | "composite" | "metal" | "banner";

export type LightingId = "none" | "face" | "halo" | "both" | "neon";

export type ViewMode = "layout" | "wireframe" | "render";

export type FontId =
  | "unbounded"
  | "montserrat"
  | "oswald"
  | "rubik"
  | "manrope"
  | "playfair"
  | "ptsans";

export type SignObject = {
  id: string;
  text: string;
  x: number;
  y: number;
  rotation: number;
  fontSize: number;
  fontId: FontId;
  letterSpacing: number;
  fill: string;
  sideColor: string;
  signType: SignTypeId;
  faceMaterial: MaterialId;
  sideMaterial: MaterialId;
  depthMm: number;
  standoffMm: number;
  lighting: LightingId;
};

export type Uv = { x: number; y: number };

export type FacadeState = {
  src: string;
  width: number;
  height: number;
  corners: [Uv, Uv, Uv, Uv];
  calStart: Uv | null;
  calEnd: Uv | null;
  calMeters: number;
  analyzed: boolean;
};

export type EditorDocument = {
  objects: SignObject[];
  selectedId: string | null;
  facade: FacadeState | null;
};
