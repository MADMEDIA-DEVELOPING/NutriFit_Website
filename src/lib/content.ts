/**
 * Every user-facing string and number on the page.
 *
 * Kept in one file so the marketing copy can be checked against the app's
 * technical dossier in one pass. Figures here mirror the app source: the water
 * clamp comes from `src/lib/nutrition.ts`, the tier ladder and its caps from
 * `src/lib/billing/config.ts`, the barcode cascade and the Gemini pipeline from
 * the project README.
 */

export const PRODUCT = {
  name: 'NutriFit',
  tagline: 'Trace. Scan. Chat. Grow.',
  package: 'com.madmediadeveloping.nutrifit',
  developer: 'MADMEDIA DEVELOPING COMPANY',
  supportEmail: 'madmedia96@gmail.com',
  playUrl: 'https://play.google.com/store/apps/details?id=com.madmediadeveloping.nutrifit',
  privacyUrl: 'https://nutrifit-73de0.web.app/privacy.html',
  privacyUrlRo: 'https://nutrifit-73de0.web.app/confidentialitate.html',
  deleteAccountUrl: 'https://nutrifit-73de0.web.app/stergere-cont.html',
} as const;

export const HERO = {
  headline: ['Trace.', 'Scan.', 'Chat.', 'Grow.'],
  sub: "Your full-stack nutrition & fitness diary. Starts completely local. Scales to AI coaching when you're ready.",
  badges: ['Search & barcode work offline', 'No account required to start', 'Română + English'],
} as const;

export const NAV_LINKS = [
  { href: '#trace', label: 'Trace' },
  { href: '#scan', label: 'Scan' },
  { href: '#explore', label: 'Explore' },
  { href: '#social', label: 'Social' },
  { href: '#coach', label: 'AI Coach' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
] as const;

export interface Fact {
  label: string;
  value: string;
  detail: string;
}

export const TRACE = {
  eyebrow: '01 — The diary',
  title: 'A day, measured properly',
  lede: 'Breakfast, lunch, dinner, snacks. Calories, the three macros, water and steps — all on one screen, all editable, all yours before any of it touches a server.',
  facts: [
    {
      label: 'Targets',
      value: 'Mifflin-St Jeor',
      detail:
        'Your BMR and TDEE are computed from height, weight, age, sex and activity level, then split into a macro target that matches your goal — cut, maintain or gain.',
    },
    {
      label: 'Water',
      value: '1 500 – 4 500 ml',
      detail:
        'A daily goal derived from your body weight and clamped to a sane range, logged in 250 ml glasses. Override it whenever you like.',
    },
    {
      label: 'Steps',
      value: 'Sensor, not cloud',
      detail:
        "Android's hardware step counter keeps counting with the app closed and credits the difference when you reopen it. One permission, no Google Fit, no Health Connect, no login.",
    },
  ] satisfies Fact[],
  note: 'Your phone is the source of truth. The cloud is a mirror and a backup — sign in on a new device and your profile, goals and custom foods come back on their own.',
} as const;

export const SCAN = {
  eyebrow: '02 — Capture',
  title: 'Two seconds from label to logged',
  lede: 'Point the camera at a barcode and NutriFit walks three databases until something answers. Point it at a plate instead and one multimodal call comes back with the dish, the portion, the macros and the ingredients it recognised.',
  cascade: [
    {
      step: '01',
      name: 'Open Food Facts',
      detail: '~3.5 million products, no API key. Also mirrored into a local SQLite/FTS5 index, so search stays instant and works with the radio off.',
    },
    {
      step: '02',
      name: 'USDA FoodData Central',
      detail: 'Reference-grade nutrition for anything the crowd-sourced set missed.',
    },
    {
      step: '03',
      name: 'UPCitemdb',
      detail: 'Last resort — it resolves the product name, and the entry form arrives pre-filled so you only copy the numbers off the label.',
    },
  ],
  photo: {
    title: 'Photo AI, one path',
    body: 'A photo is downscaled to 768 px and sent to Gemini as a single multimodal request: roughly 260 image tokens in, a structured meal out, 2–6 seconds round trip. There is deliberately no on-device fallback — a dead network or an exhausted quota surfaces as an honest error instead of a quietly degraded guess.',
    bullets: [
      'Dish, portion size, macros and detected ingredients in one response',
      '"No food in this photo" is a verdict with its own type, not a failure',
      'Every estimate is editable before it reaches your diary',
    ],
  },
} as const;

export interface TileContent {
  key: string;
  title: string;
  caption: string;
  body: string;
  accent: string;
}

export const EXPLORE = {
  eyebrow: '03 — Explore',
  title: 'One hub, six ways in',
  lede: 'The Explore tab collects everything that is not the daily diary: build a meal from raw ingredients, keep a workout notebook, cook from a recipe, or manage your subscription.',
  tiles: [
    {
      key: 'composer',
      title: 'Food Composer',
      caption: 'Build it from parts',
      body: 'About 750 ingredients across 21 categories ship inside the app. Pick them by household measure — a cup, a tablespoon, a medium one — and the composer applies cooking weight correction so 100 g of raw rice does not get logged as 100 g of cooked.',
      accent: '#22C55E',
    },
    {
      key: 'workouts',
      title: 'Workout Notebook',
      caption: 'Sets, reps, history',
      body: 'Log sessions and exercises against movement targets that adapt to your goal, with the activity screen reachable straight from the steps card on Home.',
      accent: '#A78BFA',
    },
    {
      key: 'recipes',
      title: 'Recipes',
      caption: 'Cook, then log',
      body: 'Curated recipes carry their ingredient list and steps, and drop into the right meal of the right day in a single tap.',
      accent: '#FBBF24',
    },
    {
      key: 'calculator',
      title: 'Calorie Calculator',
      caption: 'Goal in, targets out',
      body: 'Run the Mifflin-St Jeor numbers yourself and see exactly how a change in weight, activity or goal moves your daily budget.',
      accent: '#38BDF8',
    },
    {
      key: 'myfoods',
      title: 'My Foods',
      caption: 'Your own entries',
      body: 'Anything you add by hand is saved locally and synced to your account, so the second time you eat it, it is one tap away.',
      accent: '#F472B6',
    },
    {
      key: 'shop',
      title: 'N.O.S.S. Shop',
      caption: 'Off-app orders',
      body: 'The N.O.S.S. LifeStyle catalogue lives in the app; physical goods are ordered outside it by email, WhatsApp or Instagram, as Play policy requires.',
      accent: '#0EA5E9',
    },
  ] satisfies TileContent[],
} as const;

export const SOCIAL = {
  eyebrow: '04 — Social',
  title: 'Training is easier with witnesses',
  lede: 'Add friends, see them on a live map, send a bump, keep a one-to-one chat going. Every one of those is off by default and stays off until both people say yes.',
  features: [
    {
      title: 'Friends map',
      body: 'Real-time positions on MapLibre with OpenFreeMap tiles — no map key, no Google Play Services. Sharing runs in a Kotlin foreground service with a permanent notification, so it is never quietly on.',
    },
    {
      title: 'Real-time chat',
      body: 'One-to-one conversations backed by Firestore, with friend requests, bumps and a transparency log that shows you who looked at your position and when.',
    },
    {
      title: 'Consent, enforced server-side',
      body: 'Mutual visibility takes an accepted friendship, sharing switched on, and your global toggle enabled — all three checked in Firestore security rules, not in the app. Revoke it and the data stops flowing at the database, not at the UI.',
    },
  ],
  note: 'Force-quit the app and the foreground service stops with it. That is deliberate: a location notification that outlives the app would be lying about what is being published.',
} as const;

export const COACH = {
  eyebrow: '05 — AI Coach',
  title: 'Advice that has read your diary',
  lede: 'The Coach runs on Google Gemini Flash through a single multimodal endpoint, and every answer is anchored to your profile and your last seven days of real entries — macros, water, steps, workouts. It is the difference between "try to eat more protein" and "you average 96 g against a 150 g target, and 71% of it lands after 18:00".',
  messages: [
    'You hit your step goal five days running — your calorie budget moved with it.',
    'Protein is short on training days, not rest days.',
    'Water is at 1 350 ml by 16:00. That has tracked with your afternoon slump all week.',
    'Two of your last three dinners were logged after 22:00.',
  ],
  quota: [
    { tier: 'Free / No Ads', value: 'Locked' },
    { tier: 'Plus', value: '70 messages / rolling 7 days' },
    { tier: 'Pro & N.O.S.S.', value: 'Unlimited' },
  ],
  rewarded: 'One rewarded video buys 24 hours of Plus-level Coach access, so you can try it before you subscribe.',
} as const;

export interface Tier {
  key: string;
  name: string;
  productId: string | null;
  price: { monthly: string; yearly: string } | null;
  summary: string;
  adds: string[];
  featured?: boolean;
}

export const PRICING = {
  eyebrow: '06 — Pricing',
  title: 'Five tiers, stacked',
  lede: 'Each tier adds to the one below it — Pro is everything in Plus plus its own list, and N.O.S.S. is all of that plus a human being. Nothing you already had is taken away when you move up.',
  tiers: [
    {
      key: 'free',
      name: 'Free',
      productId: null,
      price: null,
      summary: 'The whole diary, at no cost and without an account.',
      adds: [
        'Hybrid food search, online and offline',
        'Barcode scanning across all three sources',
        'Meal diary, water and step tracking',
        'Recipes, workouts and the Food Composer',
        '5 friends · 1 favourite spot · 7 days of history',
      ],
    },
    {
      key: 'no_ads',
      name: 'No Ads',
      productId: 'nutrifit_no_ads',
      price: { monthly: '$1.99', yearly: '$18.99' },
      summary: 'Same app, nothing selling to you.',
      adds: ['Every banner, native and rewarded placement removed'],
    },
    {
      key: 'plus',
      name: 'Plus',
      productId: 'nutrifit_plus',
      price: { monthly: '$9.99', yearly: '$95.99' },
      summary: 'The AI Coach and the social layer, unlocked.',
      adds: [
        'AI Coach — 70 messages per rolling 7 days',
        'Live location sharing',
        'Unlimited friends',
        '30 days of diary history',
      ],
      featured: true,
    },
    {
      key: 'pro',
      name: 'Pro',
      productId: 'nutrifit_pro',
      price: { monthly: '$13.99', yearly: '$134.99' },
      summary: 'Everything the software can give you.',
      adds: [
        'Unlimited AI Coach messages',
        'Unlimited favourite spots',
        'Unlimited history',
        'Priority support',
      ],
    },
    {
      key: 'noss',
      name: 'N.O.S.S. LifeStyle',
      productId: 'nutrifit_noss',
      price: { monthly: '$39.99', yearly: '$383.99' },
      summary: 'Everything in Pro, plus a real coach.',
      adds: ['One-to-one sessions with a human trainer'],
    },
  ] satisfies Tier[],
  footnote:
    'Prices are indicative and exclude tax. Google Play always shows your local price and currency, and every tier is available monthly or yearly.',
} as const;

export const FOOTER = {
  blurb:
    'A calorie, activity and wellness diary built with Expo and React Native. Romanian first, English throughout.',
  columns: [
    {
      title: 'Product',
      links: [
        { label: 'Tracing', href: '#trace' },
        { label: 'Scanning', href: '#scan' },
        { label: 'Explore', href: '#explore' },
        { label: 'Social', href: '#social' },
        { label: 'AI Coach', href: '#coach' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'FAQ', href: '#faq' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'NutriFit on Google Play', href: PRODUCT.playUrl, external: true },
        { label: 'Data sources', href: '#sources' },
        {
          label: 'Open Food Facts',
          href: 'https://world.openfoodfacts.org/',
          external: true,
        },
        {
          label: 'USDA FoodData Central',
          href: 'https://fdc.nal.usda.gov/',
          external: true,
        },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: PRODUCT.privacyUrl, external: true },
        { label: 'Politica de confidențialitate', href: PRODUCT.privacyUrlRo, external: true },
        { label: 'Delete your account', href: PRODUCT.deleteAccountUrl, external: true },
      ],
    },
    {
      title: 'Contact',
      links: [
        { label: PRODUCT.supportEmail, href: `mailto:${PRODUCT.supportEmail}`, external: true },
        {
          label: '1-on-1 coaching requests',
          href: `mailto:${PRODUCT.supportEmail}?subject=N.O.S.S.%20session`,
          external: true,
        },
      ],
    },
  ],
  credits: `Built by ${PRODUCT.developer} · ${PRODUCT.package}`,
} as const;

/* ── Machine-facing identity ────────────────────────────────────────────── */

/**
 * Everything that has to name this site to a machine — the canonical URL, Open
 * Graph, JSON-LD, the sitemap, the web manifest — reads from here rather than
 * hard-coding a host. Moving to a custom domain is one edit and a rebuild.
 */
export interface SocialProfile {
  key: string;
  /** Used as the accessible name — the icons are decorative on their own. */
  label: string;
  /**
   * The profile URL, or an empty string while there is no profile.
   *
   * Empty is a supported state, not a placeholder to be filled in later and
   * forgotten: `SOCIAL_PROFILES_LIVE` filters on it, so a platform with no URL
   * simply has no button and contributes nothing to `sameAs`. That is the same
   * rule the `profiles` note below states, enforced in code rather than trusted
   * to whoever edits this next — a `#` href would ship a button that looks
   * live, does nothing, and quietly tells a crawler the account exists.
   */
  url: string;
  /** Brand colour, used for the hover/press glow. */
  accent: string;
}

/**
 * The company's social accounts, in the order they appear.
 *
 * Ordered by where the audience actually is for a fitness app rather than
 * alphabetically — the first two carry the content, the last two are claims on
 * the name.
 */
export const SOCIAL_PROFILES = [
  {
    key: 'instagram',
    label: 'Instagram',
    url: 'https://www.instagram.com/nutrifitofficialapp/',
    accent: '#E1306C',
  },
  {
    key: 'tiktok',
    // `?lang=en` stripped: it pins the page to English for every visitor, and
    // the app and this site both ship Romanian as well.
    label: 'TikTok',
    url: 'https://www.tiktok.com/@nutrifitapp',
    accent: '#FE2C55',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    // `&sk=directory_personal_details` stripped: that parameter opens a
    // sub-tab of the profile rather than the profile, and `sameAs` wants the
    // canonical URL of the account, not a view of it.
    url: 'https://www.facebook.com/profile.php?id=61593677680169',
    accent: '#1877F2',
  },
  { key: 'x', label: 'X', url: 'https://x.com/NutriFitApp', accent: '#E7E9EA' },
] satisfies SocialProfile[];

/** The ones that exist. Everything that renders or is emitted reads this. */
export const SOCIAL_PROFILES_LIVE: SocialProfile[] = SOCIAL_PROFILES.filter(
  (profile) => profile.url.length > 0
);

export const SITE = {
  origin: 'https://nutrifit-73de0.web.app',
  /** Named as the publisher to crawlers; distinct from the product name. */
  publisher: PRODUCT.developer,
  language: 'en',
  locale: 'en_US',
  /** The app ships Romanian too, and the legal pages exist in both. */
  altLanguage: 'ro',
  altLocale: 'ro_RO',
  /** 1200x630 raster, generated from `public/og.svg` by `npm run assets`. */
  ogImage: '/og.png',
  founded: '2025',
  /**
   * Profiles that are provably the same entity, emitted as `sameAs`.
   *
   * This is what ties the site, the Play listing and the company accounts into
   * one thing a search engine can reason about, so every URL here has to be
   * genuinely ours — a wrong one dilutes the whole cluster. Add the real social
   * profiles as they go live; an empty slot beats a guess.
   */
  profiles: [PRODUCT.playUrl, ...SOCIAL_PROFILES_LIVE.map((p) => p.url)] as string[],
} as const;

/* ── Questions people actually type ─────────────────────────────────────── */

export interface QA {
  q: string;
  a: string;
}

/**
 * The FAQ is on the page for two audiences at once.
 *
 * A reader gets short answers they would otherwise have to infer from six
 * scrolling sections. A search engine — and, increasingly, an answer engine
 * paraphrasing the page rather than linking to it — gets the same facts in the
 * question form people actually type. Every answer here is checkable against
 * the sections above; nothing is invented to catch a keyword.
 */
export const FAQ_CONTENT = {
  eyebrow: '07 — Questions',
  title: 'Straight answers',
  lede: 'What people ask before they install, answered without the marketing voice.',
  items: [
    {
      q: 'Is NutriFit free?',
      a: 'Yes. The Free tier is the whole diary — hybrid food search, barcode scanning across all three databases, meals, water, steps, workouts, recipes and the Food Composer — at no cost and with no account. Paid tiers add the AI Coach, live location sharing, longer history and ad removal.',
    },
    {
      q: 'Do I need an account to use NutriFit?',
      a: 'No. NutriFit starts completely local: your phone is the source of truth and nothing has to reach a server for the diary to work. Signing in is optional, and exists so your profile, goals and custom foods come back when you move to a new device.',
    },
    {
      q: 'Does the barcode scanner work offline?',
      a: 'Search does, and scanning mostly does. Open Food Facts is mirrored into a local SQLite/FTS5 index inside the app, so food search stays instant with the radio off. Products missing from that mirror need a connection so the online lookups can answer.',
    },
    {
      q: 'Which food databases does NutriFit use?',
      a: 'Three, tried in order. Open Food Facts first, for roughly 3.5 million products and no API key. USDA FoodData Central second, for reference-grade nutrition the crowd-sourced set is missing. UPCitemdb last, which resolves the product name and pre-fills the entry form so you only copy the numbers off the label.',
    },
    {
      q: 'How does photo food recognition work in NutriFit?',
      a: 'A photo is downscaled to 768 px and sent to Google Gemini as a single multimodal request — about 260 image tokens in, a structured meal out, two to six seconds round trip. It returns the dish, the portion, the macros and the ingredients it recognised, and every value stays editable before it reaches your diary.',
    },
    {
      q: 'How are calorie and macro targets calculated?',
      a: 'With the Mifflin-St Jeor equation. Your BMR and TDEE come from height, weight, age, sex and activity level, then split into a macro target matching your goal — cut, maintain or gain. The in-app Calorie Calculator runs the same numbers by hand.',
    },
    {
      q: 'Does NutriFit count steps without Google Fit or Health Connect?',
      a: 'Yes. It reads the Android hardware step counter directly, which keeps counting with the app closed and credits the difference when you reopen it. One permission, no Google Fit, no Health Connect, no login.',
    },
    {
      q: 'Is location sharing in NutriFit private?',
      a: 'It is off by default and enforced server-side. Mutual visibility takes an accepted friendship, sharing switched on, and your global toggle enabled — all three checked in Firestore security rules rather than in the app, so revoking one stops the data at the database. Sharing runs in a foreground service with a permanent notification, and a transparency log shows who looked at your position and when.',
    },
    {
      q: 'What does the AI Coach know about me?',
      a: 'Your profile and your last seven days of real entries — macros, water, steps and workouts. That grounding is the point: it is the difference between generic advice and a number pulled from your own week.',
    },
    {
      q: 'Can I try the AI Coach before subscribing?',
      a: 'Yes. One rewarded video buys 24 hours of Plus-level Coach access. Plus itself includes 70 messages per rolling seven days; Pro and N.O.S.S. LifeStyle are unlimited.',
    },
    {
      q: 'Is NutriFit available in Romanian?',
      a: 'Yes — Romanian first, English throughout. Both languages are complete in the app, and the privacy policy is published in both.',
    },
    {
      q: 'Is there an iPhone version of NutriFit?',
      a: 'Not yet. The iOS target is configured but has not been submitted, so Android on Google Play is the only place to install it today. The App Store button says "coming soon" rather than pointing at a listing that does not exist.',
    },
    {
      q: 'How do I delete my NutriFit account and data?',
      a: 'Through the account deletion page linked in the footer, or from inside the app. Because the diary is local first, deleting the account removes the cloud mirror; the copy on your phone stays yours to keep or clear.',
    },
  ] satisfies QA[],
} as const;

/* ── Outbound citations ─────────────────────────────────────────────────── */

export interface Source {
  name: string;
  href: string;
  role: string;
}

/**
 * The projects NutriFit is actually built on, credited and linked.
 *
 * These are citations, not a link farm: every one is a dependency the app
 * genuinely uses. Naming them is the honest thing to do, and it is also the
 * clearest signal a search engine has about the subject of this page.
 */
export const SOURCES = {
  title: 'Built on, and credited',
  lede: 'NutriFit stands on open data and open source. These are the projects behind the numbers.',
  items: [
    {
      name: 'Open Food Facts',
      href: 'https://world.openfoodfacts.org/',
      role: 'The open product database behind barcode lookups and the offline search mirror.',
    },
    {
      name: 'USDA FoodData Central',
      href: 'https://fdc.nal.usda.gov/',
      role: 'Reference nutrition data for anything the crowd-sourced set does not carry.',
    },
    {
      name: 'UPCitemdb',
      href: 'https://www.upcitemdb.com/',
      role: 'Last-resort barcode resolution, used to pre-fill the manual entry form.',
    },
    {
      name: 'Google Gemini',
      href: 'https://deepmind.google/technologies/gemini/',
      role: 'The multimodal model behind photo meal analysis and the AI Coach.',
    },
    {
      name: 'MapLibre',
      href: 'https://maplibre.org/',
      role: 'The open-source map engine the friends map renders with.',
    },
    {
      name: 'OpenFreeMap',
      href: 'https://openfreemap.org/',
      role: 'Free vector tiles, so the map needs no key and no Play Services.',
    },
    {
      name: 'Expo',
      href: 'https://expo.dev/',
      role: 'The React Native toolchain the Android app is built and shipped with.',
    },
    {
      name: 'Mifflin-St Jeor equation',
      href: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
      role: 'The 1990 paper the calorie and macro targets are derived from.',
    },
  ] satisfies Source[],
} as const;
