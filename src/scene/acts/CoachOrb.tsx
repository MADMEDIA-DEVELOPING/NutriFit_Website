import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Line,
  LineBasicMaterial,
  QuadraticBezierCurve3,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type PerspectiveCamera,
  type Points,
  type PointsMaterial,
} from 'three';
import { scrollState } from '@/lib/scroll';
import { clamp, clamp01, damp, easeOutBack, easeOutCubic, envelope, lerp, norm, wrap } from '@/lib/math';
import { COACH } from '@/lib/content';
import { dotTexture, messageTexture } from '@/lib/textures';
import { Glow } from '../parts/Glow';

/**
 * Where each data stream comes from — deliberately the directions the previous
 * acts occupied, so the orb visibly eats the rest of the page. Macros arrived
 * on the right, the scanner on the left, the tiles on the right, the globe on
 * the left; steps and water come in from above and below.
 */
const STREAMS: Array<{ from: [number, number, number]; speed: number; color: string }> = [
  { from: [3.6, 1.5, -1.2], speed: 0.22, color: '#22C55E' },
  { from: [-3.8, 1.1, -0.8], speed: 0.27, color: '#38BDF8' },
  { from: [3.4, -1.6, -0.6], speed: 0.19, color: '#FBBF24' },
  { from: [-3.5, -1.4, -1.4], speed: 0.24, color: '#A78BFA' },
  { from: [0.4, 3.2, -1.6], speed: 0.31, color: '#F472B6' },
  { from: [-0.6, -3.0, -1.0], speed: 0.17, color: '#0EA5E9' },
];

const MOTES_PER_STREAM = 22;
const CURVE_SEGMENTS = 40;

/** Message slots, spread wide enough to clear the centred copy above them. */
const MESSAGE_SLOTS: Array<[number, number, number]> = [
  [-2.1, 1.32, 0.5],
  [2.15, 0.96, 0.35],
  [-2.2, -1.05, 0.45],
  [2.0, -1.45, 0.3],
];

const ORB_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;

  varying vec3 vNormal;
  varying vec3 vView;
  varying float vNoise;

  // Three crossed sines stand in for gradient noise. It is not as isotropic as
  // simplex, but on a sphere at this scale nobody can tell, and it costs a
  // fraction of the instructions.
  float wave(vec3 p, float t) {
    return sin(p.x * 3.1 + t) * sin(p.y * 2.7 - t * 0.8) * sin(p.z * 3.4 + t * 1.3);
  }

  void main() {
    vec3 n = normalize(normal);
    float d = wave(position * 1.6, uTime * 0.9) * 0.5
            + wave(position * 3.3, uTime * 1.4) * 0.24;
    vNoise = d;

    vec3 displaced = position + n * d * uAmp;
    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);

    vNormal = normalize(normalMatrix * n);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const ORB_FRAGMENT = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  uniform float uGlow;

  varying vec3 vNormal;
  varying vec3 vView;
  varying float vNoise;

  void main() {
    float facing = clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0);
    float fresnel = pow(1.0 - facing, 2.2);

    vec3 base = mix(uColorA, uColorB, clamp(vNoise * 0.5 + 0.5, 0.0, 1.0));
    vec3 color = base * (0.3 + fresnel * 1.9) + vec3(fresnel) * 0.4 * uGlow;

    gl_FragColor = vec4(color, clamp(uOpacity * (0.22 + fresnel * 1.15), 0.0, 1.0));

    #include <colorspace_fragment>
  }
`;

/**
 * The AI Coach act: a glowing, deforming orb that the rest of the page's data
 * flows into, with sample insights floating around it.
 *
 * The orb is a small custom shader rather than a stock material because the
 * two things that make it read as "a model thinking" — surface displacement
 * and a fresnel rim — are exactly what a standard material cannot do.
 */
export function CoachOrb() {
  const group = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const shell = useRef<Mesh>(null);
  const nodes = useRef<Points>(null);
  const motes = useRef<Points>(null);
  const messages = useRef<Array<Mesh | null>>([]);
  const camera = useThree((state) => state.camera) as PerspectiveCamera;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0.14 },
      uOpacity: { value: 0 },
      uGlow: { value: 1 },
      uColorA: { value: new Color('#22C55E') },
      uColorB: { value: new Color('#0EA5E9') },
    }),
    []
  );

  const curves = useMemo(
    () =>
      STREAMS.map((stream) => {
        const start = new Vector3(...stream.from);
        const end = new Vector3(0, 0, 0);
        // Bow the control point sideways so streams spiral in instead of
        // arriving as straight spokes.
        const control = start
          .clone()
          .multiplyScalar(0.45)
          .add(new Vector3(-start.y * 0.35, start.x * 0.3, 0.9));
        return new QuadraticBezierCurve3(start, control, end);
      }),
    []
  );

  /** One faint guide line per stream, so the path is visible between motes. */
  const guides = useMemo(
    () =>
      curves.map((curve, i) => {
        const geometry = new BufferGeometry().setFromPoints(curve.getPoints(CURVE_SEGMENTS));
        const material = new LineBasicMaterial({
          color: new Color(STREAMS[i].color),
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: AdditiveBlending,
        });
        return { line: new Line(geometry, material), material, geometry };
      }),
    [curves]
  );

  const moteGeometry = useMemo(() => {
    const count = STREAMS.length * MOTES_PER_STREAM;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const tint = new Color();
    for (let s = 0; s < STREAMS.length; s++) {
      tint.set(STREAMS[s].color);
      for (let m = 0; m < MOTES_PER_STREAM; m++) {
        const index = s * MOTES_PER_STREAM + m;
        colors[index * 3] = tint.r;
        colors[index * 3 + 1] = tint.g;
        colors[index * 3 + 2] = tint.b;
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    return geometry;
  }, []);

  /** Neural nodes: a sparse shell of points just outside the core. */
  const nodeGeometry = useMemo(() => {
    const count = 240;
    const positions = new Float32Array(count * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      positions[i * 3] = Math.cos(theta) * radius * 1.12;
      positions[i * 3 + 1] = y * 1.12;
      positions[i * 3 + 2] = Math.sin(theta) * radius * 1.12;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    return geometry;
  }, []);

  useEffect(
    () => () => {
      guides.forEach((guide) => {
        guide.geometry.dispose();
        guide.material.dispose();
      });
      moteGeometry.dispose();
      nodeGeometry.dispose();
    },
    [guides, moteGeometry, nodeGeometry]
  );

  const dot = useMemo(() => dotTexture(), []);
  const messageMaps = useMemo(
    () => COACH.messages.slice(0, MESSAGE_SLOTS.length).map((message) => messageTexture(message)),
    []
  );

  /** Scratch, so sampling 132 curve points per frame allocates nothing. */
  const scratch = useMemo(() => new Vector3(), []);

  useFrame((state, delta) => {
    const root = group.current;
    if (!root) return;

    const t = scrollState.t;
    const alive = envelope(t, 4.5, 4.95, 5.5, 6.15);
    root.visible = alive > 0.002;
    if (!root.visible) return;

    const time = state.clock.elapsedTime;
    const reduced = scrollState.reducedMotion;

    const form = easeOutCubic(norm(t, 4.55, 5.05));
    const leave = easeOutCubic(norm(t, 5.5, 6.15));

    root.position.y = reduced ? 0 : Math.sin(time * 0.4) * 0.06;
    root.scale.setScalar(lerp(0.15, 1, easeOutBack(form)) * lerp(1, 0.4, leave));

    // Core: breathing amplitude, and a heartbeat that pushes harder as the
    // section settles — the visual claim that it is working on something.
    uniforms.uTime.value = reduced ? 0.4 : time;
    uniforms.uAmp.value = lerp(0.04, 0.15, form) * (reduced ? 0.4 : 1 + Math.sin(time * 1.6) * 0.25);
    uniforms.uOpacity.value = alive * form * (1 - leave * 0.85);
    uniforms.uGlow.value = 0.7 + (reduced ? 0.3 : Math.sin(time * 2.2) * 0.3 + 0.3);

    if (core.current && !reduced) {
      core.current.rotation.y += delta * 0.18;
      core.current.rotation.x += delta * 0.07;
    }
    if (shell.current && !reduced) {
      shell.current.rotation.y -= delta * 0.12;
      shell.current.rotation.z += delta * 0.05;
      (shell.current.material as MeshBasicMaterial).opacity = 0.18 * form * (1 - leave);
    }
    if (nodes.current) {
      nodes.current.rotation.y = time * 0.09;
      (nodes.current.material as PointsMaterial).opacity = 0.75 * form * (1 - leave);
    }

    // Motes stream inward along their curves, wrapping at the orb.
    const moteAlpha = norm(t, 4.72, 5.15) * (1 - leave);
    if (motes.current) {
      motes.current.visible = moteAlpha > 0.02;
      if (motes.current.visible) {
        const attribute = moteGeometry.getAttribute('position') as BufferAttribute;
        const array = attribute.array as Float32Array;
        for (let s = 0; s < STREAMS.length; s++) {
          const curve = curves[s];
          for (let m = 0; m < MOTES_PER_STREAM; m++) {
            const u = wrap(m / MOTES_PER_STREAM + time * STREAMS[s].speed, 1);
            curve.getPoint(u, scratch);
            const index = (s * MOTES_PER_STREAM + m) * 3;
            array[index] = scratch.x;
            array[index + 1] = scratch.y;
            array[index + 2] = scratch.z;
          }
        }
        attribute.needsUpdate = true;
        (motes.current.material as PointsMaterial).opacity = moteAlpha * 0.95;
      }
    }

    guides.forEach((guide) => {
      guide.material.opacity = moteAlpha * 0.13;
    });

    // Messages fade in one after another and drift. Their x is pulled inward on
    // narrow frames so they never fall off the sides.
    const halfWidth =
      Math.tan(((camera.fov ?? 45) * Math.PI) / 360) * Math.abs(camera.position.z) * camera.aspect;
    const fit = clamp(halfWidth / 3.3, 0.55, 1.15);

    for (let i = 0; i < MESSAGE_SLOTS.length; i++) {
      const mesh = messages.current[i];
      if (!mesh) continue;
      const slot = MESSAGE_SLOTS[i];
      const show = clamp01(norm(t, 4.9 + i * 0.075, 5.12 + i * 0.075)) * (1 - leave);
      const material = mesh.material as MeshBasicMaterial;
      material.opacity = show * 0.96;
      mesh.visible = material.opacity > 0.02;
      if (!mesh.visible) continue;

      const drift = reduced ? 0 : Math.sin(time * 0.55 + i * 1.4) * 0.055;
      mesh.position.set(
        damp(mesh.position.x, slot[0] * fit, 3, delta),
        slot[1] + drift,
        slot[2]
      );
      mesh.scale.setScalar(lerp(0.85, 1, easeOutBack(clamp01(show))));
    }
  });

  return (
    <group ref={group}>
      {/* Deforming core */}
      <mesh ref={core}>
        {/* Detail 16 ≈ 5.8k triangles — enough that vertex displacement reads
            as a smooth surface, far short of the point where it costs anything. */}
        <icosahedronGeometry args={[0.92, 16]} />
        <shaderMaterial
          vertexShader={ORB_VERTEX}
          fragmentShader={ORB_FRAGMENT}
          uniforms={uniforms}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* Counter-rotating wire shell */}
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.24, 2]} />
        <meshBasicMaterial
          color="#5FF0A8"
          wireframe
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Neural nodes */}
      <points ref={nodes} geometry={nodeGeometry}>
        <pointsMaterial
          map={dot}
          size={0.055}
          color="#9BFFD0"
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
          sizeAttenuation
          toneMapped={false}
        />
      </points>

      {/* Data streams */}
      {guides.map((guide, i) => (
        <primitive key={i} object={guide.line} />
      ))}
      <points ref={motes} geometry={moteGeometry}>
        <pointsMaterial
          map={dot}
          size={0.075}
          vertexColors
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
          sizeAttenuation
          toneMapped={false}
        />
      </points>

      {/* Sample insights */}
      {messageMaps.map((map, i) => (
        <mesh
          key={i}
          ref={(node) => {
            messages.current[i] = node;
          }}
          position={MESSAGE_SLOTS[i]}
        >
          <planeGeometry args={[1.92, 0.36]} />
          <meshBasicMaterial
            map={map}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}

      <Glow position={[0, 0, -0.5]} scale={5.2} color="#22C55E" opacity={0.42} />
      <Glow position={[0, 0, 0.7]} scale={2.6} color="#7CF7B0" opacity={0.3} />
    </group>
  );
}
