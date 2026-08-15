import { AdditiveBlending, DoubleSide } from 'three';
import { glowTexture } from '@/lib/textures';

interface GlowProps {
  position?: [number, number, number];
  scale?: number;
  color?: string;
  opacity?: number;
  /** Billboards toward the camera when true; otherwise keeps its own rotation. */
  rotation?: [number, number, number];
}

/**
 * A camera-facing additive sprite standing in for bloom.
 *
 * A real bloom pass means a post-processing chain, two extra render targets and
 * a dependency, all to blur things that are already emissive. Three additive
 * quads behind the bright objects buy most of the look for a rounding error of
 * the cost — which matters when the whole page has to stay smooth on a phone.
 */
export function Glow({
  position = [0, 0, 0],
  scale = 1,
  color = '#22C55E',
  opacity = 0.5,
  rotation,
}: GlowProps) {
  return (
    <sprite position={position} scale={[scale, scale, scale]} rotation={rotation}>
      <spriteMaterial
        map={glowTexture()}
        color={color}
        transparent
        opacity={opacity}
        blending={AdditiveBlending}
        depthWrite={false}
        depthTest={false}
      />
    </sprite>
  );
}

/** A flat additive disc used as a floor bounce under the plate and the phone. */
export function GroundGlow({
  position = [0, 0, 0],
  scale = 1,
  color = '#22C55E',
  opacity = 0.35,
}: Omit<GlowProps, 'rotation'>) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} scale={[scale, scale, scale]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={glowTexture()}
        color={color}
        transparent
        opacity={opacity}
        blending={AdditiveBlending}
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  );
}
