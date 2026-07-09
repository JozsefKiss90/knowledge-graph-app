// src/components/GraphView/cy/stabilization.js

import { fitToViewport } from "./fitViewport";

// Re-fit when a container dimension changes by at least this fraction relative
// to its size at the last fit. Large changes (rotation, window resize, opening
// a wide in-flow panel) reframe the graph; small nudges (scrollbar, mobile
// address-bar show/hide) stay resize-only so the user's pan/zoom is preserved.
const REFIT_RATIO = 0.18;

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

  // Container size (from readOrientation) captured at the last fit; future
  // resizes are measured against this to decide whether to re-fit.
  let lastFitSize = { w: 0, h: 0 };

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

        // Single framing authority (container-width padding + upper zoom clamp).
        fitToViewport(cy, { reason: "stabilize" });

        // Remember the size we just fitted to, for future delta comparisons.
        const o = readOrientation();
        lastFitSize = { w: o.w, h: o.h };

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

    // Until the first auto-fit has run, always fit.
    if (!didInitialAutoFitRef.current) {
      schedule(true);
      return;
    }

    // Recovery: if we mounted in portrait, the first time we become landscape
    // force a fit so the graph is correctly framed in the landscape layout.
    if (initialWasPortrait && !didLandscapeRecoveryFit && !isPortrait) {
      didLandscapeRecoveryFit = true;
      schedule(true);
      return;
    }

    // Re-fit on a *significant* change (orientation flip, or a dimension past
    // REFIT_RATIO relative to the last fit); otherwise resize only so the
    // user's manual pan/zoom is preserved.
    const fw = lastFitSize.w || w;
    const fh = lastFitSize.h || h;
    const wDelta = Math.abs(w - fw) / fw;
    const hDelta = Math.abs(h - fh) / fh;
    const orientationFlipped = (fw >= fh) !== (w >= h);

    schedule(orientationFlipped || wDelta >= REFIT_RATIO || hDelta >= REFIT_RATIO);
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
    lastFitSize = { w: 0, h: 0 };

    // local variables reset on next createStabilizer() instantiation
  };

  return { schedule, cleanup, handleSizeChange };
}
