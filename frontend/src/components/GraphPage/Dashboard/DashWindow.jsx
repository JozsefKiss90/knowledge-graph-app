import React, { useEffect, useRef } from "react";
import { useMediaQuery } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";

// rgba tint of a hex accent (mockup helper) — used for the header gradient + icon glow so
// each theme window carries its own accent without hardcoding per-window CSS.
function tint(hex, a) {
  const h = (hex || "#7551FF").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Draggable / focusable / closable floating window shell for the dashboard's
 * "Explore by theme" layer. Pure chrome — the real reused dashboard component is passed as
 * `children` (its own `.dash-card` chrome is collapsed by `.dash-window__body .dash-card`
 * in SCSS so it reads as one panel). Ports the mockup's window markup.
 *
 * Below the `lg` breakpoint the whole layer restacks into a scrolling column of full-width
 * cards (see `.dash-windows-layer--stacked`); in that mode we drop the fixed px position/size
 * so CSS owns layout, and disable dragging (there is nowhere to drag to).
 *
 * @param {object} win    view-model from useDraggableWindows().mkWin(key):
 *                        { open, left, top, z, onDrag, onClose, onFocus }
 * @param {string} winKey the window's manager key; the dialog's DOM ids for label/description
 *                        wiring derive from it (`dash-window-<winKey>`)
 * @param {string} title
 * @param {string} subtitle
 * @param {React.ElementType} icon   MUI icon component (rendered in the grab header)
 * @param {string} accent            hex accent colour for the window
 * @param {number} width             window width in px (ignored when stacked)
 * @param {React.ReactNode} children body content
 */
export default function DashWindow({
  win,
  winKey,
  title,
  subtitle,
  icon: Icon,
  accent = "#7551FF",
  width = 460,
  children,
}) {
  const stacked = useMediaQuery((theme) => theme.breakpoints.down("lg"));

  // Focus the dialog container when the window opens (windows only open from an explicit
  // launcher activation), so keyboard users land inside the window they just asked for.
  const rootRef = useRef(null);
  const isOpen = !!(win && win.open);
  useEffect(() => {
    if (isOpen) rootRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  // Stacked: let CSS own position + width; floating: place by the drag manager's px.
  const style = stacked
    ? { zIndex: win.z, "--win-accent": accent }
    : { left: win.left, top: win.top, width, zIndex: win.z, "--win-accent": accent };

  const id = `dash-window-${winKey}`;
  const titleId = `${id}-title`;
  const descId = subtitle ? `${id}-desc` : undefined;

  // Escape anywhere inside the window closes it (the handler is on the dialog root, so only
  // the window that owns focus reacts). Stop propagation so an outer surface — e.g. the
  // graph page's own Escape handling — doesn't also act on the same keypress.
  const onKeyDown = (e) => {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    win.onClose();
  };

  return (
    <div
      ref={rootRef}
      id={id}
      className={`dash-window${stacked ? " dash-window--stacked" : ""}`}
      style={style}
      onPointerDown={stacked ? undefined : win.onFocus}
      onKeyDown={onKeyDown}
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={descId}
      tabIndex={-1}
    >
      <div
        className="dash-window__header"
        style={{
          background: `linear-gradient(180deg, ${tint(accent, 0.16)}, transparent)`,
          cursor: stacked ? "default" : "grab",
        }}
        onPointerDown={stacked ? undefined : win.onDrag}
      >
        {Icon && (
          <span className="dash-window__icon" style={{ color: accent }}>
            <Icon fontSize="inherit" />
          </span>
        )}
        <div className="dash-window__titles">
          <div className="dash-window__title" id={titleId}>
            {title}
          </div>
          {subtitle && (
            <div className="dash-window__subtitle" id={descId}>
              {subtitle}
            </div>
          )}
        </div>
        {!stacked && (
          <DragIndicatorIcon className="dash-window__drag" fontSize="inherit" aria-hidden />
        )}
        <IconButton
          className="dash-window__close"
          size="small"
          onClick={win.onClose}
          aria-label={`Close ${title}`}
        >
          <CloseIcon fontSize="inherit" />
        </IconButton>
      </div>
      {/* The body scrolls when content overflows (max-height in SCSS), so it takes a tab stop
          of its own — keyboard users can reach and arrow-scroll it even when the content has
          no focusable elements. */}
      <div
        className="dash-window__body"
        role="region"
        aria-labelledby={titleId}
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}
