/**
 * Covers the page until WebGL has produced its first frame.
 *
 * It is a fade, not a progress bar: there is nothing to download, so the wait
 * is the few hundred milliseconds it takes to compile shaders and build the
 * environment map. A percentage counter there would be theatre.
 */
export function Loader({ done }: { done: boolean }) {
  return (
    <div className={done ? 'loader loader--done' : 'loader'} aria-hidden={done}>
      <div className="loader__ring">N</div>
      <p className="loader__label">Preparing your plate</p>
    </div>
  );
}
