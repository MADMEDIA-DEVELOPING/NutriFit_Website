import { Environment, Lightformer } from '@react-three/drei';

/**
 * Three-point rig plus a hand-built environment map.
 *
 * `<Environment preset="…">` would download an HDR from a CDN — a megabyte or
 * so before the first frame, and a hard dependency on someone else's uptime.
 * Rendering our own tiny cube map from a few `<Lightformer>` panels costs one
 * 128px render at startup and gives the ceramic, glass and metal materials
 * something believable to reflect.
 *
 * No shadow maps anywhere: nothing in the scene sits on a surface that would
 * receive one, and the additive ground glows read as contact shading for free.
 */
export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.55} color="#93b0e0" />

      {/* Key — warm, high and slightly to the right. */}
      <directionalLight position={[4, 6, 5]} intensity={2.1} color="#fff6e8" />
      {/* Fill — cool, low and opposite, so shadowed sides stay navy not black. */}
      <directionalLight position={[-5, -1, 3]} intensity={0.75} color="#3b82f6" />
      {/* Rim — brand green from behind, the edge light that ties it together. */}
      <directionalLight position={[-2, 3, -6]} intensity={1.4} color="#22c55e" />

      <Environment resolution={128} frames={1}>
        <Lightformer
          form="rect"
          intensity={2.4}
          color="#ffffff"
          position={[0, 5, -4]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[12, 6, 1]}
        />
        <Lightformer
          form="circle"
          intensity={3.2}
          color="#22c55e"
          position={[-5, 1, -3]}
          scale={[5, 5, 1]}
        />
        <Lightformer
          form="circle"
          intensity={2.6}
          color="#0ea5e9"
          position={[5, -1, -2]}
          scale={[5, 5, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.1}
          color="#111a2e"
          position={[0, -5, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[12, 12, 1]}
        />
      </Environment>
    </>
  );
}
