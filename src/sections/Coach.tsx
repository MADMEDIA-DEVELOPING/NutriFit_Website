import { COACH } from '@/lib/content';
import { Reveal } from '@/components/Reveal';

export function Coach() {
  return (
    <section id="coach" data-stage="coach" className="section coach">
      <div className="section__inner coach__inner">
        <Reveal>
          <span className="eyebrow">{COACH.eyebrow}</span>
        </Reveal>
        <Reveal delay={0.06}>
          <h2 className="title">{COACH.title}</h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="lede">{COACH.lede}</p>
        </Reveal>

        <ul className="coach__quota">
          {COACH.quota.map((row, i) => (
            <Reveal as="li" key={row.tier} delay={0.22 + i * 0.08} className="quota">
              <p className="quota__tier">{row.tier}</p>
              <p className="quota__value">{row.value}</p>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={0.5}>
          <p className="note coach__note">{COACH.rewarded}</p>
        </Reveal>
      </div>
    </section>
  );
}
