import { Suspense, useCallback, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor, Preload } from '@react-three/drei';
import { ACESFilmicToneMapping } from 'three';
import { disposeTextures } from '@/lib/textures';
import { COARSE, MAX_DPR } from '@/lib/device';
import { CameraRig } from './CameraRig';
import { Lighting } from './Lighting';
import { DustField } from './parts/DustField';
import { FoodPlate } from './acts/FoodPlate';
import { MacroCards } from './acts/MacroCards';
import { PhoneScan } from './acts/PhoneScan';
import { FeatureTiles } from './acts/FeatureTiles';
import { FriendsGlobe } from './acts/FriendsGlobe';
import { CoachOrb } from './acts/CoachOrb';

interface SceneProps {
  onReady: () => void;
}

/**
 * One canvas, one WebGL context, mounted for the life of the page.
 *
 * Every act lives in this tree from the start and hides itself when its slice
 * of the scroll timeline is over. Mounting and unmounting them instead would
 * mean compiling shaders mid-scroll, which is exactly the stutter the brief
 * asks us to avoid — the whole scene is a few thousand triangles, so keeping it
 * resident costs far less than rebuilding it six times.
 */
export function Scene({ onReady }: SceneProps) {
  // Resolution, not framerate, is what gives when the GPU cannot keep up: a
  // slightly softer scene at 60fps reads far better than a sharp one at 30.
  //
  // The ceiling is per-device (see `@/lib/device`): 1.75 on a desktop, 1.4 on a
  // phone, 1 on a phone that looks weak. This used to be a flat 1.75, which on
  // a 3x phone screen meant the renderer was filling more than five times the
  // pixels of the display it was heading for.
  const [dpr, setDpr] = useState(MAX_DPR);

  const handleCreated = useCallback(() => {
    // One frame's grace so the first paint is a composed scene, not a flash of
    // the clear colour.
    requestAnimationFrame(() => requestAnimationFrame(onReady));
  }, [onReady]);

  // Every texture on stage is painted into a canvas and cached module-wide;
  // if the scene ever goes away, so should they.
  useEffect(() => disposeTextures, []);

  return (
    <div className="scene-layer" aria-hidden="true">
      <Canvas
        dpr={dpr}
        gl={{
          // MSAA is close to free on a desktop GPU and one of the most
          // expensive things you can ask a mobile tile renderer for. The edges
          // in this scene are soft, lit and mostly in motion, so on a phone the
          // aliasing it would have removed is not visible in the first place.
          antialias: !COARSE,
          alpha: false,
          // Asking a phone for the high-performance adapter is asking it to run
          // the discrete-equivalent power profile for a decorative background;
          // it is a reliable way to get thermally throttled two minutes in.
          powerPreference: COARSE ? 'default' : 'high-performance',
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        camera={{ position: [0, 0.75, 6.6], fov: 42, near: 0.1, far: 60 }}
        performance={{ min: 0.4 }}
        onCreated={handleCreated}
      >
        <color attach="background" args={['#070b14']} />
        {/* Fog does the fading for anything that recedes, so acts can leave by
            travelling backwards instead of by animating a pile of opacities. */}
        <fog attach="fog" args={['#070b14', 8, 21]} />

        {/* Measures real frame times and steps the pixel ratio down after a
            sustained decline. `flipflops` stops it oscillating forever on a
            device that sits right on the boundary. */}
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => setDpr(1)}
          onFallback={() => setDpr(1)}
          // Back up to this device's ceiling, not to the desktop's. Recovering
          // to a flat 1.75 would have undone the mobile cap the moment the
          // monitor saw one good stretch of frames.
          onIncline={() => setDpr(MAX_DPR)}
        />

        <CameraRig />
        <Lighting />

        <Suspense fallback={null}>
          <DustField />
          <FoodPlate />
          <MacroCards />
          <PhoneScan />
          <FeatureTiles />
          <FriendsGlobe />
          <CoachOrb />
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  );
}
