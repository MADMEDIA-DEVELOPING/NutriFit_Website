import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, type Group, type Mesh, type MeshBasicMaterial } from 'three';
import { scrollState, stageRead } from '@/lib/scroll';
import { clamp01, damp, easeOutBack, easeOutCubic, envelope, lerp, norm, wrap } from '@/lib/math';
import { macroCardTexture, type MacroCardSpec } from '@/lib/textures';
import { Glow } from '../parts/Glow';

/** Where the act lives when there is room for it beside the copy. */
const HOME_X = 2.25;

const CARDS: Array<MacroCardSpec & { slot: [number, number, number]; yaw: number }> = [
  {
    key: 'calories',
    label: 'Calories',
    value: '1 916',
    unit: '/ 2 600 kcal',
    color: '#22C55E',
    fill: 0.74,
    slot: [0.2, 1.04, 0.34],
    yaw: -0.2,
  },
  {
    key: 'protein',
    label: 'Protein',
    value: '112',
    unit: '/ 150 g',
    color: '#38BDF8',
    fill: 0.75,
    slot: [-0.24, 0.35, 0.12],
    yaw: 0.14,
  },
  {
    key: 'carbs',
    label: 'Carbs',
    value: '186',
    unit: '/ 240 g',
    color: '#FBBF24',
    fill: 0.78,
    slot: [0.26, -0.34, -0.04],
    yaw: -0.16,
  },
  {
    key: 'fat',
    label: 'Fat',
    value: '48',
    unit: '/ 70 g',
    color: '#F472B6',
    fill: 0.69,
    slot: [-0.2, -1.03, -0.2],
    yaw: 0.18,
  },
];

/** Where the cards are born: the plate's resting spot, in this act's space. */
const FROM: [number, number, number] = [-0.4, -0.5, 0.2];

/**
 * The macro cards detach from the plate and fly forward into a dashboard, and
 * a glass of water fills beside them.
 *
 * The cards are unlit `meshBasicMaterial` on purpose — they are interface, not
 * objects, and lighting them would make the type dim as they turn.
 */
export function MacroCards() {
  const group = useRef<Group>(null);
  const cardRefs = useRef<Array<Mesh | null>>([]);

  const textures = useMemo(() => CARDS.map((card) => macroCardTexture(card)), []);

  useFrame((state, delta) => {
    const root = group.current;
    if (!root) return;

    const t = scrollState.t;
    const alive = envelope(t, 0.05, 0.7, 1.45, 1.95);
    root.visible = alive > 0.002;
    if (!root.visible) return;

    root.position.x = damp(root.position.x, scrollState.narrow ? 0 : HOME_X, 3.2, delta);
    root.position.y = scrollState.narrow ? -0.35 : 0;

    const time = state.clock.elapsedTime;
    const reduced = scrollState.reducedMotion;
    // The fly-in *is* the hero→diary transition, so it runs on `t`.
    const arrival = norm(t, 0.2, 0.95);

    for (let i = 0; i < CARDS.length; i++) {
      const mesh = cardRefs.current[i];
      if (!mesh) continue;
      const card = CARDS[i];

      // Staggered so the stack assembles top-down instead of snapping in.
      const staggered = clamp01((arrival - i * 0.07) / (1 - CARDS.length * 0.07));
      const settle = easeOutBack(staggered);
      const travel = easeOutCubic(staggered);

      const bob = reduced ? 0 : Math.sin(time * 0.7 + i * 1.35) * 0.045 * staggered;
      const sway = reduced ? 0 : Math.cos(time * 0.5 + i * 0.9) * 0.03 * staggered;

      mesh.position.set(
        lerp(FROM[0], card.slot[0], travel) + sway,
        lerp(FROM[1], card.slot[1], settle) + bob,
        // Cards overshoot toward the camera on the way in, then settle back —
        // the "flying at you" beat the journey is built around.
        lerp(FROM[2], card.slot[2], travel) + Math.sin(staggered * Math.PI) * 0.85
      );

      mesh.rotation.set(
        lerp(-0.9, 0, settle) + (reduced ? 0 : Math.sin(time * 0.6 + i) * 0.02),
        lerp(1.1, card.yaw, settle) + scrollState.pointer.x * 0.05,
        lerp(0.4, 0, settle)
      );

      const scale = lerp(0.15, 1, settle);
      mesh.scale.set(scale, scale, scale);

      const material = mesh.material as MeshBasicMaterial;
      material.opacity = alive * clamp01(staggered * 2.2);
    }
  });

  return (
    <group ref={group} position={[HOME_X, 0, 0]}>
      {CARDS.map((card, i) => (
        <mesh
          key={card.key}
          ref={(node) => {
            cardRefs.current[i] = node;
          }}
        >
          <planeGeometry args={[1.08, 0.675]} />
          <meshBasicMaterial
            map={textures[i]}
            transparent
            opacity={0}
            depthWrite={false}
            side={DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}

      <WaterGlass />

      <Glow position={[0, 0, -0.8]} scale={5} color="#0EA5E9" opacity={0.16} />
    </group>
  );
}

const BUBBLES = [0.12, 0.38, 0.61, 0.79, 0.92];

/**
 * A glass that fills as the section scrolls past.
 *
 * The app clamps its daily goal to 1 500–4 500 ml, so the fill here stops at a
 * believable 70% rather than draining to empty or topping out — a glass that
 * hits 100% would suggest the goal is a finish line.
 */
function WaterGlass() {
  const liquid = useRef<Mesh>(null);
  const bubbles = useRef<Group>(null);
  const glass = useRef<Group>(null);

  const height = 1.02;
  const maxFill = 0.86;

  useFrame((state, delta) => {
    const shell = glass.current;
    const body = liquid.current;
    if (!shell || !body) return;

    // Filling runs on the reading window, not on `t`: `t` is frozen for the
    // whole time the diary section is on screen, so a glass keyed to it would
    // be full before anyone looked and then sit still.
    const fill = easeOutCubic(norm(stageRead('trace'), 0.05, 0.75)) * 0.7;
    const filled = fill * maxFill;

    body.scale.y = Math.max(filled, 0.001);
    body.position.y = -height / 2 + filled / 2;

    const time = state.clock.elapsedTime;
    if (!scrollState.reducedMotion) {
      shell.rotation.y = damp(shell.rotation.y, scrollState.pointer.x * 0.25, 2, delta);
      shell.position.y = Math.sin(time * 0.55 + 1.2) * 0.05 - 0.32;
    }

    // Bubbles rise inside whatever water is actually there and wrap at the top.
    if (bubbles.current) {
      bubbles.current.visible = filled > 0.06;
      bubbles.current.children.forEach((bubble, i) => {
        const u = wrap(BUBBLES[i] + time * 0.22, 1);
        bubble.position.y = -height / 2 + u * filled;
        bubble.scale.setScalar(0.026 * (0.5 + u * 0.5));
      });
    }
  });

  return (
    <group ref={glass} position={[-1.32, -0.32, 0.35]}>
      {/* Glass wall — open-ended so you see straight through it. */}
      <mesh>
        <cylinderGeometry args={[0.3, 0.26, height, 32, 1, true]} />
        <meshStandardMaterial
          color="#CFE6FF"
          transparent
          opacity={0.22}
          roughness={0.04}
          metalness={0}
          side={DoubleSide}
          envMapIntensity={2.4}
          depthWrite={false}
        />
      </mesh>
      {/* Base */}
      <mesh position={[0, -height / 2 + 0.015, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.03, 32]} />
        <meshStandardMaterial
          color="#CFE6FF"
          transparent
          opacity={0.45}
          roughness={0.05}
          metalness={0}
          envMapIntensity={2.4}
        />
      </mesh>
      {/* Rim highlight. Laid flat — a torus is authored standing up in XY. */}
      <mesh position={[0, height / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.012, 8, 32]} />
        <meshStandardMaterial color="#EAF4FF" roughness={0.1} metalness={0.1} />
      </mesh>

      {/* Water */}
      <mesh ref={liquid} scale={[1, 0.001, 1]}>
        <cylinderGeometry args={[0.275, 0.245, 1, 32]} />
        <meshStandardMaterial
          color="#38BDF8"
          transparent
          opacity={0.82}
          roughness={0.12}
          metalness={0.05}
          emissive="#0B4A6F"
          emissiveIntensity={0.35}
        />
      </mesh>

      <group ref={bubbles}>
        {BUBBLES.map((seed, i) => (
          <mesh key={seed} position={[(i % 2 ? 0.08 : -0.07) * (1 + i * 0.1), 0, i * 0.02 - 0.04]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshStandardMaterial color="#E8F7FF" transparent opacity={0.7} roughness={0.1} />
          </mesh>
        ))}
      </group>

      <Glow position={[0, 0, -0.3]} scale={1.9} color="#38BDF8" opacity={0.3} />
    </group>
  );
}
