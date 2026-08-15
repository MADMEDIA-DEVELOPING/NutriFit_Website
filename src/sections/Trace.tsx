import { TRACE } from '@/lib/content';
import { Reveal } from '@/components/Reveal';

export function Trace() {
  return (
    <section id="trace" data-stage="trace" className="section">
      <div className="section__inner split">
        <div className="split__copy">
          <Reveal>
            <span className="eyebrow">{TRACE.eyebrow}</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="title">{TRACE.title}</h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="lede">{TRACE.lede}</p>
          </Reveal>

          <ul className="card-grid trace__cards">
            {TRACE.facts.map((fact, i) => (
              <Reveal as="li" key={fact.label} delay={0.18 + i * 0.08} className="card">
                <p className="card__label">{fact.label}</p>
                <p className="card__value">{fact.value}</p>
                <p className="card__detail">{fact.detail}</p>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={0.44}>
            <p className="note">{TRACE.note}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
