import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  type Points,
  type PointsMaterial,
} from 'three';
import { scrollState } from '@/lib/scroll';
import { dotTexture } from '@/lib/textures';
import { envelope, wrap } from '@/lib/math';

const COUNT = 420;
const SPREAD_X = 18;
const SPREAD_Y = 11;
const SPREAD_Z = 16;

/**
 * A slow drift of motes filling the space between acts.
 *
 * It is the only object on stage from the first frame to the last, and that is
 * the point: with nothing in the gaps, every act change reads as a cut. A field
 * that parallaxes behind the camera turns the same cuts into travel.
 */
export function DustField() {
  const points = useRef<Points>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    // A fixed pseudo-random sequence: a real `Math.random()` would reshuffle
    // the field on every hot reload while tuning the rest of the scene.
    let seed = 8_675_309;
    const next = () => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
      return seed / 2_147_483_648;
    };
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (next() - 0.5) * SPREAD_X;
      positions[i * 3 + 1] = (next() - 0.5) * SPREAD_Y;
      positions[i * 3 + 2] = (next() - 0.5) * SPREAD_Z - 2;
    }
    const buffer = new BufferGeometry();
    buffer.setAttribute('position', new BufferAttribute(positions, 3));
    return buffer;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const map = useMemo(() => dotTexture(), []);

  useFrame((state, delta) => {
    const field = points.current;
    if (!field) return;

    // Present throughout, but stepped back once the page turns to pricing so
    // the type there sits on something close to flat black.
    const alive = envelope(scrollState.t, -1, -0.6, 5.3, 6.2);
    field.visible = alive > 0.005;
    if (!field.visible) return;

    (field.material as PointsMaterial).opacity = alive * 0.5;

    if (!scrollState.reducedMotion) {
      field.rotation.y += delta * 0.012;
      const attribute = geometry.getAttribute('position') as BufferAttribute;
      const array = attribute.array as Float32Array;
      // Rise and wrap — cheaper than any simulation and reads as air.
      for (let i = 1; i < array.length; i += 3) {
        array[i] = wrap(array[i] + delta * 0.09 + SPREAD_Y / 2, SPREAD_Y) - SPREAD_Y / 2;
      }
      attribute.needsUpdate = true;
    }

    field.position.x = -state.camera.position.x * 0.12;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        map={map}
        size={0.055}
        color="#8FD9FF"
        transparent
        opacity={0}
        depthWrite={false}
        blending={AdditiveBlending}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  );
}
