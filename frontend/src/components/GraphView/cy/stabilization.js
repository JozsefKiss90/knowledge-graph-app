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

        // Smaller padding => more zoom.
        // Keep a floor so labels/nodes don't clip on tiny viewports.
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

        // Reveal UI only after the first completed fit (prevents visible "jump")
        if (wasInitial) {
          try {
            onDidInitialFit?.();
          } catch {}
        }
      });
    });
  };

  const schedule = (doFit) => {
    window.clearTimeout(stabilizeTimer);
    stabilizeTimer = window.setTimeout(() => {
      if (doFit) resizeAndFit();
      else resizeOnly();
    }, 120);
  };

  if (window.ResizeObserver && wrapperRef.current) {
    ro = new ResizeObserver(() => {
      const wrap = wrapperRef.current;
      if (!wrap) return;

      const w = wrap.clientWidth || 0;
      const h = wrap.clientHeight || 0;
      if (!w || !h) return;

      const last = lastContainerSizeRef.current;
      const changed = Math.abs(w - last.w) > 1 || Math.abs(h - last.h) > 1;
      if (!changed) return;

      lastContainerSizeRef.current = { w, h };

      // Fit only once during initial stabilization; afterwards only resize (no viewport jump)
      schedule(!didInitialAutoFitRef.current);
    });

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
  };

  return { schedule, cleanup };
}
