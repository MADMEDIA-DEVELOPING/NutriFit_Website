import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import {
  AdditiveBlending,
  DoubleSide,
  Shape,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
} from 'three';
import { scrollState } from '@/lib/scroll';
import { clamp01, damp, easeOutBack, easeOutCubic, envelope, lerp, norm } from '@/lib/math';
import {
  barcodeTexture,
  createLiveLabel,
  dashboardScreenTexture,
  scanScreenTexture,
} from '@/lib/textures';
import { Glow } from '../parts/Glow';

const HOME_X = -2.25;

/**
 * The act's slice of the journey, in `scrollState.t` units: it assembles across
 * the diary→scan handover and disassembles across scan→explore. Everything that
 * happens *while* the section is being read runs on `stageRead('scan')`
 * instead, because `t` is deliberately frozen for that whole stretch.
 */
const IN = 1.3;
const OUT = 2.95;

/**
 * The scanning act: the dashboard folds into a phone, an iris opens over the
 * screen, and three things drift through the viewfinder and get read.
 *
 * The three items are the three code paths the app actually has — a packaged
 * product with a barcode, a cooked dish that only a photo can describe, and a
 * whole food. Their readouts type themselves at different speeds because the
 * lookups genuinely take different amounts of time.
 */
export function PhoneScan() {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    const root = group.current;
    if (!root) return;
    const alive = envelope(scrollState.t, IN, 1.95, 2.4, OUT);
    root.visible = alive > 0.002;
    if (!root.visible) return;
    root.position.x = damp(root.position.x, scrollState.narrow ? 0 : HOME_X, 3.2, delta);
    root.position.y = scrollState.narrow ? -0.2 : 0;
  });

  return (
    <group ref={group} position={[HOME_X, 0, 0]}>
      <Phone />

      {/* One item per code path the app really has: a packaged product with a
          barcode, a cooked dish only a photo can describe, and a whole food. */}
      <ScanItem
        slot={[-1.2, 1.0, 0.8]}
        enterAt={0.1}
        scanAt={0.3}
        title="Skyr natural 0%"
        lines={['Open Food Facts · 5941…', '63 kcal · P 10 g · C 4 g · F 0.2 g']}
      >
        <BarcodeBox />
      </ScanItem>

      <ScanItem
        slot={[-1.55, 0.05, 1.0]}
        enterAt={0.26}
        scanAt={0.48}
        title="Pizza margherita"
        lines={['Photo AI · Gemini · 1 slice', '272 kcal · P 11 g · C 33 g · F 10 g']}
      >
        <PizzaSlice />
      </ScanItem>

      <ScanItem
        slot={[-1.15, -0.9, 0.7]}
        enterAt={0.42}
        scanAt={0.64}
        title="Banana, medium"
        lines={['USDA FoodData Central · 118 g', '105 kcal · P 1.3 g · C 27 g · F 0.4 g']}
      >
        <Banana />
      </ScanItem>

      <Glow position={[0, 0, -1]} scale={6} color="#22C55E" opacity={0.16} />
    </group>
  );
}

/* ── The device ────────────────────────────────────────────────────────── */

const BLADES = 6;

function Phone() {
  const body = useRef<Group>(null);
  const dashboard = useRef<Mesh>(null);
  const scan = useRef<Mesh>(null);
  const iris = useRef<Group>(null);
  const sweep = useRef<Mesh>(null);

  const dashboardMap = useMemo(() => dashboardScreenTexture(), []);
  const scanMap = useMemo(() => scanScreenTexture(), []);

  useFrame((state, delta) => {
    const root = body.current;
    if (!root) return;

    const t = scrollState.t;
    const time = state.clock.elapsedTime;
    const reduced = scrollState.reducedMotion;

    // Arrival: the dashboard's flat plane rotates into a solid device.
    const arrive = easeOutBack(norm(t, IN, IN + 0.55));
    // Departure: the device is what the Explore tiles unfold from, so it
    // shrinks into the point they emerge from rather than fading in place.
    const leave = easeOutCubic(norm(t, 2.66, OUT));

    const scale = lerp(0.2, 1, arrive) * lerp(1, 0.12, leave);
    root.scale.setScalar(scale);

    root.rotation.y = damp(
      root.rotation.y,
      lerp(-1.15, -0.16, arrive) + scrollState.pointer.x * 0.16 + leave * 1.6,
      3,
      delta
    );
    root.rotation.x = damp(
      root.rotation.x,
      lerp(0.5, 0.06, arrive) - scrollState.pointer.y * 0.1,
      3,
      delta
    );
    root.rotation.z = lerp(0.35, 0, arrive);
    root.position.y = (reduced ? 0 : Math.sin(time * 0.62) * 0.06) + leave * 0.6;

    // Screens cross-fade: the diary you just read about becomes the scanner.
    const toScan = norm(t, 1.78, 2.05);
    if (dashboard.current) {
      (dashboard.current.material as MeshBasicMaterial).opacity = (1 - toScan) * arrive;
    }
    if (scan.current) {
      (scan.current.material as MeshBasicMaterial).opacity = toScan * (1 - leave);
    }

    // Iris: six blades retracting outward and spinning as they go.
    //
    // It floats in front of the device rather than masking the screen. A true
    // shutter would need the blades to overlap at the centre and still clear
    // the phone's silhouette when open, and no blade size satisfies both — so
    // this is an aperture in space, and the screen cross-fade does the reveal.
    if (iris.current) {
      const open = easeOutCubic(norm(t, 1.8, 2.16));
      iris.current.visible = open < 0.99 && arrive > 0.2;
      iris.current.rotation.z = open * 1.1;
      iris.current.children.forEach((blade, i) => {
        const angle = (i / BLADES) * Math.PI * 2;
        const radius = lerp(0.04, 0.62, open);
        blade.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
        blade.rotation.z = angle + Math.PI / 2;
        const material = (blade as Mesh).material as MeshBasicMaterial;
        // Blades are solid while closed and burn off to nothing once open.
        material.opacity = (1 - open * open) * 0.92;
      });
    }

    // A green bar sweeping the screen once the scanner is live.
    if (sweep.current) {
      const live = norm(t, 2.05, 2.6) * (1 - leave);
      sweep.current.visible = live > 0.02;
      const cycle = reduced ? 0.5 : (time * 0.5) % 1;
      sweep.current.position.y = lerp(1.15, -1.15, cycle);
      (sweep.current.material as MeshBasicMaterial).opacity =
        live * 0.55 * Math.sin(cycle * Math.PI);
    }
  });

  return (
    <group ref={body}>
      {/* Chassis */}
      <RoundedBox args={[1.44, 2.94, 0.17]} radius={0.16} smoothness={5}>
        <meshStandardMaterial color="#18233B" roughness={0.34} metalness={0.72} />
      </RoundedBox>
      {/* Bezel highlight */}
      <RoundedBox args={[1.36, 2.86, 0.18]} radius={0.14} smoothness={5}>
        <meshStandardMaterial color="#070C16" roughness={0.18} metalness={0.4} />
      </RoundedBox>

      {/* Screens, stacked and cross-faded. */}
      <mesh ref={dashboard} position={[0, 0, 0.096]}>
        <planeGeometry args={[1.3, 2.72]} />
        <meshBasicMaterial map={dashboardMap} transparent opacity={0} toneMapped={false} />
      </mesh>
      <mesh ref={scan} position={[0, 0, 0.098]}>
        <planeGeometry args={[1.3, 2.72]} />
        <meshBasicMaterial map={scanMap} transparent opacity={0} toneMapped={false} />
      </mesh>

      {/* Scan sweep */}
      <mesh ref={sweep} position={[0, 0, 0.104]}>
        <planeGeometry args={[1.3, 0.34]} />
        <meshBasicMaterial
          color="#22C55E"
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Iris blades, floating a little proud of the glass. */}
      <group ref={iris} position={[0, 0, 0.62]}>
        {Array.from({ length: BLADES }, (_, i) => (
          <mesh key={i}>
            <planeGeometry args={[0.78, 0.42]} />
            <meshBasicMaterial
              color="#101C33"
              transparent
              opacity={0.92}
              side={DoubleSide}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      {/* Aperture ring — the part of the iris that stays once it is open. */}
      <mesh position={[0, 0, 0.6]}>
        <ringGeometry args={[0.66, 0.7, 48]} />
        <meshBasicMaterial
          color="#22C55E"
          transparent
          opacity={0.35}
          side={DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Front camera pip and speaker slot. */}
      <mesh position={[0.42, 1.28, 0.1]}>
        <circleGeometry args={[0.045, 20]} />
        <meshStandardMaterial color="#05080F" roughness={0.1} metalness={0.9} />
      </mesh>
    </group>
  );
}

/* ── Items that drift through the viewfinder ───────────────────────────── */

interface ScanItemProps {
  slot: [number, number, number];
  enterAt: number;
  scanAt: number;
  title: string;
  lines: string[];
  children: ReactNode;
}

/**
 * One object floating into frame, its reticle, and the readout that types
 * itself once the reticle locks on.
 */
function ScanItem({ slot, enterAt, scanAt, title, lines, children }: ScanItemProps) {
  const holder = useRef<Group>(null);
  const reticle = useRef<Group>(null);
  const label = useRef<Mesh>(null);
  const painted = useRef(-1);

  const live = useMemo(() => createLiveLabel(640, 300), []);
  useEffect(() => live.dispose, [live]);

  const totalChars = useMemo(
    () => title.length + lines.reduce((sum, line) => sum + line.length, 0),
    [title, lines]
  );

  useFrame((state, delta) => {
    const root = holder.current;
    if (!root) return;

    const t = scrollState.t;
    const time = state.clock.elapsedTime;
    const reduced = scrollState.reducedMotion;

    const enter = easeOutCubic(norm(t, enterAt, enterAt + 0.3));
    const exit = easeOutCubic(norm(t, 2.62, OUT));
    root.visible = enter > 0.01 && exit < 0.98;
    if (!root.visible) return;

    const drift = reduced ? 0 : Math.sin(time * 0.7 + slot[1]) * 0.06;
    const swirl = reduced ? 0 : Math.cos(time * 0.5 + slot[0]) * 0.05;

    root.position.set(
      lerp(slot[0] - 2.2, slot[0], enter) + swirl,
      lerp(slot[1] - 0.5, slot[1], enter) + drift,
      lerp(slot[2] - 1.4, slot[2], enter)
    );
    root.scale.setScalar(lerp(0.3, 1, enter) * lerp(1, 0.2, exit));
    if (!reduced) {
      root.rotation.y += delta * 0.35;
      root.rotation.z = Math.sin(time * 0.4 + slot[0]) * 0.08;
    }

    // Lock-on pulse: the reticle snaps in, flashes, and stays as a thin frame.
    const lock = norm(t, scanAt, scanAt + 0.14);
    if (reticle.current) {
      reticle.current.visible = lock > 0.01;
      const snap = easeOutBack(lock);
      reticle.current.scale.setScalar(lerp(1.7, 1, snap));
      const pulse = reduced ? 0.6 : 0.55 + Math.sin(time * 4.5) * 0.25;
      reticle.current.children.forEach((arm) => {
        const material = (arm as Mesh).material as MeshBasicMaterial;
        material.opacity = lock * (lock < 1 ? 1 : pulse);
      });
    }

    // Readout, one character at a time, only repainted when the count changes.
    if (label.current) {
      const typing = norm(t, scanAt + 0.05, scanAt + 0.34);
      const chars = Math.round(typing * totalChars);
      if (chars !== painted.current) {
        painted.current = chars;
        live.paint(title, lines, chars);
      }
      const material = label.current.material as MeshBasicMaterial;
      material.opacity = clamp01(typing * 3) * (1 - exit);
      label.current.visible = material.opacity > 0.02;
      label.current.position.y = -0.52 - drift * 0.5;
    }
  });

  return (
    <group ref={holder} position={slot}>
      {children}

      {/* Four corner brackets, each an L of two thin bars.
          Flat list, not a group per corner: the frame loop walks
          `reticle.children` setting material opacity, and a nested group has no
          material to set. */}
      <group ref={reticle}>
        {BRACKET_BARS.map((bar, i) => (
          <mesh key={i} position={bar.position}>
            <planeGeometry args={bar.size} />
            <meshBasicMaterial
              color="#22C55E"
              transparent
              opacity={0}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {/* Typed nutrition readout */}
      <mesh ref={label} position={[0, -0.52, 0.36]}>
        <planeGeometry args={[1.02, 0.478]} />
        <meshBasicMaterial
          map={live.texture}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** The eight bars that make up the four corner brackets, pre-placed. */
const BRACKET_BARS: Array<{
  position: [number, number, number];
  size: [number, number];
}> = ([
  [-1, 1],
  [1, 1],
  [-1, -1],
  [1, -1],
] as Array<[number, number]>).flatMap(([sx, sy]) => [
  {
    position: [sx * 0.44 - sx * 0.09, sy * 0.44, 0.34] as [number, number, number],
    size: [0.2, 0.028] as [number, number],
  },
  {
    position: [sx * 0.44, sy * 0.44 - sy * 0.09, 0.34] as [number, number, number],
    size: [0.028, 0.2] as [number, number],
  },
]);

/* ── The three props ───────────────────────────────────────────────────── */

function BarcodeBox() {
  const map = useMemo(() => barcodeTexture(), []);
  return (
    <group>
      <RoundedBox args={[0.62, 0.46, 0.26]} radius={0.04} smoothness={3}>
        <meshStandardMaterial color="#E7EDF7" roughness={0.55} metalness={0.02} />
      </RoundedBox>
      <mesh position={[0, 0, 0.132]}>
        <planeGeometry args={[0.34, 0.34]} />
        <meshBasicMaterial map={map} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.16, 0.132]}>
        <planeGeometry args={[0.5, 0.09]} />
        <meshBasicMaterial color="#22C55E" toneMapped={false} />
      </mesh>
    </group>
  );
}

function PizzaSlice() {
  const shape = useMemo(() => {
    const wedge = new Shape();
    wedge.moveTo(0, 0);
    wedge.lineTo(0.66, 0.3);
    wedge.quadraticCurveTo(0.76, 0, 0.66, -0.3);
    wedge.lineTo(0, 0);
    return wedge;
  }, []);

  return (
    <group rotation={[-0.5, 0, 0.35]}>
      <mesh>
        <extrudeGeometry args={[shape, { depth: 0.07, bevelEnabled: false, curveSegments: 8 }]} />
        <meshStandardMaterial color="#EFC066" roughness={0.72} />
      </mesh>
      {/* Crust ridge along the outer edge. */}
      <mesh position={[0.68, 0, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.075, 0.075, 0.62, 12]} />
        <meshStandardMaterial color="#D9A048" roughness={0.8} />
      </mesh>
      {[
        [0.3, 0.07],
        [0.46, -0.08],
        [0.24, -0.09],
      ].map(([x, y]) => (
        <mesh key={`${x}:${y}`} position={[x, y, 0.078]}>
          <cylinderGeometry args={[0.055, 0.055, 0.02, 12]} />
          <meshStandardMaterial color="#C8402C" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function Banana() {
  return (
    <group rotation={[0.2, 0, -0.5]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.34, 0.095, 10, 22, Math.PI * 0.95]} />
        <meshStandardMaterial color="#F0C93F" roughness={0.6