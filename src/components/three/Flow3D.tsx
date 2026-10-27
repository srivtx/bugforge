"use client";
// 3D voxel world for one HTTP request: the request cube travels across middleware/handler pillars,
// dips into collection towers (one voxel per document, matched documents glow) and lands on a status block.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Trace, TraceStep } from "@/lib/types";
import { useTheme } from "@/lib/theme";

const COLORS = {
  middleware: "#6c5cf5",
  router: "#9aa0b8",
  handler: "#0aa6c9",
  db: "#10a874",
  error: "#ea3a6a",
  request: "#ff7a1a",
  dbHit: "#ffd23f",
};

const SPACING = 3.2;
const TOWER_Z = -3.6;

function statusColor(s: Trace["status"]) {
  if (s === "timeout" || s === null) return "#ea3a6a";
  if (s >= 500) return "#ea3a6a";
  if (s >= 400) return "#e9a100";
  if (s >= 300) return "#6c5cf5";
  return "#10a874";
}

interface Station {
  step: TraceStep | null;
  kind: "start" | "end" | TraceStep["kind"];
  x: number;
  label: string;
}

function Label({ children, color, y = 0, z = 0, x = 0, dim }: { children: React.ReactNode; color: string; x?: number; y?: number; z?: number; dim?: boolean }) {
  return (
    <Html position={[x, y, z]} center distanceFactor={11} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <div
        style={{
          fontFamily: "var(--font-code), monospace",
          fontSize: 12,
          whiteSpace: "nowrap",
          padding: "3px 8px",
          borderRadius: 8,
          border: `2px solid ${color}`,
          background: "var(--panel)",
          color: "var(--text)",
          boxShadow: `0 3px 0 ${color}`,
          opacity: dim ? 0.55 : 1,
          maxWidth: 220,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {children}
      </div>
    </Html>
  );
}

function Pillar({ x, color, height, active }: { x: number; color: string; height: number; active: boolean }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    const target = active ? 1.12 : 1;
    ref.current.scale.y += (target - ref.current.scale.y) * Math.min(1, dt * 8);
  });
  return (
    <group ref={ref} position={[x, 0, 0]}>
      {Array.from({ length: height }).map((_, i) => (
        <RoundedBox key={i} args={[1.3, 0.62, 1.3]} radius={0.12} smoothness={3} position={[0, 0.31 + i * 0.66, 0]}>
          <meshStandardMaterial color={color} roughness={0.45} emissive={color} emissiveIntensity={active ? 0.35 : 0.04} />
        </RoundedBox>
      ))}
    </group>
  );
}

// a collection = tower of document voxels, 3x3 per layer
function Tower({ x, step, lit }: { x: number; step: TraceStep; lit: boolean }) {
  const size = Math.min(step.size ?? 0, 54);
  const matched = Math.min(step.matched ?? 0, size);
  const isInsert = step.op === "insert";
  const voxels = useMemo(() => {
    const out: { p: [number, number, number]; hit: boolean }[] = [];
    for (let i = 0; i < size; i++) {
      const layer = Math.floor(i / 9);
      const cell = i % 9;
      const hit = isInsert ? i === size - 1 : i >= size - matched;
      out.push({ p: [((cell % 3) - 1) * 0.5, 0.3 + layer * 0.5, (Math.floor(cell / 3) - 1) * 0.5], hit });
    }
    return out;
  }, [size, matched, isInsert]);
  return (
    <group position={[x, 0, TOWER_Z]}>
      <RoundedBox args={[1.9, 0.18, 1.9]} radius={0.06} position={[0, 0.02, 0]}>
        <meshStandardMaterial color="#0a7a54" roughness={0.6} />
      </RoundedBox>
      {voxels.map((v, i) => (
        <RoundedBox key={i} args={[0.44, 0.44, 0.44]} radius={0.07} smoothness={2} position={v.p}>
          <meshStandardMaterial color={v.hit && lit ? COLORS.dbHit : COLORS.db} emissive={v.hit && lit ? COLORS.dbHit : "#000000"} emissiveIntensity={v.hit && lit ? 0.6 : 0} roughness={0.4} />
        </RoundedBox>
      ))}
      <Label color={COLORS.db} y={0.6 + Math.ceil(size / 9) * 0.5 + 0.5} dim={!lit}>
        🗄 {step.coll} · {step.size ?? 0} doc{step.size === 1 ? "" : "s"}
      </Label>
    </group>
  );
}

function Traveler({ stations, playKey, onStation, speed }: { stations: Station[]; playKey: number; onStation: (i: number) => void; speed: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const t = useRef(0);
  const last = useRef(-1);
  const keyRef = useRef(playKey);
  const points = useMemo(
    () =>
      stations.map((s) => {
        if (s.kind === "db") return new THREE.Vector3(s.x, 3.6, TOWER_Z);
        if (s.kind === "start" || s.kind === "end") return new THREE.Vector3(s.x, 1.6, 0);
        return new THREE.Vector3(s.x, (s.kind === "router" ? 1 : 2) * 0.66 + 0.9, 0);
      }),
    [stations],
  );
  useFrame((_, dt) => {
    if (keyRef.current !== playKey) {
      keyRef.current = playKey;
      t.current = 0;
      last.current = -1;
    }
    t.current = Math.min(t.current + dt * speed, points.length - 1);
    const i = Math.floor(t.current);
    const f = t.current - i;
    const a = points[i];
    const b = points[Math.min(i + 1, points.length - 1)];
    const e = f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
    ref.current.position.lerpVectors(a, b, e);
    ref.current.position.y += Math.sin(e * Math.PI) * 1.4; // hop
    ref.current.rotation.x += dt * 2;
    ref.current.rotation.y += dt * 3;
    const reached = f < 0.02 || t.current === points.length - 1 ? i : i;
    if (reached !== last.current) {
      last.current = reached;
      onStation(reached);
    }
  });
  return (
    <mesh ref={ref} castShadow>
      <boxGeometry args={[0.7, 0.7, 0.7]} />
      <meshStandardMaterial color={COLORS.request} emissive={COLORS.request} emissiveIntensity={0.45} roughness={0.3} />
    </mesh>
  );
}

function World({ trace, playKey, speed }: { trace: Trace; playKey: number; speed: number }) {
  const [at, setAt] = useState(0);
  const stations: Station[] = useMemo(() => {
    const st: Station[] = [{ step: null, kind: "start", x: 0, label: `${trace.method} ${trace.url}` }];
    trace.steps.forEach((s) => st.push({ step: s, kind: s.kind, x: 0, label: s.name }));
    st.push({ step: null, kind: "end", x: 0, label: String(trace.status) });
    const w = (st.length - 1) * SPACING;
    st.forEach((s, i) => (s.x = i * SPACING - w / 2));
    return st;
  }, [trace]);
  const width = (stations.length - 1) * SPACING;

  return (
    <>
      {/* ground */}
      <RoundedBox args={[width + 5, 0.4, 10]} radius={0.18} position={[0, -0.21, -1.6]} receiveShadow>
        <meshStandardMaterial color="#d9d1c2" roughness={0.9} />
      </RoundedBox>
      {/* track */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width + 2, 0.5]} />
        <meshStandardMaterial color="#ff7a1a" transparent opacity={0.35} />
      </mesh>

      {stations.map((s, i) => {
        const reached = at >= i;
        if (s.kind === "start") {
          return (
            <group key={i}>
              <RoundedBox args={[1.6, 0.7, 1.6]} radius={0.14} position={[s.x, 0.35, 0]}>
                <meshStandardMaterial color="#fffdf8" roughness={0.5} />
              </RoundedBox>
              <Label color={COLORS.request} x={s.x} y={2.9}>
                <b style={{ color: COLORS.request }}>{trace.method}</b> {trace.url.length > 34 ? trace.url.slice(0, 34) + "…" : trace.url}
              </Label>
            </group>
          );
        }
        if (s.kind === "end") {
          const c = statusColor(trace.status);
          return (
            <group key={i}>
              <RoundedBox args={[1.6, 1.2, 1.6]} radius={0.18} position={[s.x, 0.6, 0]}>
                <meshStandardMaterial color={reached ? c : "#bdb6a8"} emissive={reached ? c : "#000"} emissiveIntensity={reached ? 0.4 : 0} />
              </RoundedBox>
              <Label color={c} x={s.x} y={2.4} dim={!reached}>
                {trace.status === "timeout" ? "⏱ no response" : `HTTP ${trace.status}`}
              </Label>
            </group>
          );
        }
        const step = s.step!;
        if (step.kind === "db") {
          return (
            <group key={i}>
              {/* connector from track to tower */}
              <mesh position={[s.x, 0.04, TOWER_Z / 2]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.35, Math.abs(TOWER_Z)]} />
                <meshStandardMaterial color={COLORS.db} transparent opacity={reached ? 0.7 : 0.25} />
              </mesh>
              <Tower x={s.x} step={step} lit={at === i || (reached && at > i)} />
              <Label color={COLORS.db} x={s.x} y={0.9} z={0.9} dim={!reached}>
                {step.op ?? "query"} {step.detail}
              </Label>
            </group>
          );
        }
        const color = COLORS[step.kind] ?? COLORS.router;
        return (
          <group key={i}>
            <Pillar x={s.x} color={color} height={step.kind === "router" ? 1 : 2} active={at === i} />
            <Label color={color} x={s.x} y={step.kind === "router" ? 1.6 : 2.4} dim={!reached}>
              {step.kind === "error" ? "⚠ " : ""}
              {step.name}
            </Label>
          </group>
        );
      })}
      <Traveler stations={stations} playKey={playKey} onStation={setAt} speed={speed} />
    </>
  );
}

const TARGET = new THREE.Vector3(0, 0.8, -1.2);
const VIEW_DIR = new THREE.Vector3(0, 0.62, 0.92).normalize();

// Frames the whole board for the container's aspect ratio (re-fits on resize, leaves user orbiting alone otherwise).
function FitCamera({ width }: { width: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const vHalf = THREE.MathUtils.degToRad(cam.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * (size.width / size.height));
    const fitW = (width / 2) / Math.tan(hHalf);
    const fitH = 6 / Math.tan(vHalf);
    const dist = Math.max(fitW, fitH) * 1.08;
    cam.position.copy(VIEW_DIR).multiplyScalar(dist).add(TARGET);
    cam.lookAt(TARGET);
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, width]);
  return null;
}

export function Flow3D({ trace, playKey, speed = 1.1 }: { trace: Trace; playKey: number; speed?: number }) {
  const theme = useTheme();
  const n = trace.steps.length + 2;
  const dist = Math.max(18, n * 3.1);
  return (
    <Canvas shadows camera={{ position: [0, dist * 0.62, dist * 0.92], fov: 38 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
      <FitCamera width={(n - 1) * SPACING + 5} />
      <hemisphereLight args={["#ffffff", theme === "dark" ? "#2a2622" : "#b9ab95", theme === "dark" ? 0.8 : 1.1]} />
      <directionalLight position={[6, 14, 8]} intensity={1.5} castShadow />
      <directionalLight position={[-8, 6, -6]} intensity={0.4} color="#9f8cff" />
      <World trace={trace} playKey={playKey} speed={speed} />
      <OrbitControls makeDefault enablePan={false} minDistance={6} maxDistance={80} maxPolarAngle={Math.PI / 2.15} target={[0, 0.8, -1.2]} />
    </Canvas>
  );
}
