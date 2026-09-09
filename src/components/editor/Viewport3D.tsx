import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { facadeScale } from "@/lib/facade-analyze";
import { buildLetterGeometry, type LetterBuild } from "@/lib/letter-geometry";
import { isPanel, objectBounds } from "@/lib/measure";
import { useEditor } from "@/lib/store";
import type { FacadeState, SignObject, ViewMode } from "@/lib/types";

export function Viewport3D() {
  const mode = useEditor((s) => s.mode) as Exclude<ViewMode, "layout">;
  const night = useEditor((s) => s.night);
  const objects = useEditor((s) => s.objects);
  const facade = useEditor((s) => s.facade);
  const bg = mode === "wireframe" ? "#d8d4cc" : night ? "#07080a" : "#5c5852";

  return (
    <div className="relative h-full w-full bg-surface-2">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        camera={{ position: [1.05, 0.28, 2.05], fov: 36, near: 0.05, far: 80 }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.setClearColor(bg, 1);
        }}
      >
        <color attach="background" args={[bg]} />
        <Scene mode={mode} night={night} objects={objects} />
      </Canvas>
      <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-fg/75 px-2 py-1 text-xs text-accent-fg">
        {mode === "wireframe" ? "Каркас · глубина и тени" : facade ? "Рендер букв на фасаде" : "Рендер букв"}
      </div>
    </div>
  );
}

function Scene({
  mode,
  night,
  objects,
}: {
  mode: "wireframe" | "render";
  night: boolean;
  objects: SignObject[];
}) {
  const facade = useEditor((s) => s.facade);
  const keyLight = mode === "wireframe" ? 0.15 : night ? 0.35 : 2.1;
  const amb = mode === "wireframe" ? 1.15 : night ? 0.08 : 0.42;

  return (
    <>
      <ambientLight intensity={amb} />
      <hemisphereLight args={[night ? "#1a2230" : "#f2efe8", night ? "#0a0a0a" : "#8a8478", night ? 0.25 : 0.55]} />
      <directionalLight
        position={[2.8, 2.4, 4.2]}
        intensity={keyLight}
        color={night ? "#9eb4d4" : "#fff6e8"}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.2}
        shadow-camera-far={18}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0002}
      />
      {mode === "wireframe" && !facade && (
        <gridHelper args={[8, 24, "#b7b1a6", "#cdc8be"]} rotation={[Math.PI / 2, 0, 0]} />
      )}
      <FacadeWall mode={mode} night={night} />
      <LetterRig objects={objects} mode={mode} night={night} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={0.8}
        maxDistance={14}
        target={[0, 0.02, 0.12]}
      />
      <FrameCamera />
    </>
  );
}

function LetterRig({
  objects,
  mode,
  night,
}: {
  objects: SignObject[];
  mode: "wireframe" | "render";
  night: boolean;
}) {
  const facade = useEditor((s) => s.facade);
  const pos = facade ? wallOffset(facade) : { x: 0, y: 0 };
  return (
    <group position={[pos.x, pos.y, 0.03]}>
      {objects.map((obj) => (
        <LetterObject key={obj.id} obj={obj} mode={mode} night={night} />
      ))}
    </group>
  );
}

function FrameCamera() {
  const controls = useThree((s) => s.controls) as { target?: THREE.Vector3 } | null;
  const camera = useThree((s) => s.camera);
  const facade = useEditor((s) => s.facade);
  useEffect(() => {
    if (facade) {
      const photoH = 3.4;
      const dist = photoH / 2 / Math.tan((36 * Math.PI) / 180 / 2);
      camera.position.set(0, 0, dist * 1.08);
      const t = controls as { target?: THREE.Vector3 } | null;
      if (t?.target) t.target.set(0, 0, 0);
    } else {
      camera.position.set(1.05, 0.28, 2.05);
    }
  }, [facade, camera, controls]);
  return null;
}

function FacadeWall({ mode, night }: { mode: "wireframe" | "render"; night: boolean }) {
  const facade = useEditor((s) => s.facade);
  const tex = useTexture(facade?.src ?? null);
  const size = facade ? wallSize(facade) : { w: 4.8, h: 2.6 };

  if (!facade || !tex) {
    return (
      <>
        <mesh position={[0, 0, -0.01]} receiveShadow>
          <planeGeometry args={[size.w, size.h]} />
          <meshStandardMaterial
            color={mode === "wireframe" ? "#efece6" : night ? "#14161a" : "#6e6a64"}
            roughness={0.92}
            metalness={0}
          />
        </mesh>
        <mesh position={[0, 0, 0.001]} receiveShadow>
          <planeGeometry args={[size.w, size.h]} />
          <shadowMaterial transparent opacity={mode === "render" ? 0.42 : 0.18} />
        </mesh>
      </>
    );
  }

  tex.colorSpace = THREE.SRGBColorSpace;
  const aspect = facade.width / facade.height;
  const photoH = 3.4;
  const photoW = photoH * aspect;

  return (
    <>
      <mesh position={[0, 0, -0.04]}>
        <planeGeometry args={[photoW, photoH]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {mode === "render" && night && (
        <mesh position={[0, 0, -0.039]}>
          <planeGeometry args={[photoW, photoH]} />
          <meshBasicMaterial color="#020308" transparent opacity={0.45} />
        </mesh>
      )}
      <mesh position={[0, wallOffset(facade).y, 0.002]} receiveShadow>
        <planeGeometry args={[size.w * 1.15, size.h * 1.3]} />
        <shadowMaterial transparent opacity={mode === "render" ? 0.5 : 0.2} />
      </mesh>
    </>
  );
}

function wallSize(facade: FacadeState | null) {
  if (!facade) return { w: 4.8, h: 2.2 };
  const s = facadeScale(facade);
  return { w: s.widthM, h: s.heightM };
}

function wallOffset(facade: FacadeState) {
  const cx = (facade.corners[0].x + facade.corners[1].x + facade.corners[2].x + facade.corners[3].x) / 4;
  const cy = (facade.corners[0].y + facade.corners[1].y + facade.corners[2].y + facade.corners[3].y) / 4;
  const aspect = facade.width / facade.height;
  const photoH = 3.4;
  const photoW = photoH * aspect;
  return { x: (cx - 0.5) * photoW, y: (0.5 - cy) * photoH };
}

function useTexture(src: string | null) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!src) {
      setTex(null);
      return;
    }
    const loader = new THREE.TextureLoader();
    let cancelled = false;
    loader.load(src, (t) => {
      if (cancelled) {
        t.dispose();
        return;
      }
      t.needsUpdate = true;
      setTex(t);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);
  return tex;
}

function LetterObject({
  obj,
  mode,
  night,
}: {
  obj: SignObject;
  mode: "wireframe" | "render";
  night: boolean;
}) {
  const [build, setBuild] = useState<LetterBuild | null>(null);
  const key = `${obj.text}|${obj.fontId}|${obj.fontSize}|${obj.letterSpacing}|${obj.depthMm}`;
  const lastKey = useRef("");

  useEffect(() => {
    let alive = true;
    lastKey.current = key;
    buildLetterGeometry({
      text: obj.text,
      fontId: obj.fontId,
      fontSize: obj.fontSize,
      letterSpacing: obj.letterSpacing,
      depthMm: Math.max(obj.signType === "neon" ? 8 : obj.depthMm, 3),
    }).then((g) => {
      if (!alive || lastKey.current !== key) {
        g?.extrude.dispose();
        g?.neon?.dispose();
        return;
      }
      setBuild((prev) => {
        prev?.extrude.dispose();
        prev?.neon?.dispose();
        return g;
      });
    });
    return () => {
      alive = false;
    };
  }, [key, obj.text, obj.fontId, obj.fontSize, obj.letterSpacing, obj.depthMm, obj.signType]);

  const bounds = objectBounds(obj);
  const x = obj.x / 1000;
  const y = -obj.y / 1000;
  const z = Math.max(0.004, obj.standoffMm / 1000);
  const rot = (-obj.rotation * Math.PI) / 180;
  const glow = obj.lighting !== "none" && mode === "render";
  const faceEmissive = obj.lighting === "face" || obj.lighting === "both" || obj.lighting === "neon";
  const halo = obj.lighting === "halo" || obj.lighting === "both" || obj.lighting === "neon";
  const mat = obj.faceMaterial;

  const faceMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: mode === "wireframe" ? "#1c1b18" : obj.fill,
      roughness: mat === "metal" ? 0.28 : mat === "acrylic" ? 0.18 : mat === "banner" ? 0.92 : 0.62,
      metalness: mat === "metal" ? 0.86 : mat === "composite" ? 0.22 : 0.04,
      emissive: faceEmissive && mode === "render" ? obj.fill : "#000000",
      emissiveIntensity: mode === "wireframe" ? 0 : faceEmissive ? (night ? 3.4 : 0.85) : 0,
      wireframe: mode === "wireframe",
    });
  }, [faceEmissive, mat, mode, night, obj.fill]);

  const sideMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: mode === "wireframe" ? "#3a3832" : obj.sideColor,
        roughness: obj.sideMaterial === "metal" ? 0.32 : 0.55,
        metalness: obj.sideMaterial === "metal" ? 0.8 : 0.05,
        wireframe: mode === "wireframe",
      }),
    [mode, obj.sideColor, obj.sideMaterial],
  );

  useEffect(
    () => () => {
      faceMat.dispose();
      sideMat.dispose();
    },
    [faceMat, sideMat],
  );

  if (!build) return null;

  const depth = Math.max(0.003, obj.depthMm / 1000);
  const panel = isPanel(obj);

  return (
    <group position={[x, y, z]} rotation={[0, 0, rot]}>
      {panel && (
        <mesh position={[0, 0, -depth * 0.15]} castShadow receiveShadow>
          <boxGeometry args={[(bounds.width / 1000) * 1.08, (bounds.height / 1000) * 1.2, Math.max(0.02, depth)]} />
          {mode === "wireframe" ? (
            <meshBasicMaterial color="#222" wireframe />
          ) : (
            <meshStandardMaterial
              color={obj.signType === "banner" ? obj.fill : obj.sideColor}
              emissive={obj.lighting !== "none" ? obj.fill : "#000"}
              emissiveIntensity={obj.lighting !== "none" ? (night ? 1.6 : 0.45) : 0}
              roughness={obj.signType === "banner" ? 0.9 : 0.4}
              metalness={obj.signType === "banner" ? 0 : 0.35}
            />
          )}
        </mesh>
      )}
      <mesh
        geometry={build.extrude}
        castShadow
        receiveShadow
        position={[0, 0, panel ? depth * 0.45 : 0]}
        material={faceMat}
      />
      {mode === "wireframe" && (
        <lineSegments position={[0, 0, panel ? depth * 0.45 : 0]}>
          <edgesGeometry args={[build.extrude]} />
          <lineBasicMaterial color="#1e3a34" />
        </lineSegments>
      )}
      {obj.signType === "neon" && build.neon && (
        <mesh geometry={build.neon} position={[0, 0, depth * 0.7]}>
          <meshStandardMaterial
            color={obj.fill}
            emissive={obj.fill}
            emissiveIntensity={mode === "render" ? (night ? 6 : 2.2) : 0.2}
            roughness={0.25}
            metalness={0.1}
            wireframe={mode === "wireframe"}
          />
        </mesh>
      )}
      {glow && halo && (
        <pointLight
          position={[0, 0, -0.06]}
          color={obj.fill}
          intensity={night ? 18 : 7}
          distance={2.8}
          decay={2}
        />
      )}
      {glow && faceEmissive && (
        <pointLight
          position={[0, 0, depth + 0.12]}
          color={obj.fill}
          intensity={night ? 10 : 3.5}
          distance={1.8}
          decay={2}
        />
      )}
    </group>
  );
}
