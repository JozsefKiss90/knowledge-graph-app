export function createStabilizer({
  cy,
  wrapperRef,
  scheduleGlowUpdate,
  didInitialAutoFitRef,
  lastContainerSizeRef,
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
          const pad = w < 900 ? 30 : 60;
          const visible = cy.elements(":visible");
          cy.fit(visible.length ? visible : cy.elements(), pad);
        } catch {}
        didInitialAutoFitRef.current = true;
      });
    });
  };

  const schedule = (doFit) => {
    window.clearTimeout(stabilizeTimer);
    stabilizeTimer = window.setTimeout(() => {
      if (doFit) resizeAndFit();
      else resizeOnly();
    }, 180);
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

      // Fit only once during initial stabilization
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
