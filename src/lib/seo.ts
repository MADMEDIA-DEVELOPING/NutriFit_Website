/**
 * The machine-readable version of this page.
 *
 * Everything here is derived from `content.ts`, never restated. A JSON-LD graph
 * that drifts from the visible copy is worse than none at all — the mismatch is
 * itself a quality signal, and the whole value of the markup is that it is the
 * same claims in a form a machine does not have to guess at.
 *
 * Deliberately absent: `aggregateRating`. Google's app rich result wants one,
 * and there is no honest number to put there, so the field stays out rather
 * than being filled with a plausible-looking invention.
 */

import { FAQ_CONTENT, PRICING, PRODUCT, SITE, SOURCES } from './content';

/** Resolves a site-relative path against the canonical origin. */
const abs = (path: string): string => new URL(path, SITE.origin).href;

/** `'$9.99'` → `'9.99'`. Schema.org wants the number without the symbol. */
const amount = (price: string): string => price.replace(/[^\d.]/g, '');

/**
 * HTML-escapes a value going into an attribute or a `<title>`.
 *
 * The title carries an ampersand, and a bare `&` in markup is an error every
 * parser happens to forgive until the character after it starts something that
 * looks like an entity. Cheaper to escape than to depend on that.
 */
const esc = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const ORGANIZATION_ID = `${SITE.origin}/#organization`;
const WEBSITE_ID = `${SITE.origin}/#website`;
const APP_ID = `${SITE.origin}/#app`;

const DESCRIPTION = `${PRODUCT.name} is a full-stack nutrition and fitness diary for Android: barcode scanning across three food databases, AI photo meal analysis, macros, water, steps, workouts, a friends map, and an AI coach grounded in your real history. Starts completely local, no account required.`;

/**
 * What the app actually does, in the flat list `featureList` expects.
 *
 * Drawn from the section headings above it, so the markup cannot advertise a
 * feature the page does not also show.
 */
const FEATURES = [
  'Food diary with calories, protein, carbs and fat',
  'Barcode scanning across Open Food Facts, USDA FoodData Central and UPCitemdb',
  'Offline food search from a local Open Food Facts mirror',
  'AI photo meal recognition with editable estimates',
  'Water tracking with a body-weight-derived daily goal',
  'Step counting from the Android hardware sensor, without Google Fit',
  'Workout notebook with sets, reps and history',
  'Food Composer with cooking weight correction',
  'Recipes that log into the right meal in one tap',
  'Mifflin-St Jeor calorie and macro calculator',
  'Friends map with consent enforced server-side',
  'Real-time one-to-one chat',
  'AI Coach grounded in your last seven days of entries',
  'Romanian and English throughout',
];

/** One `Offer` per tier, priced monthly, with the Play SKU as its identifier. */
function offers() {
  return PRICING.tiers.map((tier) => ({
    '@type': 'Offer',
    name: tier.name,
    description: tier.summary,
    price: tier.price ? amount(tier.price.monthly) : '0',
    priceCurrency: 'USD',
    ...(tier.productId ? { sku: tier.productId } : {}),
    category: tier.price ? 'subscription' : 'free',
    availability: 'https://schema.org/InStock',
    url: PRODUCT.playUrl,
  }));
}

/**
 * The whole graph, as one `@graph` array rather than several loose blocks.
 *
 * Explicit `@id`s let the app, the site and the publisher be stated once each
 * and referenced from everywhere else, which is what makes a search engine
 * treat them as one entity instead of three lookalikes.
 */
export function buildJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORGANIZATION_ID,
        name: PRODUCT.developer,
        url: `${SITE.origin}/`,
        email: PRODUCT.supportEmail,
        logo: {
          '@type': 'ImageObject',
          url: abs('/logo.svg'),
          width: 512,
          height: 512,
        },
        foundingDate: SITE.founded,
        sameAs: SITE.profiles,
      },
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: `${SITE.origin}/`,
        name: `${PRODUCT.name} — ${PRODUCT.tagline}`,
        description: DESCRIPTION,
        inLanguage: [SITE.language, SITE.altLanguage],
        publisher: { '@id': ORGANIZATION_ID },
      },
      {
        '@type': 'WebPage',
        '@id': `${SITE.origin}/#webpage`,
        url: `${SITE.origin}/`,
        name: `${PRODUCT.name} — ${PRODUCT.tagline}`,
        description: DESCRIPTION,
        isPartOf: { '@id': WEBSITE_ID },
        about: { '@id': APP_ID },
        inLanguage: SITE.language,
        primaryImageOfPage: { '@type': 'ImageObject', url: abs(SITE.ogImage) },
      },
      {
        '@type': 'MobileApplication',
        '@id': APP_ID,
        name: PRODUCT.name,
        alternateName: `${PRODUCT.name} — ${PRODUCT.tagline}`,
        description: DESCRIPTION,
        applicationCategory: 'HealthApplication',
        applicationSubCategory: 'Nutrition and fitness tracker',
        operatingSystem: 'Android',
        identifier: PRODUCT.package,
        url: `${SITE.origin}/`,
        installUrl: PRODUCT.playUrl,
        downloadUrl: PRODUCT.playUrl,
        privacyPolicy: PRODUCT.privacyUrl,
        inLanguage: [SITE.language, SITE.altLanguage],
        isAccessibleForFree: true,
        image: abs(SITE.ogImage),
        author: { '@id': ORGANIZATION_ID },
        publisher: { '@id': ORGANIZATION_ID },
        featureList: FEATURES,
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'USD',
          lowPrice: '0',
          highPrice: amount(PRICING.tiers[PRICING.tiers.length - 1].price!.monthly),
          offerCount: PRICING.tiers.length,
          offers: offers(),
        },
        citation: SOURCES.items.map((source) => ({
          '@type': 'CreativeWork',
          name: source.name,
          url: source.href,
        })),
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE.origin}/#faqpage`,
        isPartOf: { '@id': WEBSITE_ID },
        inLanguage: SITE.language,
        mainEntity: FAQ_CONTENT.items.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  };
}

/**
 * The page title, kept in one place because four tags have to agree on it.
 *
 * Held under ~60 characters: Google truncates a title by pixel width, and the
 * longer version lost `AI Coach` off the end of the result, which is the part
 * that distinguishes this from every other calorie counter.
 */
export const TITLE = `${PRODUCT.name} — Calorie Counter, Barcode Scanner & AI Coach`;

/**
 * The description every crawler and share card reads.
 *
 * Held to the ~155 characters Google will actually render, front-loaded with
 * the thing people search for rather than with the brand name — the brand is
 * already in the title, and repeating it spends the only line that gets read.
 */
export const META_DESCRIPTION =
  'Free Android food diary: scan barcodes from 3.5M+ products, read a meal off a photo with AI, track macros, water, steps and workouts. Offline, no account.';

/**
 * The `<head>` block, built from the same content as the graph.
 *
 * Returned as a string of tags rather than as a React tree because it has to
 * land in the served HTML for crawlers that never run a frame of JavaScript;
 * the build step writes it straight into `dist/index.html`.
 */
export function buildHeadTags(): string {
  const image = abs(SITE.ogImage);
  const alt = `${PRODUCT.name} — ${PRODUCT.tagline}`;
  const crawl = 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';

  const keywords = [
    'calorie counter',
    'food diary app',
    'barcode food scanner',
    'macro tracker',
    'AI nutrition coach',
    'photo calorie counter',
    'offline calorie tracker',
    'step counter without Google Fit',
    'workout log app',
    'jurnal alimentar',
    'contor de calorii',
    'aplicatie nutritie',
  ].join(', ');

  return [
    `<title>${esc(TITLE)}</title>`,
    `<meta name="description" content="${esc(META_DESCRIPTION)}" />`,
    `<meta name="keywords" content="${esc(keywords)}" />`,
    `<meta name="author" content="${esc(PRODUCT.developer)}" />`,
    `<meta name="application-name" content="${esc(PRODUCT.name)}" />`,
    `<meta name="apple-mobile-web-app-title" content="${esc(PRODUCT.name)}" />`,
    `<meta name="robots" content="${crawl}" />`,
    `<meta name="googlebot" content="${crawl}" />`,
    `<link rel="canonical" href="${SITE.origin}/" />`,
    `<link rel="alternate" hreflang="${SITE.language}" href="${SITE.origin}/" />`,
    `<link rel="alternate" hreflang="x-default" href="${SITE.origin}/" />`,
    `<link rel="manifest" href="/site.webmanifest" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(PRODUCT.name)}" />`,
    `<meta property="og:title" content="${esc(TITLE)}" />`,
    `<meta property="og:description" content="${esc(META_DESCRIPTION)}" />`,
    `<meta property="og:url" content="${SITE.origin}/" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(alt)}" />`,
    `<meta property="og:locale" content="${SITE.locale}" />`,
    `<meta property="og:locale:alternate" content="${SITE.altLocale}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(TITLE)}" />`,
    `<meta name="twitter:description" content="${esc(META_DESCRIPTION)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<meta name="twitter:image:alt" content="${esc(alt)}" />`,
    `<meta name="mobile-web-app-capable" content="yes" />`,
    `<meta name="apple-mobile-web-app-capable" content="yes" />`,
    `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`,
    `<meta name="format-detection" content="telephone=no" />`,
  ].join('\n    ');
}

/**
 * `sitemap.xml`, generated here so the URL list cannot fall out of step with
 * the links the page actually carries.
 *
 * Section anchors are deliberately not listed. They are fragments of one
 * document, not pages, and padding a sitemap with them reports coverage that
 * does not exist.
 */
export function buildSitemap(lastmod: string): string {
  const urls = [
    { loc: `${SITE.origin}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: PRODUCT.privacyUrl, changefreq: 'yearly', priority: '0.3' },
    { loc: PRODUCT.privacyUrlRo, changefreq: 'yearly', priority: '0.3' },
    { loc: PRODUCT.deleteAccountUrl, changefreq: 'yearly', priority: '0.3' },
  ];

  const body = urls
    .map((url) =>
      [
        '  <url>',
        `    <loc>${url.loc}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${url.changefreq}</changefreq>`,
        `    <priority>${url.priority}</priority>`,
        '  </url>',
      ].join('\n')
    )
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    '</urlset>',
    '',
  ].join('\n');
}

/**
 * `robots.txt`.
 *
 * Everything is crawlable — there is one page and nothing on it is private.
 * The one rule that earns its place is the sitemap pointer, which is how a
 * crawler that arrived from a link finds the rest.
 */
export function buildRobots(): string {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${SITE.origin}/sitemap.xml`,
    '',
  ].join('\n');
}

/**
 * `site.webmanifest`.
 *
 * `related_applications` plus `prefer_related_applications` is the declared
 * link between this page and the Play listing: a browser offers the app
 * instead of an install prompt for the site, and a crawler gets the pairing
 * stated rather than inferred from an outbound link.
 */
export function buildManifest(): Record<string, unknown> {
  return {
    name: `${PRODUCT.name} — ${PRODUCT.tagline}`,
    short_name: PRODUCT.name,
    description: META_DESCRIPTION,
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#070b14',
    theme_color: '#0b1220',
    lang: SITE.language,
    dir: 'ltr',
    categories: ['health', 'fitness', 'food', 'lifestyle'],
    icons: [
      { src: '/logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [
      {
        src: SITE.ogImage,
        sizes: '1200x630',
        type: 'image/png',
        form_factor: 'wide',
        label: `${PRODUCT.name} — ${PRODUCT.tagline}`,
      },
    ],
    prefer_related_applications: true,
    related_applications: [
      {
        platform: 'play',
        url: PRODUCT.playUrl,
        id: PRODUCT.package,
      },
    ],
  };
}
