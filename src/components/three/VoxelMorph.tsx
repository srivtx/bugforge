"use client";
// Instanced voxels that morph between pixel-art shapes.
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export interface VoxelShape {
  name: string;
  rows: string[];
  palette: Record<string, string>;
  depth?: number;
}

export const SHAPES: VoxelShape[] = [
  {
    name: "bug",
    rows: [
      "...R.....R...",
      "....R...R....",
      ".....OOO.....",
      "...OOOOOOO...",
      "R..OWOOOWO..R",
      ".R.OOOOOOO.R.",
      "...ODDDDDO...",
      "R..OOOOOOO..R",
      ".R.ODDDDDO.R.",
      "...OOOOOOO...",
      ".....OOO.....",
    ],
    palette: { O: "#ff7a1a", R: "#ea3a6a", W: "#fffdf8", D: "#c75500" },
  },
  {
    name: "code",
    rows: [
      "..VV.....VV..",
      ".VV.......VV.",
      ".V.........V.",
      ".V...C.....V.",
      ".V..C.C....V.",
      "VV.C...C...VV",
      ".V..C.C....V.",
      ".V...C..MM.V.",
      ".V.........V.",
      ".VV.......VV.",
      "..VV.....VV..",
    ],
    palette: { V: "#6c5cf5", C: "#0aa6c9", M: "#10a874" },
  },
  {
    name: "hammer",
    rows: [
      ".AAAAAAAAA...",
      "AAAAAAAAAAA..",
      "AAAAAAAAAAA..",
      ".AAAAAAAAA...",
      "....BB.......",
      "....BB.......",
      "....BB.......",
      "....BB.......",
      "....BB.......",
      "...BBBB......",
      "...BBBB......",
    ],
    palette: { A: "#0aa6c9", B: "#e9a100" },
  },
  {
    name: "database",
    rows: [
      "...MMMMMMM...",
      ".MMMMMMMMMMM.",
      ".MLLLLLLLLLM.",
      ".MMMMMMMMMMM.",
      ".MMMMMMMMMMM.",
      ".MLLLLLLLLLM.",
      ".MMMMMMMMMMM.",
      ".MMMMMMMMMMM.",
      ".MLLLLLLLLLM.",
      ".MMMMMMMMMMM.",
      "...MMMMMMM...",
    ],
    palette: { M: "#10a874", L: "#7ff0c4" },
  },
];

interface Vox {
  p: THREE.Vector3;
  c: THREE.Color;
}

function voxelize(shape: VoxelShape): Vox[] {
  const out: Vox[] = [];
  const h = shape.rows.length;
  const w = Math.max(...shape.rows.map((r) => r.length));
  const depth = shape.depth ?? 2;
  shape.rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const col = shape.palette[ch];
      if (!col) return;
      for (let z = 0; z < depth; z++) {
        out.push({ p: new THREE.Vector3(x - w / 2 + 0.5, h / 2 - y - 0.5, z - depth / 2 + 0.5), c: new THREE.Color(col) });
      }
    });
  });
  // order bottom-left to top-right so morphs "flow"
  return out.sort((a, b) => a.p.y - b.p.y || a.p.x - b.p.x || a.p.z - b.p.z);
}

function Voxels({ shapes, index, pointer }: { shapes: Vox[][]; index: number; pointer: React.MutableRefObject<{ x: number; y: number }> }) {
  const count = Math.max(...shapes.map((s) => s.length));
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const group = useRef<THREE.Group>(null!);
  const geom = useMemo(() => new RoundedBoxGeometry(0.92, 0.92, 0.92, 2, 0.14), []);
  const state = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        pos: new THREE.Vector3((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30),
        vel: new THREE.Vector3(),
        scale: 0,
        color: new THREE.Color("#ffffff"),
        delay: i,
      })),
    [count],
  );
  const changedAt = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    changedAt.current = performance.now();
  }, [index]);

  useEffect(() => {
    const c = new THREE.Color("#ffffff");
    for (let i = 0; i < count; i++) mesh.current.setColorAt(i, c);
  }, [count]);

  useFrame((_, dt) => {
    const target = shapes[index];
    const since = (performance.now() - changedAt.current) / 1000;
    const t = performance.now() / 1000;
    for (let i = 0; i < count; i++) {
      const s = state[i];
      const v = target[i];
      const started = since > (i / count) * 0.6;
      if (v && started) {
        // spring toward the target with a gentle wave
        const wave = Math.sin(t * 1.6 + v.p.x * 0.5 + v.p.y * 0.35) * 0.12;
        const tx = v.p.x;
        const ty = v.p.y + wave;
        const tz = v.p.z;
        s.vel.x += (tx - s.pos.x) * 9 * dt;
        s.vel.y += (ty - s.pos.y) * 9 * dt;
        s.vel.z += (tz - s.pos.z) * 9 * dt;
        s.vel.multiplyScalar(Math.pow(0.0009, dt));
        s.pos.addScaledVector(s.vel, dt * 6);
        s.scale += (1 - s.scale) * Math.min(1, dt * 8);
        s.color.lerp(v.c, Math.min(1, dt * 5));
      } else if (!v) {
        s.scale += (0 - s.scale) * Math.min(1, dt * 6);
        s.pos.y += dt * 2;
      }
      dummy.position.copy(s.pos);
      dummy.scale.setScalar(Math.max(0.0001, s.scale));
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
      mesh.current.setColorAt(i, s.color);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    // idle rotation + pointer parallax
    const g = group.current;
    g.rotation.y += ((pointer.current.x * 0.5 + Math.sin(t * 0.4) * 0.35) - g.rotation.y) * Math.min(1, dt * 3);
    g.rotation.x += ((-pointer.current.y * 0.3 + 0.18) - g.rotation.x) * Math.min(1, dt * 3);
  });

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[geom, undefined, count]} castShadow receiveShadow>
        <meshStandardMaterial roughness={0.42} metalness={0.05} />
      </instancedMesh>
    </group>
  );
}

export function VoxelMorph({ interval = 3200, className, onShape }: { interval?: number; className?: string; onShape?: (name: string) => void }) {
  const voxShapes = useMemo(() => SHAPES.map(voxelize), []);
  const [index, setIndex] = useState(0);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SHAPES.length), interval);
    return () => clearInterval(id);
  }, [interval]);

  useEffect(() => {
    onShape?.(SHAPES[index].name);
  }, [index, onShape]);

  return (
    <div
      className={className}
      onPointerMove={(e) => {
        const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        pointer.current = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 };
      }}
      onClick={() => setIndex((i) => (i + 1) % SHAPES.length)}
    >
      <Canvas camera={{ position: [0, 0, 21], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <hemisphereLight args={["#ffffff", "#8a7a66", 1.1]} />
        <directionalLight position={[8, 12, 10]} intensity={1.6} />
        <directionalLight position={[-10, -4, 6]} intensity={0.35} color="#9f8cff" />
        <Voxels shapes={voxShapes} index={index} pointer={pointer} />
      </Canvas>
    </div>
  );
}
