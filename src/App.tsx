import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { LazyMotion, domAnimation } from 'framer-motion';
import { initScrollEngine } from '@/lib/scroll';
import { Nav } from '@/components/Nav';
import { Loader } from '@/components/Loader';
import { Hero } from '@/sections/Hero';
import { Trace } from '@/sections/Trace';
import { Scan } from '@/sections/Scan';
import { Explore } from '@/sections/Explore';
import { Social } from '@/sections/Social';
import { Coach } from '@/sections/Coach';
import { Pricing } from '@/sections/Pricing';
import { Footer } from '@/sections/Footer';

/**
 * three + drei is by far the heaviest thing on the page. Splitting it behind a
 * dynamic import means the headline, the copy and the download buttons are
 * interactive while the WebGL chunk is still in flight, and the loader fades
 * out when the scene is genuinely ready rather than gating the whole page on it.
 */
const Scene = lazy(() => import('@/scene/Scene').then((m) => ({ default: m.Scene })));

/**
 * Cheap capability probe, run once.
 *
 * Without it, a browser with WebGL disabled gets an exception out of the
 * renderer and an empty page. With it, the same browser gets the whole site as
 * text on a dark ground — which is what the page is actually for.
 */
function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function App() {
  const webgl = useMemo(detectWebGL, []);
  const [ready, setReady] = useState(!webgl);

  useEffect(() => initScrollEngine(), []);

  useEffect(() => {
    document.documentElement.classList.toggle('no-webgl', !webgl);
  }, [webgl]);

  // Safety net: if the scene chunk fails to arrive or the context is lost
  // before it renders, `onReady` never fires and the loader would sit over the
  // page forever. The site works fine without the scene, so reveal it anyway.
  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => setReady(true), 6000);
    return () => window.clearTimeout(timer);
  }, [ready]);

  return (
    // `strict` makes the compiler reject a stray `motion.*`, which would quietly
    // pull the full feature bundle back in and undo the split below.
    <LazyMotion features={domAnimation} strict>
      <Loader done={ready} />

      <a className="skip-link" href="#trace">
        Skip to content
      </a>

      {webgl && (
        <Suspense fallback={null}>
          <Scene onReady={() => setReady(true)} />
        </Suspense>
      )}

      <Nav />

      <main className="page">
        <Hero />
        <Trace />
        <Scan />
        <Explore />
        <Social />
        <Coach />
        <Pricing />
      </main>

      <Footer />
    </LazyMotion>
  );
}
