import { SCAN } from '@/lib/content';
import { Reveal } from '@/components/Reveal';
import { CheckIcon } from '@/components/icons';

export function Scan() {
  return (
    <section id="scan" data-stage="scan" className="section">
      <div className="section__inner split split--right">
        <div className="split__copy">
          <Reveal>
            <span className="eyebrow">{SCAN.eyebrow}</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="title">{SCAN.title}</h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="lede">{SCAN.lede}</p>
          </Reveal>

          <ol className="cascade">
            {SCAN.cascade.map((source, i) => (
              <Reveal as="li" key={source.name} delay={0.2 + i * 0.08} className="cascade__row">
                <span className="cascade__step" aria-hidden="true">
                  {source.step}
                </span>
                <div>
                  <h3 className="cascade__name">{source.name}</h3>
                  <p className="cascade__detail">{source.detail}</p>
                </div>
              </Reveal>
            ))}
          </ol>

          <Reveal delay={0.46} className="card photo-card">
            <h3 className="photo-card__title">{SCAN.photo.title}</h3>
            <p className="photo-card__body">{SCAN.photo.body}</p>
            <ul className="bullets">
              {SCAN.photo.bullets.map((bullet) => (
                <li key={bullet}>
                  <CheckIcon />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
