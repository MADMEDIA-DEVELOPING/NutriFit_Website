/**
 * True while the page is being rendered by `scripts/prerender.mjs` in Node,
 * false in any browser.
 *
 * Entrance animations start from `opacity: 0`, and Framer Motion writes that
 * starting state into the markup as an inline style. Rendered in Node that
 * would bake it into the served HTML, so every crawler that does not run
 * JavaScript — and Google's own first pass, before it queues the page for
 * rendering — would read the whole page as invisible text. Text styled out of
 * sight is text a search engine discounts, and it is a fair thing for it to
 * discount, so the prerender pass renders everything at rest instead.
 *
 * There is no hydration to mismatch: the client mounts a fresh tree over this
 * markup rather than adopting it, so the browser still plays every animation
 * from its proper starting state.
 */
export const PRERENDER = typeof window === 'undefined';
