// Shared assertion for the dashboard redesign's banned-mechanism-string tests (min-test 8).
//
// CLAUDE.md's brand constraints ban mechanism words user-facing ("graph" above all — the repo
// codename must never surface as product copy), so each dashboard-owned surface asserts the same
// thing: nothing an eye or a screen reader picks up says "graph". Each slice applies it to its own
// surface; this keeps the sweep itself defined once.
//
// Note it scans STATIC copy — render the surface with stub/empty data. The match is on the whole
// word (plus the "subgraph" compound): legitimate domain words that merely contain the substring
// ("Geography", "demography", "cryptography", "geographic information systems") are not
// mechanism language.

const BANNED = /\b(?:sub)?graphs?\b/i;

/**
 * Assert a rendered surface carries no mechanism language: neither in its visible text nor in what
 * assistive technology reads (aria-* and title attributes).
 *
 * @param {HTMLElement} container the render result's container
 */
export function expectNoMechanismCopy(container) {
  expect(container.textContent).not.toMatch(BANNED);
  // eslint-disable-next-line testing-library/no-node-access
  for (const el of container.querySelectorAll("*")) {
    for (const attr of el.attributes) {
      if (attr.name.startsWith("aria-") || attr.name === "title") {
        expect(attr.value).not.toMatch(BANNED);
      }
    }
  }
}
