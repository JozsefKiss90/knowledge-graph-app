// src/components/GraphView/cy/stabilization.js

export function createStabilizer({
  cy,
  wrapperRef,
  scheduleGlowUpdate,
  didInitialAutoFitRef,
  lastContainerSizeRef,
  onDidInitialFit,
}) {
  let stabilizeTimer = 0;
  let ro = null;

  // Track whether we mounted in portrait (graph fitted in portrait viewport)
  let initialWasPortrait = false;
  let didLandscapeRecoveryFit = false;

  // Ensure a pending "fit" cannot be downgraded by a later "resize-only" schedule call
  let pendingDoFit = false;

  const readOrientation = () => {
    const wrap = wrapperRef.current;
    if (!wrap) return { w: 0, h: 0, isPortrait: false };
    const w = wrap.clientWidth || 0;
    const h = wrap.clientHeight || 0;
    // Use a tiny hysteresis to avoid flapping near-square sizes
    const isPortrait = h > w * 1.02;
    return { w, h, isPortrait };
  };

  // Initialize "initialWasPortrait" at creation time (GraphView has rendered wrapperRef)
  try {
    const o = readOrientation();
    if (o.w && o.h) initialWasPortrait = o.isPortrait;
  } catch {
    initialWasPortrait = false;
  }

  const resizeOnly = () => {
    window.requestAnimationFrame(() => {
      try {
        cy.resize();
      } catch {}
      scheduleGlowUpdate();
    });
  };

  const resizeAndFit = () => {
    window.requestAnimationFrame(() => {
      try {
        cy.resize();
      } catch {}

      window.requestAnimationFrame(() => {
        scheduleGlowUpdate();
        try {
          const w = cy.width() || 0;

          const pad =
            w <= 420 ? 14 :
            w <= 700 ? 18 :
            w <= 1100 ? 26 :
            34;

          const visible = cy.elements(":visible");
          cy.fit(visible.length ? visible : cy.elements(), pad);
        } catch {}

        const wasInitial = !didInitialAutoFitRef.current;
        didInitialAutoFitRef.current = true;

        if (wasInitial) {
          try {
            onDidInitialFit?.();
          } catch {}
        }
      });
    });
  };

  const schedule = (doFit) => {
    // Fit takes precedence until executed
    if (doFit) pendingDoFit = true;

    window.clearTimeout(stabilizeTimer);
    stabilizeTimer = window.setTimeout(() => {
      const runFit = pendingDoFit;
      pendingDoFit = false;

      if (runFit) resizeAndFit();
      else resizeOnly();
    }, 120);
  };

  const handleSizeChange = () => {
    const { w, h, isPortrait } = readOrientation();
    if (!w || !h) return;

    const last = lastContainerSizeRef.current;
    const changed = Math.abs(w - last.w) > 1 || Math.abs(h - last.h) > 1;
    if (!changed) return;

    lastContainerSizeRef.current = { w, h };

    // Recovery: if we mounted in portrait, then the first time we become landscape,
    // force a fit so the graph is correctly framed inside the landscape layout.
    if (initialWasPortrait && !didLandscapeRecoveryFit && !isPortrait) {
      didLandscapeRecoveryFit = true;
      schedule(true);
      return;
    }

    // Default behavior: fit only once during initial stabilization
    schedule(!didInitialAutoFitRef.current);
  };

  if (window.ResizeObserver && wrapperRef.current) {
    ro = new ResizeObserver(handleSizeChange);
    ro.observe(wrapperRef.current);
  }

  const cleanup = () => {
    window.clearTimeout(stabilizeTimer);
    try {
      ro?.disconnect?.();
    } catch {}
    ro = null;

    didInitialAutoFitRef.current = false;
    lastContainerSizeRef.current = { w: 0, h: 0 };

    // local variables reset on next createStabilizer() instantiation
  };

  return { schedule, cleanup };
}
