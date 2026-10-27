"use client";
// 3D voxel grid for BFS / flood-fill frames: walls are tall blocks, visited cells rise by distance.
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useTheme } from "@/lib/theme";

const WAVE = ["#ea3a6a", "#ff7a1a", "#e9a100", "#10a874", "#0aa6c9", "#6c5cf5", "#a35cf5", "#ff5c8a"];

function Voxel({ x, z, h, color, glow }: { x: number; z: number; h: number; color: string; glow: boolean }) {
  const ref = useRef<THREE.Group>(null!);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  const target = useMemo(() => new THREE.Color(color), [color]);
  useFrame((_, dt) => {
    const g = ref.current;
    g.scale.y += (h - g.scale.y) * Math.min(1, dt * 7);
    mat.current.color.lerp(target, Math.min(1, dt * 6));
  });
  return (
    <group ref={ref} position={[x, 0, z]} scale={[1, 0.05, 1]}>
      <RoundedBox args={[0.9, 1, 0.9]} radius={0.08} smoothness={2} position={[0, 0.5, 0]}>
        <meshStandardMaterial ref={mat} color={color} roughness={0.5} emissive={glow ? color : "#000000"} emissiveIntensity={glow ? 0.5 : 0} />
      </RoundedBox>
    </group>
  );
}

export function VoxelGrid({ cells, dist, wave, islands }: { cells: (number | string)[][]; dist: (number | null)[][]; wave: number; islands?: boolean }) {
  const theme = useTheme();
  const dark = theme === "dark";
  const R = cells.length;
  const C = cells[0].length;
  const span = Math.max(R, C);
  return (
    <Canvas camera={{ position: [span * 0.35, span * 0.75, span * 0.85], fov: 42 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
      <hemisphereLight args={["#ffffff", dark ? "#26231f" : "#b9ab95", 1.1]} />
      <directionalLight position={[5, 12, 6]} intensity={1.5} />
      <group position={[-(C - 1) / 2, 0, -(R - 1) / 2]}>
        {cells.map((row, r) =>
          row.map((v, c) => {
            const d = dist[r][c];
            let h = 0.2;
            let color = dark ? "#33302c" : "#e6dfd2";
            if (v === "#") {
              h = 1.5;
              color = dark ? "#5a554d" : "#8d8577";
            } else if (v === "0") {
              h = 0.12;
              color = dark ? "#1b3550" : "#bfe3ef";
            } else if (v === "1" && d === null) {
              h = 0.55;
              color = dark ? "#3d8b6e" : "#9ed9bf";
            }
            if (d !== null) {
              h = islands ? 0.9 : 0.4 + Math.min(d, 12) * 0.25;
              color = WAVE[d % WAVE.length];
            }
            if (v === "S") color = "#ea3a6a";
            if (v === "T") {
              color = d !== null ? "#ffd23f" : "#10a874";
              h = Math.max(h, 1);
            }
            return <Voxel key={`${r}-${c}`} x={c} z={r} h={h} color={color} glow={d !== null && d === wave} />;
          }),
        )}
      </group>
      <OrbitControls makeDefault enablePan={false} maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  );
}
