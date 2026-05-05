import { useCallback, useEffect, useRef } from "react";

export function useLegendFit({ cyInstance, isLegendCollapsed }) {
  const didMountRef = useRef(false);
  const fitDebounceRef = useRef(null);

  const debouncedFit = useCallback(
    (opts = { padding: 60 }) => {
      if (!cyInstance || cyInstance.destroyed?.()) return;

      window.clearTimeout(fitDebounceRef.current);

      fitDebounceRef.current = window.setTimeout(() => {
        if (!cyInstance || cyInstance.destroyed?.()) return;
        try {
          cyInstance.resize();
          cyInstance.fit({ eles: cyInstance.elements(":visible"), ...opts });
        } catch {}
      }, 150);
    },
    [cyInstance]
  );

  useEffect(() => () => window.clearTimeout(fitDebounceRef.current), []);

  useEffect(() => {
    if (!cyInstance || cyInstance.destroyed?.()) return;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    debouncedFit({ padding: 60 });
  }, [isLegendCollapsed, cyInstance, debouncedFit]);
}
