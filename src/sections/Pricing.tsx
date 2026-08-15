import { PRICING } from '@/lib/content';
import { Reveal } from '@/components/Reveal';
import { CheckIcon } from '@/components/icons';

export function Pricing() {
  return (
    <section id="pricing" data-stage="pricing" className="section pricing">
      <div className="section__inner">
        <div className="pricing__head">
          <Reveal>
            <span className="eyebrow">{PRICING.eyebrow}</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="title">{PRICING.title}</h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="lede">{PRICING.lede}</p>
          </Reveal>
        </div>

        <ul className="pricing__grid">
          {PRICING.tiers.map((tier, i) => (
            <Reveal
              as="li"
              key={tier.key}
              delay={0.18 + i * 0.07}
              className={tier.featured ? 'tier tier--featured' : 'tier'}
            >
              {tier.featured && <span className="tier__flag">Most popular</span>}

              <h3 className="tier__name">{tier.name}</h3>

              {tier.price ? (
                <>
                  <p className="tier__price">
                    <span className="tier__amount">{tier.price.monthly}</span>
                    <span className="tier__period">/ month</span>
                  </p>
                  <p className="tier__yearly">or {tier.price.yearly} / year</p>
                </>
              ) : (
                <>
                  {/* The card is already headed "Free"; repeating the word as
                      the price says nothing. A zero does. */}
                  <p className="tier__price">
                    <span className="tier__amount">$0</span>
                    <span className="tier__period">forever</span>
                  </p>
                  <p className="tier__yearly">No account needed</p>
                </>
              )}

              <p className="tier__summary">{tier.summary}</p>
              <span className="tier__divider" aria-hidden="true" />

              <p className="tier__addsLabel">{i === 0 ? 'Included' : 'Adds'}</p>
              <ul className="tier__adds">
                {tier.adds.map((item) => (
                  <li key={item}>
                    <CheckIcon />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* The ladder is cumulative, and saying so on every card is the
                  only way a five-tier table stays readable. */}
              {i > 0 && (
                <p className="tier__inherits">
                  Everything in {PRICING.tiers[i - 1].name}, plus the above.
                </p>
              )}
              {tier.productId && <p className="tier__sku">{tier.productId}</p>}
            </Reveal>
          ))}
        </ul>

        <Reveal delay={0.5}>
          <p className="pricing__footnote">{PRICING.footnote}</p>
        </Reveal>
      </div>
    </section>
  );
}
