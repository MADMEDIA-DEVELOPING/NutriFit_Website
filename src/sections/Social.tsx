import { SOCIAL } from '@/lib/content';
import { Reveal } from '@/components/Reveal';

export function Social() {
  return (
    <section id="social" data-stage="social" className="section">
      <div className="section__inner split split--right">
        <div className="split__copy">
          <Reveal>
            <span className="eyebrow">{SOCIAL.eyebrow}</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="title">{SOCIAL.title}</h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="lede">{SOCIAL.lede}</p>
          </Reveal>

          <ul className="social__list">
            {SOCIAL.features.map((feature, i) => (
              <Reveal as="li" key={feature.title} delay={0.2 + i * 0.09} className="social__item">
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={0.5}>
            <p className="note">{SOCIAL.note}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
