import { FAQ_CONTENT, SOURCES } from '@/lib/content';
import { Reveal } from '@/components/Reveal';

/**
 * The FAQ and the credits block, deliberately the last thing before the footer.
 *
 * Two things are going on here. For a reader arriving from a search result,
 * this is the section that answers the question they typed without making them
 * scroll six acts to infer it. For a machine, it is the only place on the page
 * where the product's facts appear in plain question-and-answer form and where
 * the projects behind them are named and linked.
 *
 * Answers are rendered open rather than behind a disclosure widget. A
 * `<details>` accordion would be tidier, but text a crawler has to expand is
 * text that gets weighed less, and there is nothing here worth hiding.
 *
 * The section carries no `data-stage`: the scroll engine therefore reads `t` as
 * the footer keyframe throughout it, which is exactly right — the 3D acts have
 * already receded and this is copy, not choreography.
 */
export function Faq() {
  return (
    <section id="faq" className="section faq">
      <div className="section__inner">
        <div className="faq__head">
          <Reveal>
            <span className="eyebrow">{FAQ_CONTENT.eyebrow}</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="title">{FAQ_CONTENT.title}</h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="lede">{FAQ_CONTENT.lede}</p>
          </Reveal>
        </div>

        <div className="faq__grid">
          {FAQ_CONTENT.items.map((item, i) => (
            <Reveal
              key={item.q}
              // Staggering by index alone would make the last card wait most of
              // a second after the first; the cap keeps the tail brisk.
              delay={Math.min(0.18 + i * 0.04, 0.5)}
              className="faq__item"
            >
              <h3 className="faq__q">{item.q}</h3>
              <p className="faq__a">{item.a}</p>
            </Reveal>
          ))}
        </div>

        <div id="sources" className="sources">
          <Reveal>
            <h2 className="sources__title">{SOURCES.title}</h2>
          </Reveal>
          <Reveal delay={0.06}>
            <p className="sources__lede">{SOURCES.lede}</p>
          </Reveal>

          <ul className="sources__grid">
            {SOURCES.items.map((source, i) => (
              <Reveal as="li" key={source.href} delay={Math.min(0.12 + i * 0.05, 0.45)}>
                <a
                  className="sources__link"
                  href={source.href}
                  target="_blank"
                  // No `nofollow`: these are real citations to the projects the
                  // app depends on, and marking them otherwise would misreport
                  // the relationship.
                  rel="noreferrer noopener"
                >
                  <span className="sources__name">{source.name}</span>
                  <span className="sources__role">{source.role}</span>
                </a>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
