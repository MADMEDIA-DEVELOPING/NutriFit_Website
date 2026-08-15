import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import type { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { narrowScale, scrollState, stageRead } from '@/lib/scroll';
import { clamp01, damp, easeOutCubic, envelope, lerp, norm } from '@/lib/math';
import { tileTexture, type TileSpec } from '@/lib/textures';
import { Glow } from '../parts/Glow';

const HOME_X = 2.05;
const RADIUS = 1.42;
/** How far the focused tile steps out of the ring toward the viewer. */
const PUSH = 0.34;

const TILES: TileSpec[] = [
  { key: 'composer', title: 'Food Composer', caption: '~750 ingredients', glyph: 'flask', from: '#1B7A45', to: '#0F5F63' },
  { key: 'workouts', title: 'Workouts', caption: 'Sets, reps, history', glyph: 'dumbbell', from: '#5B4BC4', to: '#2E3A8C' },
  { key: 'recipes', title: 'Recipes', caption: 'Cook, then log', glyph: 'chef', from: '#B4791B', to: '#7A4B12' },
  { key: 'calculator', title: 'Calculator', caption: 'Mifflin-St Jeor', glyph: 'calculator', from: '#1E6FA8', to: '#134266' },
  { key: 'myfoods', title: 'My Foods', caption: 'Your own entries', glyph: 'bowl', from: '#A03A72', to: '#5E2148' },
  { key: 'shop', title: 'N.O.S.S. Shop', caption: 'Off-app orders', glyph: 'book', from: '#146E7C', to: '#0B3C48' },
];

/** Small vertical offsets so the ring reads as a cluster, not a turntable. */
const LIFT = [0.16, -0.12, 0.2, -0.18, 0.1, -0.14];

/**
 * The Explore act: the phone unfolds into a ring of tiles, and scrolling turns
 * the ring so each one comes to the front in turn.
 *
 * Rotating the whole ring by the focus index — rather than moving a highlight
 * around a static ring — means the focused tile is always the one facing the
 * camera square-on, so its label is always readable.
 */
export function FeatureTiles() {
  const group = useRef<Group>(null);
  const ring = useRef<Group>(null);
  const tiles = useRef<Array<Group | null>>([]);

  const textures = useMemo(() => TILES.map((tile) => tileTexture(tile)), []);

  useFrame((state, delta) => {
    const root = group.current;
    const carousel = ring.current;
    if (!root || !carousel) return;

    const t = scrollState.t;
    const alive = envelope(t, 2.3, 2.95, 3.45, 3.95);
    root.visible = alive > 0.002;
    if (!root.visible) return;

    const time = state.clock.elapsedTime;
    const reduced = scrollState.reducedMotion;

    // Emerge from where the phone was, on the opposite side of the page.
    const unfold = easeOutCubic(norm(t, 2.35, 2.95));
    const collapse = easeOutCubic(norm(t, 3.45, 3.95));

    const homeX = scrollState.narrow ? 0 : HOME_X;
    root.position.x = damp(root.position.x, lerp(homeX - 4.4, homeX, unfold), 3.2, delta);
    root.position.y = damp(
      root.position.y,
      (scrollState.narrow ? -0.2 : 0) + (reduced ? 0 : Math.sin(time * 0.5) * 0.06),
      3,
      delta
    );
    root.scale.setScalar(lerp(0.12, narrowScale(1, 0.62), unfold) * lerp(1, 0.2, collapse));

    // Focus walks 0 → 5 across the reading window, so all six get their moment
    // while the section is the one on screen.
    const focus = clamp01(norm(stageRead('explore'), 0.04, 0.92)) * (TILES.length - 1);
    const step = (Math.PI * 2) / TILES.length;
    carousel.rotation.y = damp(carousel.rotation.y, -focus * step, 3.6, delta);
    carousel.rotation.x = damp(
      carousel.rotation.x,
      -0.1 + (reduced ? 0 : scrollState.pointer.y * 0.08),
      2.4,
      delta
    );

    for (let i = 0; i < TILES.length; i++) {
      const tile = tiles.current[i];
      if (!tile) continue;

      // Ring distance to the focused index, wrapped — tile 0 and tile 5 are
      // neighbours, and without the wrap the last tile would never light up.
      const raw = Math.abs(i - focus);
      const distance = Math.min(raw, TILES.length - raw);
      const emphasis = clamp01(1 - distance);

      tile.scale.setScalar(lerp(0.82, 1.16, emphasis));
      tile.position.y = LIFT[i] + emphasis * 0.1 + (reduced ? 0 : Math.sin(time * 0.8 + i) * 0.03);

      // The focused tile steps out of the ring toward the viewer.
      const push = emphasis * PUSH;
      tile.position.x = Math.sin((i / TILES.length) * Math.PI * 2) * (RADIUS + push);
      tile.position.z = Math.cos((i / TILES.length) * Math.PI * 2) * (RADIUS + push);

      const face = tile.children[1] as Mesh | undefined;
      if (face) {
        (face.material as MeshBasicMaterial).opacity = alive * lerp(0.42, 1, emphasis);
      }
      const plate = tile.children[0] as Mesh | undefined;
      if (plate) {
        // Barely-there emissive. The backing plate is a bezel; pushed any
        // brighter it turns every tile green and swamps its own palette.
        (plate.material as MeshStandardMaterial).emissiveIntensity = lerp(0.01, 0.09, emphasis);
      }
    }
  });

  return (
    <group ref={group} position={[HOME_X, 0, 0]}>
      <group ref={ring}>
        {TILES.map((tile, i) => {
          const angle = (i / TILES.length) * Math.PI * 2;
          return (
            <group
              key={tile.key}
              ref={(node) => {
                tiles.current[i] = node;
              }}
              position={[Math.sin(angle) * RADIUS, LIFT[i], Math.cos(angle) * RADIUS]}
              rotation={[0, angle, 0]}
            >
              {/* Backing plate gives the tile real thickness and an edge. */}
              <RoundedBox args={[1.16, 1.16, 0.07]} radius={0.11} smoothness={4}>
                {/* Low metalness on purpose: the rig's green rim light is
                    strong, and a metallic bezel mirrors it hard enough to turn
                    every tile green regardless of its own gradient. */}
                <meshStandardMaterial
                  color="#0E1729"
                  roughness={0.62}
                  metalness={0.15}
                  emissive="#2BD37A"
                  emissiveIntensity={0.01}
                />
              </RoundedBox>
              <mesh position={[0, 0, 0.038]}>
                <planeGeometry args={[1.06, 1.06]} />
                <meshBasicMaterial
                  map={textures[i]}
                  transparent
                  opacity={0}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            </group>
          );
        })}
      </group>

      <Glow position={[0, 0, 0]} scale={5.6} color="#22C55E" opacity={0.14} />
    </group>
  );
}
