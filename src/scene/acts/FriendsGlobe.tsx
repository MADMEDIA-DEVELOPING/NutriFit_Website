import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Points,
  PointsMaterial,
  QuadraticBezierCurve3,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type Sprite,
} from 'three';
import { scrollState, stageRead } from '@/lib/scroll';
import { clamp01, damp, easeOutBack, easeOutCubic, envelope, lerp, norm, wrap } from '@/lib/math';
import { chatBubbleTexture, dotTexture, logoTexture } from '@/lib/textures';
import { Glow } from '../parts/Glow';

const HOME_X = -2.25;
const R = 1.5;

/** Pin placement in spherical coords, all on the hemisphere facing the camera. */
const PINS: Array<{ theta: number; phi: number }> = [
  { theta: -0.36, phi: 1.06 },
  { theta: 0.26, phi: 0.86 },
  { theta: 0.62, phi: 1.36 },
  { theta: -0.72, phi: 1.5 },
  { theta: 0.06, phi: 1.76 },
  { theta: -0.12, phi: 0.56 },
];

const CONNECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [0, 3],
  [1, 4],
  [0, 5],
  [2, 4],
];

const ARC_SEGMENTS = 56;
const SURFACE_DOTS = 620;

const onSphere = (theta: number, phi: number, radius: number): Vector3 =>
  new Vector3(
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.cos(theta)
  );

/**
 * The social act: the Explore tiles converge into a globe, friend pins pop up
 * on its surface, and the connections between them draw themselves.
 *
 * The arcs are plain `THREE.Line` objects whose draw range grows over the
 * section. It is the one technique that genuinely draws a curve from one end
 * to the other — dashed-material tricks reveal the whole segment at once, and
 * rebuilding the geometry per frame would allocate on every tick.
 */
export function FriendsGlobe() {
  const group = useRef<Group>(null);
  const globe = useRef<Group>(null);
  const pins = useRef<Array<Sprite | null>>([]);
  const packets = useRef<Array<Sprite | null>>([]);
  const bubble = useRef<Mesh>(null);
  const dots = useRef<Points>(null);

  const pinPositions = useMemo(
    () => PINS.map((pin) => onSphere(pin.theta, pin.phi, R * 1.04)),
    []
  );

  const arcs = useMemo(
    () =>
      CONNECTIONS.map(([a, b]) => {
        const start = pinPositions[a];
        const end = pinPositions[b];
        // Lift the control point off the surface in proportion to how far the
        // two pins are apart, so short hops stay tight and long ones bow out.
        const mid = start
          .clone()
          .add(end)
          .normalize()
          .multiplyScalar(R * (1 + 0.22 * (start.distanceTo(end) / R)));
        const curve = new QuadraticBezierCurve3(start.clone(), mid, end.clone());
        const geometry = new BufferGeometry().setFromPoints(curve.getPoints(ARC_SEGMENTS));
        geometry.setDrawRange(0, 0);

        const material = new LineBasicMaterial({
          color: 0xdcecff,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
        });

        // A `THREE.Line` is one hardware pixel wide on every platform that
        // matters, which all but disappears against the globe. Drawing a run of
        // dots over the *same geometry* — so it shares the draw range and grows
        // in step — gives the connection real weight for the cost of one extra
        // draw call and no extra vertices.
        const beadMaterial = new PointsMaterial({
          map: dotTexture(),
          color: 0xbfe6ff,
          size: 0.05,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          sizeAttenuation: true,
          toneMapped: false,
        });

        return {
          line: new Line(geometry, material),
          beads: new Points(geometry, beadMaterial),
          curve,
          material,
          beadMaterial,
          geometry,
        };
      }),
    [pinPositions]
  );

  useEffect(
    () => () =>
      arcs.forEach((arc) => {
        arc.geometry.dispose();
        arc.material.dispose();
        arc.beadMaterial.dispose();
      }),
    [arcs]
  );

  // Fibonacci sphere — the cheapest way to get points that look evenly spread
  // without the pole clustering a naive lat/lon grid produces.
  const dotGeometry = useMemo(() => {
    const positions = new Float32Array(SURFACE_DOTS * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < SURFACE_DOTS; i++) {
      const y = 1 - (i / (SURFACE_DOTS - 1)) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      positions[i * 3] = Math.cos(theta) * radius * R * 1.01;
      positions[i * 3 + 1] = y * R * 1.01;
      positions[i * 3 + 2] = Math.sin(theta) * radius * R * 1.01;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    return geometry;
  }, []);

  useEffect(() => () => dotGeometry.dispose(), [dotGeometry]);

  const logo = useMemo(() => logoTexture(), []);
  const dot = useMemo(() => dotTexture(), []);
  const bubbleMap = useMemo(() => chatBubbleTexture('Andrei', 'Track at 19:00? 5k easy.'), []);

  useFrame((state, delta) => {
    const root = group.current;
    const ball = globe.current;
    if (!root || !ball) return;

    const t = scrollState.t;
    const read = stageRead('social');
    const alive = envelope(t, 3.3, 3.95, 4.45, 4.95);
    root.visible = alive > 0.002;
    if (!root.visible) return;

    const time = state.clock.elapsedTime;
    const reduced = scrollState.reducedMotion;

    const form = easeOutCubic(norm(t, 3.35, 3.95));
    const leave = easeOutCubic(norm(t, 4.45, 4.95));

    const homeX = scrollState.narrow ? 0 : HOME_X;
    root.position.x = damp(root.position.x, lerp(homeX + 4.4, homeX, form), 3.2, delta);
    root.scale.setScalar(lerp(0.1, scrollState.narrow ? 0.72 : 1, form) * lerp(1, 0.25, leave));
    root.position.y =
      (scrollState.narrow ? -0.25 : 0) + (reduced ? 0 : Math.sin(time * 0.45) * 0.07);

    if (!reduced) ball.rotation.y += delta * 0.055;
    ball.rotation.x = damp(ball.rotation.x, -0.18 + scrollState.pointer.y * 0.1, 2.2, delta);

    if (dots.current) {
      (dots.current.material as PointsMaterial).opacity = alive * 0.55 * form;
    }

    // Pins pop, staggered, then the arcs draw between them — all on the
    // reading window, so the connections build while you read about them.
    for (let i = 0; i < PINS.length; i++) {
      const pin = pins.current[i];
      if (!pin) continue;
      const appear = easeOutBack(clamp01(norm(read, 0.04 + i * 0.04, 0.16 + i * 0.04)));
      const bob = reduced ? 1 : 1 + Math.sin(time * 2 + i * 1.7) * 0.05;
      pin.scale.setScalar(0.3 * appear * bob * (1 - leave));
      pin.visible = appear > 0.01;
    }

    for (let i = 0; i < arcs.length; i++) {
      const arc = arcs[i];
      const draw = easeOutCubic(clamp01(norm(read, 0.3 + i * 0.045, 0.48 + i * 0.045)));
      arc.geometry.setDrawRange(0, Math.round(draw * (ARC_SEGMENTS + 1)));
      arc.material.opacity = 0.85 * alive * (1 - leave);
      arc.beadMaterial.opacity = 0.9 * alive * (1 - leave);

      // A packet of light running the finished route, so the connections read
      // as live traffic rather than as static wires.
      const packet = packets.current[i];
      if (packet) {
        packet.visible = draw > 0.98 && leave < 0.6;
        if (packet.visible) {
          const u = wrap(time * 0.28 + i * 0.17, 1);
          packet.position.copy(arc.curve.getPoint(u));
          packet.scale.setScalar(0.13 * Math.sin(u * Math.PI));
        }
      }
    }

    if (bubble.current) {
      const show = norm(read, 0.62, 0.78);
      const material = bubble.current.material as MeshBasicMaterial;
      material.opacity = show * alive * (1 - leave);
      bubble.current.visible = material.opacity > 0.02;
      bubble.current.position.y = 1.18 + (reduced ? 0 : Math.sin(time * 0.9) * 0.05);
      bubble.current.scale.setScalar(lerp(0.7, 1, easeOutBack(show)));
    }
  });

  return (
    <group ref={group} position={[HOME_X, 0, 0]}>
      <group ref={globe}>
        {/* Body — opaque, so the dots on the far side are properly hidden. */}
        <mesh>
          <sphereGeometry args={[R * 0.985, 48, 32]} />
          <meshStandardMaterial
            color="#0A1122"
            roughness={0.85}
            metalness={0.15}
            emissive="#0C2C48"
            emissiveIntensity={0.35}
          />
        </mesh>

        {/* Surface dots */}
        <points ref={dots} geometry={dotGeometry}>
          <pointsMaterial
            map={dot}
            size={0.045}
            color="#5FD6FF"
            transparent
            opacity={0}
            depthWrite={false}
            sizeAttenuation
            toneMapped={false}
          />
        </points>

        {/* Graticule shell */}
        <mesh>
          <icosahedronGeometry args={[R * 1.03, 3]} />
          <meshBasicMaterial
            color="#1E3A5F"
            wireframe
            transparent
            opacity={0.16}
            depthWrite={false}
          />
        </mesh>

        {/* Friend pins, each carrying the brand mark. */}
        {pinPositions.map((position, i) => (
          <sprite
            key={i}
            ref={(node) => {
              pins.current[i] = node;
            }}
            position={position}
            scale={[0.001, 0.001, 0.001]}
          >
            <spriteMaterial map={logo} transparent depthWrite={false} toneMapped={false} />
          </sprite>
        ))}

        {/* Connections: a hairline and a run of beads over one shared geometry. */}
        {arcs.map((arc, i) => (
          <primitive key={`arc-${i}`} object={arc.line} />
        ))}
        {arcs.map((arc, i) => (
          <primitive key={`beads-${i}`} object={arc.beads} />
        ))}

        {/* Traffic along the connections */}
        {arcs.map((_, i) => (
          <sprite
            key={`packet-${i}`}
            ref={(node) => {
              packets.current[i] = node;
            }}
            scale={[0.001, 0.001, 0.001]}
          >
            <spriteMaterial
              map={dot}
              color="#7CF7B0"
              transparent
              opacity={0.95}
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </sprite>
        ))}
      </group>

      {/* Chat bubble — outside the globe group, so it stays legible while the
          sphere turns underneath it. */}
      <mesh ref={bubble} position={[1.15, 1.18, 0.95]}>
        <planeGeometry args={[1.24, 0.62]} />
        <meshBasicMaterial
          map={bubbleMap}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <Glow position={[0, 0, -0.6]} scale={6.4} color="#38BDF8" opacity={0.2} />
    </group>
  );
}
