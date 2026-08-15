import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Vector3 } from 'three';
import { scrollState } from '@/lib/scroll';
import { clamp, damp, easeInOut, lerp } from '@/lib/math';

interface Key {
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
}

/**
 * One keyframe per stage, indexed by `scrollState.t`.
 *
 * The camera stays near x = 0 and the acts themselves sit off to one side, so
 * an act at x = +2.2 genuinely lands on the right half of the frame. Aiming the
 * camera at the act instead would re-centre it and undo the layout.
 */
const KEYS: Key[] = [
  { pos: [0, 1.55, 6.2], look: [0.3, -0.75, 0], fov: 42 }, // hero — down onto the plate
  { pos: [0, 0.25, 6.1], look: [0.62, 0.02, 0], fov: 40 }, // trace — macro cards
  { pos: [0, 0.1, 5.8], look: [-0.62, 0, 0], fov: 40 }, // scan — the phone
  { pos: [0, 0.3, 6.5], look: [0.6, 0.02, 0], fov: 42 }, // explore — tile cluster
  { pos: [0, 0.12, 6.3], look: [-0.6, 0, 0], fov: 42 }, // social — the globe
  { pos: [0, 0, 5.1], look: [0, 0, 0], fov: 45 }, // coach — the orb, centred
  { pos: [0, 0.5, 9.4], look: [0, 0.1, 0], fov: 40 }, // pricing — everything recedes
  { pos: [0, 1.1, 12.5], look: [0, 0.2, 0], fov: 38 }, // footer — gone
];

/** Scratch vectors, hoisted so the frame loop never allocates. */
const targetPos = new Vector3();
const targetLook = new Vector3();
const currentLook = new Vector3();

export function CameraRig() {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const pointer = useRef({ x: 0, y: 0 });
  const fov = useRef(KEYS[0].fov);
  const started = useRef(false);

  useFrame((_, delta) => {
    const t = clamp(scrollState.t, 0, KEYS.length - 1);
    const index = Math.min(Math.floor(t), KEYS.length - 2);
    const from = KEYS[index];
    const to = KEYS[index + 1];

    // Ease within each span so arriving at a section settles rather than stops.
    const blend = easeInOut(t - index);

    targetPos.set(
      lerp(from.pos[0], to.pos[0], blend),
      lerp(from.pos[1], to.pos[1], blend),
      lerp(from.pos[2], to.pos[2], blend)
    );
    targetLook.set(
      lerp(from.look[0], to.look[0], blend),
      lerp(from.look[1], to.look[1], blend),
      lerp(from.look[2], to.look[2], blend)
    );

    // Narrow viewports have no room for an off-centre act, so the framing
    // recentres and pulls back to fit the same objects into a taller frame.
    if (scrollState.narrow) {
      targetLook.x = 0;
      targetPos.z += 1.5;
      targetPos.y += 0.15;
    }

    if (scrollState.reducedMotion) {
      camera.position.copy(targetPos);
      currentLook.copy(targetLook);
      camera.lookAt(currentLook);
      if (camera.fov !== lerp(from.fov, to.fov, blend)) {
        camera.fov = lerp(from.fov, to.fov, blend);
        camera.updateProjectionMatrix();
      }
      return;
    }

    // Mouse parallax, strongest in the hero where the brief asks the camera to
    // walk around the plate, and fading out as the journey gets busier.
    const parallax = lerp(1, 0.35, clamp(scrollState.t / 3, 0, 1));
    pointer.current.x = damp(pointer.current.x, scrollState.pointer.x, 2.4, delta);
    pointer.current.y = damp(pointer.current.y, scrollState.pointer.y, 2.4, delta);
    targetPos.x += pointer.current.x * 0.55 * parallax;
    targetPos.y += -pointer.current.y * 0.3 * parallax;

    // Scrolling fast leans the camera into the direction of travel. It is a few
    // centimetres of movement, and it is most of why the page feels physical.
    targetPos.y += clamp(-scrollState.velocity / 9000, -0.14, 0.14);

    // On the very first frame, snap — damping from the default camera position
    // would otherwise show a swoop nobody asked for.
    const lambda = started.current ? 3.4 : 1000;
    started.current = true;

    camera.position.set(
      damp(camera.position.x, targetPos.x, lambda, delta),
      damp(camera.position.y, targetPos.y, lambda, delta),
      damp(camera.position.z, targetPos.z, lambda, delta)
    );

    currentLook.set(
      damp(currentLook.x, targetLook.x, lambda, delta),
      damp(currentLook.y, targetLook.y, lambda, delta),
      damp(currentLook.z, targetLook.z, lambda, delta)
    );
    camera.lookAt(currentLook);

    const nextFov = lerp(from.fov, to.fov, blend) + (scrollState.narrow ? 6 : 0);
    fov.current = damp(fov.current, nextFov, lambda, delta);
    if (Math.abs(camera.fov - fov.current) > 0.01) {
      camera.fov = fov.current;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
