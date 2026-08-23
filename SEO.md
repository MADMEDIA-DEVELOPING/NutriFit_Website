# SEO

Everything a machine reads about this site is generated from one place. This
file records how that works, and what still needs a human.

## One source of truth

`src/lib/content.ts` holds the copy. `src/lib/seo.ts` turns it into the
`<head>` block, the JSON-LD graph, `robots.txt`, `sitemap.xml` and
`site.webmanifest`. Nothing is restated by hand, so the markup cannot claim a
price, a feature or an answer the page does not also show.

Change a price in `content.ts` and the `Offer` in the structured data moves with
it. Add an FAQ entry and it appears both on the page and in the `FAQPage` graph.

`robots.txt`, `sitemap.xml` and `site.webmanifest` are build outputs and live
only in `dist/`. They are not in `public/`, so `npm run dev` serves the HTML
fallback for those paths — expected, and a production-only concern.

To move to a custom domain, edit `SITE.origin` in `content.ts` and rebuild. That
one value feeds the canonical, every absolute URL in the graph, the sitemap and
`robots.txt`.

## The build

```bash
npm run build      # typecheck -> client bundle -> SSR bundle -> prerender
npm run assets     # regenerate og.png and the icons from the SVG sources
```

`npm run build` runs four steps:

1. `tsc --noEmit`
2. `vite build` — the client bundle, into `dist/`
3. `vite build --ssr` — a Node-runnable copy of the same React tree, into
   `dist-ssr/`
4. `scripts/prerender.mjs` — renders it once and writes the result into
   `dist/index.html`, then generates the SEO files and deletes `dist-ssr/`

### Why prerender at all

Vite leaves `dist/index.html` as an empty `<div id="root">`. Google renders
JavaScript and would eventually index it, but it does so on a second pass,
later and with less confidence. Bing, the social scrapers, and the answer
engines now sitting between a search and a click largely do not render at all.

After the prerender the served HTML carries ~32 kB of real page text — every
heading, every answer, every price — before a line of JavaScript runs.

The client does **not** hydrate that markup. `createRoot().render()` mounts a
fresh tree and React clears the container inside the same commit, so there is no
intermediate paint. The prerendered markup includes the loader in its covering
state, which means a reader sees the cover before and after the handover and
never sees the page arrive twice.

### The hidden-text trap

Entrance animations start at `opacity: 0`, and Framer Motion writes that into
the markup as an inline style. Rendered in Node, that baked an invisible copy of
the whole page into the HTML — exactly the pattern a search engine discounts.

`src/lib/env.ts` exports `PRERENDER`, and `Reveal`, `Hero` and `StoreButtons`
render at rest when it is true. If you add a new animated component, give it the
same treatment, and check afterwards:

```bash
node -e "const h=require('fs').readFileSync('dist/index.html','utf8');
console.log((h.match(/opacity:\s*0[;\"]/g)||[]).length)"
```

That number must be `0`.

## What is on the page now

| Piece | Where it comes from |
| --- | --- |
| Title, description, keywords, robots, canonical, hreflang | `buildHeadTags()` |
| Open Graph + Twitter cards, with a **raster** `og:image` | `buildHeadTags()` |
| `Organization`, `WebSite`, `WebPage`, `MobileApplication`, `FAQPage` | `buildJsonLd()` |
| `robots.txt`, `sitemap.xml`, `site.webmanifest` | `buildRobots/Sitemap/Manifest()` |
| 13 answered questions, visible on the page | `FAQ_CONTENT` in `content.ts` |
| Outbound citations to the projects the app uses | `SOURCES` in `content.ts` |
| Cache and security headers | `firebase.json` |

The share card was previously `og.svg`. No share surface renders SVG —
Facebook, LinkedIn, X, Slack, Discord and WhatsApp all ignore it — so links to
this site were previewing with no image at all. `npm run assets` rasterises it.

`aggregateRating` is deliberately **not** in the graph. Google's app rich result
wants one and there is no honest number to put there yet. Once the Play listing
has ratings, add it from the real figure — never from a plausible-looking one.

## Before deploying: check `firebase.json`

This repo had no hosting config, and `nutrifit-73de0.web.app` already serves
`privacy.html`, `confidentialitate.html` and `stergere-cont.html`, which are not
in this repo. **If those pages are deployed from somewhere else to the same
hosting site, `firebase deploy` from here will remove them** — and the Play
listing links to them.

Confirm where they are served from first. If it is the same site, copy them into
`public/` so they are part of `dist/` before deploying.

The config deliberately has no `rewrites` and no `cleanUrls`. There is no
client-side router here, so a catch-all rewrite would turn every typo into a
soft 404, and `cleanUrls` would move `/privacy.html` to `/privacy` and break the
URL the Play listing already points at.

## Still needs a human

1. **A custom domain.** `nutrifit-73de0.web.app` is a Firebase default host. It
   is indexable, but it carries no brand and cannot accumulate authority the way
   `nutrifit.app` or `nutrifit.ro` would. This is the single biggest remaining
   lever. Set `SITE.origin` and rebuild.
2. **Google Search Console and Bing Webmaster Tools.** Verify the domain, submit
   `sitemap.xml`, and watch Coverage for the first month.
3. **Social profiles in `SITE.profiles`.** Only the Play listing is there. Every
   real profile added strengthens the entity cluster — and every wrong one
   weakens it, so add them as they exist and not before.
4. **`.well-known/assetlinks.json`.** Digital Asset Links is a machine-verified
   statement that this domain and the Play app are the same product. It needs
   the app's release signing SHA-256, from Play Console → Setup → App integrity:

   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "com.madmediadeveloping.nutrifit",
       "sha256_cert_fingerprints": ["<SHA-256 from Play Console>"]
     }
   }]
   ```

   Put it at `public/.well-known/assetlinks.json`. It is not shipped with a
   placeholder on purpose: a served file with the wrong fingerprint fails
   verification, which is worse than having no file.
5. **Backlinks.** See below.

## Backlinks

A backlink is a link on **someone else's** site. It cannot be added from this
repository — it has to be earned or submitted, by a person with an account on
the other site. What this repo can do, and now does, is make every link that
does arrive count for more:

- The `Organization` graph declares `sameAs`, which is what lets a search engine
  treat the site, the Play listing and the company's accounts as one entity
  rather than three lookalikes.
- `related_applications` in the manifest states the site → Play pairing.
- The `Built on, and credited` section links out to the eight projects the app
  genuinely depends on, `dofollow`, in context.
- The `citation` array in the app graph says the same thing in machine form.

### The ones actually worth chasing, in order

**1. The projects NutriFit already uses.** These are the highest-quality links
available to this product, because the relationship is real and the sites are
authoritative in exactly this topic.

| Where | What to do |
| --- | --- |
| Open Food Facts | They maintain a public list of apps and reusers of the database. NutriFit qualifies — it uses the API *and* mirrors the dataset. Add it via their wiki / "Who uses Open Food Facts" page. |
| OpenFreeMap | Keeps a public list of projects using its tiles. Ask to be added. |
| MapLibre | Has a showcase / "users" listing for apps built on MapLibre Native. |
| Expo | Runs an app showcase for production apps built with Expo. |

These four are relevant, permanent, and free. They are worth more than fifty
directory listings.

**2. Android and app directories.** Lower value each, but they index fast and
they give the entity its first citations: AlternativeTo, Product Hunt, APKPure /
Aptoide / F-Droid-adjacent listings, Softpedia, AppAdvice-style roundups.
Romanian ones matter disproportionately for a Romanian-first app — local tech
blogs and app roundups compete for far less traffic than the English ones.

**3. Places the product is genuinely discussed.** r/loseit, r/nutrition,
r/androidapps, r/AndroidRO, Romanian fitness forums and Facebook groups. Post as
the developer, say so plainly, and answer questions. Links from these are mostly
`nofollow` and still drive the traffic and brand searches that everything else
compounds from.

**4. Write the thing that gets linked to.** The site currently has one page.
The app's technical story — three-database barcode cascade, an offline
SQLite/FTS5 mirror of Open Food Facts, consent enforced in Firestore rules
rather than in the UI, 260 image tokens per meal photo — is genuinely
interesting to developers, and developer write-ups are what other people link
to. A `/blog` or `/engineering` route would also give this domain more than one
URL to rank, which it badly needs.

### Anchor text

Vary it. A hundred links all reading "calorie counter app" reads as bought.
Roughly: half brand (`NutriFit`, `NutriFit app`), a third natural phrases
(`a food diary that works offline`, `jurnal alimentar cu scanare de coduri de
bare`), the rest bare URLs.

### What not to do

Paid link packages, PBNs, comment-spam and mass directory blasts. Google's link
spam policies discount them at best; at worst they cost the site the rankings it
has. Nothing in this repo does any of it, and nothing should.
