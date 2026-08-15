import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import type { Group } from 'three';
import { narrowScale, scrollState } from '@/lib/scroll';
import { damp, easeOutCubic, envelope, lerp, norm } from '@/lib/math';
import { GroundGlow } from '../parts/Glow';

/** Where the plate rests during the hero, before the diary pulls it away. */
const HOME: [number, number, number] = [1.95, -1.12, 0];

/**
 * The hero plate: ceramic dish, grilled chicken, avocado, rice, broccoli and
 * two tomatoes. Everything is primitive geometry — a plate that had to be
 * downloaded as a GLB would push the first frame past the point where people
 * scroll away.
 *
 * From the diary section onward it is pulled back and down, deep enough into
 * the fog to disappear on its own rather than being switched off.
 */
export function FoodPlate() {
  const group = useRef<Group>(null);
  const spin = useRef<Group>(null);
  const tilt = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const root = group.current;
    const platter = spin.current;
    if (!root || !platter) return;

    const t = scrollState.t;
    const alive = envelope(t, -1, -0.95, 0.25, 0.92);
    root.visible = alive > 0.001;
    if (!root.visible) return;

    const time = state.clock.elapsedTime;
    const reduced = scrollState.reducedMotion;

    // 0 in the hero, 1 once the diary has taken the plate away. This runs on
    // `t` rather than the reading window because the exit *is* the transition
    // between the two sections.
    const recede = easeOutCubic(norm(t, 0.22, 0.9));

    // On narrow screens the copy sits over the scene, so the plate drops below
    // the text block — far enough to clear the download buttons and badges,
    // into the empty band above the scroll hint.
    const homeX = scrollState.narrow ? 0 : HOME[0];
    const homeY = HOME[1] + (scrollState.narrow ? -2.0 : 0);
    const float = reduced ? 0 : Math.sin(time * 0.6) * 0.09;

    root.position.x = damp(root.position.x, lerp(homeX, homeX * 0.4, recede), 3, delta);
    root.position.y = damp(root.position.y, homeY + float + recede * 1.1, 3, delta);
    // Far enough back that the fog finishes the job — no opacity bookkeeping.
    root.position.z = damp(root.position.z, lerp(HOME[2], -17, recede), 3, delta);

    const scale = lerp(narrowScale(0.92, 0.5), 0.2, recede);
    root.scale.setScalar(damp(root.scale.x || scale, scale, 3, delta));

    // Slow turntable, accelerating as it leaves so the exit reads as motion
    // rather than as the object simply getting smaller.
    if (!reduced) {
      platter.rotation.y += delta * (0.16 + recede * 1.8);
    }

    // The plate leans toward the pointer — a small, damped tilt that sells the
    // "camera walking around it" idea without ever losing the composition.
    const strength = (1 - recede) * (scrollState.narrow ? 0.4 : 1);
    tilt.current.x = damp(tilt.current.x, scrollState.pointer.y * 0.16 * strength, 2.2, delta);
    tilt.current.y = damp(tilt.current.y, scrollState.pointer.x * 0.2 * strength, 2.2, delta);
    // The 3/4 view comes from the camera sitting above the plate; tilting the
    // dish as well only turns it edge-on and hides the food on it.
    platter.rotation.x = tilt.current.x + (reduced ? 0 : Math.sin(time * 0.45) * 0.03);
    platter.rotation.z = tilt.current.y * 0.5;
  });

  return (
    <group ref={group} position={HOME}>
      <group ref={spin}>
        {/* Plate: shallow well plus a raised rim.
            A torus is authored in the XY plane, so it needs laying down —
            without the rotation the rim stands up like a hoop around the dish. */}
        <mesh>
          <cylinderGeometry args={[1.34, 1.18, 0.1, 64]} />
          <meshStandardMaterial
            color="#EEF3FB"
            roughness={0.55}
            metalness={0}
            envMapIntensity={0.35}
          />
        </mesh>
        <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.31, 0.07, 12, 64]} />
          <meshStandardMaterial
            color="#F8FBFF"
            roughness={0.4}
            metalness={0}
            envMapIntensity={0.5}
          />
        </mesh>
        <mesh position={[0, 0.056, 0]}>
          <cylinderGeometry args={[1.2, 1.14, 0.02, 48]} />
          <meshStandardMaterial
            color="#E2E9F5"
            roughness={0.62}
            metalness={0}
            envMapIntensity={0.3}
          />
        </mesh>

        {/* Rice — a low mound with a scatter of grains on top. */}
        <group position={[-0.52, 0.12, 0.28]}>
          <mesh scale={[1, 0.46, 0.86]}>
            <sphereGeometry args={[0.44, 24, 16]} />
            <meshStandardMaterial color="#F6F1E3" roughness={0.85} metalness={0} />
          </mesh>
          {RICE_GRAINS.map((grain, i) => (
            <mesh key={i} position={grain.position} rotation={grain.rotation} scale={[1, 0.42, 0.42]}>
              <sphereGeometry args={[0.055, 8, 6]} />
              <meshStandardMaterial color="#FBF7EC" roughness={0.9} />
            </mesh>
          ))}
        </group>

        {/* Grilled chicken breast with char marks. */}
        <group position={[0.42, 0.16, -0.18]} rotation={[0, -0.34, 0]}>
          <RoundedBox args={[0.86, 0.2, 0.5]} radius={0.09} smoothness={4}>
            <meshStandardMaterial color="#C98B4D" roughness={0.62} metalness={0.02} />
          </RoundedBox>
          {[-0.24, 0, 0.24].map((offset) => (
            <mesh key={offset} position={[offset, 0.105, 0]} rotation={[0, 0.28, 0]}>
              <boxGeometry args={[0.05, 0.012, 0.44]} />
              <meshStandardMaterial color="#5C3416" roughness={0.9} />
            </mesh>
          ))}
        </group>

        {/* Avocado half: skin, flesh and pit. */}
        <group position={[0.1, 0.13, 0.6]} rotation={[0, 0.5, 0]}>
          <mesh scale={[1, 0.52, 0.7]}>
            <sphereGeometry args={[0.36, 24, 16]} />
            <meshStandardMaterial color="#37502C" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.095, 0]} scale={[1, 0.5, 0.7]}>
            <sphereGeometry args={[0.33, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#C7DC72" roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.13, 0]}>
            <sphereGeometry args={[0.13, 16, 12]} />
            <meshStandardMaterial color="#7A5230" roughness={0.5} metalness={0.06} />
          </mesh>
        </group>

        {/* Broccoli floret. */}
        <group position={[-0.18, 0.16, -0.55]}>
          <mesh position={[0, -0.06, 0]}>
            <cylinderGeometry args={[0.07, 0.09, 0.2, 10]} />
            <meshStandardMaterial color="#B9D69A" roughness={0.8} />
          </mesh>
          {BROCCOLI.map((bud, i) => (
            <mesh key={i} position={bud.position} scale={bud.scale}>
              <sphereGeometry args={[0.15, 12, 10]} />
              <meshStandardMaterial color="#3F8B4C" roughness={0.9} />
            </mesh>
          ))}
        </group>

        {/* Cherry tomatoes. */}
        {[
          [0.78, 0.16, 0.45],
          [-0.72, 0.16, -0.32],
        ].map((position) => (
          <mesh key={position.join()} position={position as [number, number, number]}>
            <sphereGeometry args={[0.16, 20, 14]} />
            <meshStandardMaterial color="#DE4B36" roughness={0.24} metalness={0.05} />
          </mesh>
        ))}

        {/* A pinch of olive oil sheen over the whole dish. */}
        <GroundGlow position={[0, 0.09, 0]} scale={3.4} color="#22C55E" opacity={0.16} />
      </group>

      {/* Both glows are fogged like everything else, so they dim on their own
          as the plate recedes — no opacity bookkeeping needed. */}
      <GroundGlow position={[0, -0.42, 0]} scale={5.2} color="#0EA5E9" opacity={0.3} />
    </group>
  );
}

/** Fixed scatter — a random one would shuffle on every hot reload. */
const RICE_GRAINS = [
  { position: [0.12, 0.19, 0.04], rotation: [0, 0.6, 0.2] },
  { position: [-0.14, 0.18, 0.1], rotation: [0, -0.4, 0.1] },
  { position: [0.02, 0.2, -0.12], rotation: [0, 1.2, -0.15] },
  { position: [0.2, 0.16, -0.08], rotation: [0, 0.2, 0.3] },
  { position: [-0.2, 0.16, -0.06], rotation: [0, -1.1, -0.2] },
  { position: [0.06, 0.19, 0.16], rotation: [0, 0.9, 0.05] },
] as Array<{ position: [number, number, number]; rotation: [number, number, number] }>;

const BROCCOLI = [
  { position: [0, 0.12, 0], scale: [1, 0.9, 1] },
  { position: [0.14, 0.06, 0.05], scale: [0.75, 0.7, 0.75] },
  { position: [-0.13, 0.07, -0.04], scale: [0.8, 0.72, 0.8] },
  { position: [0.02, 0.08, -0.14], scale: [0.7, 0.65, 0.7] },
] as Array<{ position: [number, number, number]; scale: [number, number, number] }>;
