import { useCallback, useEffect, useState } from "react";

// Lazy-load helper (plan 12, Part C). Returns [ref, inView]: attach `ref` to the element to watch; `inView`
// flips true once that element scrolls within `rootMargin` of the viewport. Used to defer a below-the-fold
// dashboard widget's data fetch until its card is about to be seen, so a cold dashboard load doesn't fire
// every CORDIS endpoint at once.
//
// `ref` is a *callback* ref (not a useRef object) so the observer re-attaches correctly when the watched
// card is conditionally mounted — the CORDIS section only renders once the F1 summary confirms data, so the
// element appears after this hook's first render. `inView` LATCHES true and never flips back: we don't want
// to tear down a widget's loaded data when the user scrolls it back out of view. Where IntersectionObserver
// is unavailable (very old browsers, SSR/jsdom) it degrades to eager (inView true immediately) so data
// always loads.
export default function useInView({ rootMargin = "240px" } = {}) {
  const [inView, setInView] = useState(false);
  const [node, setNode] = useState(null);
  const ref = useCallback((el) => setNode(el), []);

  useEffect(() => {
    if (!node || inView) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [node, inView, rootMargin]);

  return [ref, inView];
}
