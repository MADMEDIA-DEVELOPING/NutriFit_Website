import type { CSSProperties } from 'react';
import { EXPLORE } from '@/lib/content';
import { Reveal } from '@/components/Reveal';

export function Explore() {
  return (
    <section id="explore" data-stage="explore" className="section">
      <div className="section__inner split">
        <div className="split__copy">
          <Reveal>
            <span className="eyebrow">{EXPLORE.eyebrow}</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="title">{EXPLORE.title}</h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="lede">{EXPLORE.lede}</p>
          </Reveal>

          <ul className="explore__grid">
            {EXPLORE.tiles.map((tile, i) => (
              <Reveal
                as="li"
                key={tile.key}
                delay={0.18 + i * 0.06}
                className="tile"
                // Each card is tinted by the same accent its 3D counterpart
                // carries, so the two halves of the section read as one thing.
                style={{ '--tile-accent': tile.accent } as CSSProperties}
              >
                <p className="tile__caption">{tile.caption}</p>
                <h3 className="tile__title">{tile.title}</h3>
                <p className="tile__body">{tile.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
