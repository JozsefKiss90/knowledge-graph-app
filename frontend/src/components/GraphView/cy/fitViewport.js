// src/components/GraphView/cy/fitViewport.js
//
// Single source of truth for framing the graph inside its container.
//
// Previously two independent routines fit the graph with DIFFERENT padding
// tables and CONTRADICTORY zoom clamps, and raced on mount:
//   - applyResponsiveViewport (GraphView.jsx): mobile pad 180, minZoom 0.8 /
//     maxZoom 0.7 (max < min — a bug), viewport-based mobile detection.
//   - resizeAndFit (stabilization.js): width-based pad, but minZoom = 1 — which
//     forced zoom back to 1.0 exactly when the graph was larger than the
//     container (the small-screen case), clipping it instead of fitting.
//
// This helper replaces both. Padding is derived from the actual container
// width (not the viewport), so narrow/mobile containers get tight padding for
// free. The only zoom clamp is an UPPER bound (so sparse graphs don't magnify
// absurdly); there is deliberately NO lower clamp, so a graph bigger than its
// container is allowed to zoom out and fit.

// Container-width-based fit padding. Narrower container -> less padding.
export function computeFitPadding(cy) {
  const w = (cy && cy.width && cy.width()) || 0;
  if (w <= 420) return 14;
  if (w <= 700) return 20;
  if (w <= 1100) return 28;
  return 36;
}

// Upper zoom bound so a handful of nodes don't render enormous after fit.
function maxZoomForCount(count) {
  if (count <= 2) return 1.6;
  if (count <= 3) return 1.4;
  if (count <= 5) return 1.2;
  return 1.35;
}

// Frame the visible elements inside the container.
//   opts.reason   - debug label (unused at runtime; kept for call-site clarity)
//   opts.eles     - explicit element collection to fit (defaults to :visible)
//   opts.animate  - animate the fit (used by the manual "Fit" button)
export function fitToViewport(cy, opts = {}) {
  if (!cy || (cy.destroyed && cy.destroyed())) return;

  const requested = opts.eles || cy.elements(":visible");
  const fitTarget = requested && requested.length ? requested : cy.elements();
  if (!fitTarget || fitTarget.empty()) return;

  const pad = computeFitPadding(cy);

  if (opts.animate) {
    try {
      cy.animate({ fit: { eles: fitTarget, padding: pad }, duration: 300 });
    } catch {
      try {
        cy.fit(fitTarget, pad);
      } catch {}
    }
    return;
  }

  try {
    cy.fit(fitTarget, pad);
  } catch {
    return;
  }

  // Clamp only the upper bound; allow zoom < 1 so dense graphs can fit on small
  // screens. cy's own minZoom (set at construction) is the hard floor.
  try {
    const count = cy.nodes(":visible").length;
    const maxZoom = maxZoomForCount(count);
    if (cy.zoom() > maxZoom) cy.zoom(maxZoom);
    cy.center(fitTarget);
  } catch {}
}
