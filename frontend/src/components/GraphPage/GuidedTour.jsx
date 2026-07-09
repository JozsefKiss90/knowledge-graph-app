// src/components/GraphPage/GuidedTour.jsx
//
// A guided, driven product tour built on react-joyride (v3). It walks a first-time
// user across the app's main capabilities — and actively drives the app into the
// right view for each step (graph → dashboard → CORDIS tool panel → back to graph),
// so each feature is shown live in context.
//
// Behaviour:
//  - Auto-starts on every visit until the user opts out — enabled by default.
//  - ONLY "Don't show again" (the Skip button) sets the localStorage flag that
//    permanently suppresses auto-start. Finishing the tour or closing it (Done /
//    ESC) just ends it for this visit, so it returns next time.
//  - Always re-triggerable from the Help page via /?tour=1.
//
// Styling: the tooltip is a custom component (GuidedTourTooltip) reskinned to the
// app's blue-glass landing chrome via _guided-tour.scss. react-joyride still owns
// the overlay, spotlight and arrow (themed through `options`/`styles`).
//
// All step targets are stable CSS classes that already exist in the app, so the tour
// needs no markup changes elsewhere. Targets that only exist in another view (the
// dashboard, the tool panel) are reached by driving the view first; react-joyride's
// `targetWaitTimeout` waits for the just-mounted element before showing the step.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Joyride, ACTIONS, EVENTS, STATUS } from "react-joyride";
import { useLocation, useNavigate } from "react-router-dom";

import { useDarkMode } from "../context/DarkModeContext";

// v2: the opt-out semantics changed — only "Don't show again" suppresses the tour
// now (v1 also suppressed on finish). Bumping the key gives everyone a clean slate
// under the new default so it's genuinely on-by-default until explicitly dismissed.
const TOUR_FLAG = "kg_guided_tour_dismissed_v2";

// Each step carries a `view` describing the app state to drive into before it shows.
const STEPS = [
  {
    target: "body",
    placement: "center",
    title: "Welcome to the EU Knowledge Graph",
    content:
      "Take a quick tour of how to explore EU research funding — from Horizon Europe calls to the real CORDIS funded-project evidence behind them. You can leave any time, and re-open this tour later from the Help page.",
    view: { mode: "graph", legend: true },
  },
  {
    target: ".legend-filters-panel",
    placement: "right",
    title: "1 · Choose a programme",
    content:
      "This is your Filters & Controls panel. Use the Graph Dataset tree to pick a programme — Horizon Europe and its clusters, or Digital Europe, Erasmus+, Creative Europe and more. You can also toggle node types, search nodes, and reset filters here.",
    view: { mode: "graph", legend: true },
  },
  {
    target: ".graph-main",
    placement: "auto",
    title: "2 · Explore the graph",
    content:
      "Click a node to drill down: Funding Programmes → pillars → clusters → destinations → individual calls. Each level stays uncluttered, so you can follow a theme all the way to a single call.",
    view: { mode: "graph" },
  },
  {
    target: ".kg-commandbar",
    placement: "bottom",
    title: "3 · Find your way around",
    content:
      "The command bar holds your breadcrumbs and a Level indicator — click a breadcrumb to step back out. From here you can also search (⌘K), switch between Force-Directed and Hierarchical layouts, and open the Portfolio Dashboard.",
    view: { mode: "graph" },
  },
  {
    target: ".graph-main",
    placement: "auto",
    title: "4 · Open a call",
    content:
      "Hover a node for a quick summary; on a call, click “View Details” for budgets, deadlines and the official EU portal link. Where available you’ll also see CORDIS evidence — the real funded projects, organisations and funding behind that call’s research area. Handy for finding a call to apply to, or seeing who’s already been funded.",
    view: { mode: "graph" },
  },
  {
    target: ".sidebar-controls",
    placement: "left",
    title: "5 · Quick tools",
    content:
      "This icon rail holds your tools: the Timeline scrubber, Compare programmes, a Funded landscape shortcut (research fields, country activity and hop-on, all in one place), your Bookmarks, and light/dark mode.",
    view: { mode: "graph" },
  },
  {
    target: ".dash-offerstrip",
    placement: "top",
    title: "6 · The Portfolio Dashboard",
    content:
      "The dashboard is your monitoring hub — open & upcoming calls, a deadline runway, funding by programme, and this on-offer vs funded summary. Where CORDIS data is available, the funded side shows real awarded euros, organisations and countries — never estimates.",
    view: { mode: "dashboard", panel: null },
  },
  {
    target: ".dash-tool-panel__header",
    placement: "auto",
    title: "7 · CORDIS research tools",
    content:
      "Three deeper tools live here as tabs: browse the research-field hierarchy, see a country’s funded activity (it can even tint the graph), or find Hop-on host projects a widening-country partner could still join.",
    view: { mode: "dashboard", panel: "fields" },
  },
  {
    target: ".chatbot__fab",
    placement: "left",
    title: "8 · Ask in plain language",
    content:
      "Click the sparkle button to ask AI search a question about Horizon Europe 2026–2027 calls — for example, “climate calls in cluster 5 closing after September 2026” — and have the matches highlighted right on the graph.",
    view: { mode: "graph", panel: null },
  },
  {
    target: "body",
    placement: "center",
    title: "You’re all set 🎉",
    content:
      "That’s the tour. Click any node to start exploring — and you can re-open this walkthrough any time from the Help & Documentation page.",
    view: { mode: "graph" },
  },
];

// react-joyride should only receive its own recognised step fields.
const joyrideSteps = STEPS.map(({ view, ...step }) => ({
  ...step,
  disableBeacon: true,
}));

// Custom tooltip so the tour matches the app's blue-glass landing chrome instead
// of react-joyride's generic white card. react-joyride passes button props
// (backProps/primaryProps/skipProps — each already carries its label as
// `children` and its onClick), plus the current step data and index/size.
// Rendered through a portal, but React context still flows, so useDarkMode() works.
function GuidedTourTooltip({
  backProps,
  primaryProps,
  skipProps,
  tooltipProps,
  index,
  size,
  step,
}) {
  const { darkMode } = useDarkMode();
  const pct = size > 0 ? Math.round(((index + 1) / size) * 100) : 0;

  return (
    <div
      className={`kg-tour ${darkMode ? "kg-tour--dark" : "kg-tour--light"}`}
      {...tooltipProps}
    >
      <div className="kg-tour__progress" aria-hidden="true">
        <span className="kg-tour__progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="kg-tour__body">
        <div className="kg-tour__eyebrow">
          Guided tour · {index + 1} of {size}
        </div>
        {step.title ? <h2 className="kg-tour__title">{step.title}</h2> : null}
        <div className="kg-tour__content">{step.content}</div>
      </div>

      <div className="kg-tour__footer">
        {/* label comes from locale via `children` on skipProps */}
        <button type="button" className="kg-tour__skip" {...skipProps} />
        <div className="kg-tour__actions">
          {index > 0 ? (
            <button
              type="button"
              className="kg-tour__btn kg-tour__btn--back"
              {...backProps}
            />
          ) : null}
          <button
            type="button"
            className="kg-tour__btn kg-tour__btn--primary"
            {...primaryProps}
          />
        </div>
      </div>
    </div>
  );
}

export default function GuidedTour({
  setViewMode,
  setDashboardPanel,
  setIsLegendCollapsed,
}) {
  const { darkMode } = useDarkMode();
  const location = useLocation();
  const navigate = useNavigate();

  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const startedRef = useRef(false);

  // Drive the app into the view a given step needs.
  const applyView = useCallback(
    (view) => {
      if (!view) return;
      if (view.mode) setViewMode(view.mode);
      // A tool panel only matters on the dashboard steps; default to closed elsewhere.
      setDashboardPanel(view.panel ?? null);
      if (view.legend !== undefined) setIsLegendCollapsed(!view.legend);
    },
    [setViewMode, setDashboardPanel, setIsLegendCollapsed]
  );

  const start = useCallback(() => {
    setStepIndex(0);
    applyView(STEPS[0].view);
    setRun(true);
  }, [applyView]);

  // End the tour. `persist` = true writes the opt-out flag so it never
  // auto-starts again; false just closes it for this visit (it returns next
  // time). Only the "Don't show again" button persists — see handleEvent.
  const close = useCallback(
    (persist) => {
      setRun(false);
      setStepIndex(0);
      if (persist) {
        try {
          localStorage.setItem(TOUR_FLAG, "1");
        } catch {}
      }
      // Leave the app clean: back on the graph with no tool panel open.
      setViewMode("graph");
      setDashboardPanel(null);
    },
    [setViewMode, setDashboardPanel]
  );

  // Start the tour — forced via ?tour=1 (the Help-page button) or automatically on a
  // first visit (unless previously dismissed).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const forced = params.get("tour") === "1";

    if (startedRef.current && !forced) return;

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(TOUR_FLAG) === "1";
    } catch {}

    if (forced) {
      startedRef.current = true;
      // Drop the query param so a refresh doesn't restart the tour.
      navigate("/", { replace: true });
      start();
    } else if (!dismissed) {
      startedRef.current = true;
      const t = setTimeout(start, 900); // let the graph settle before the welcome step
      return () => clearTimeout(t);
    }
  }, [location.search, navigate, start]);

  const handleEvent = useCallback(
    (data) => {
      const { action, index, status, type } = data;

      // Permanent opt-out — ONLY the "Don't show again" (Skip) button. Checked
      // first so it wins over the step-advance branch below.
      if (status === STATUS.SKIPPED || action === ACTIONS.SKIP) {
        close(true);
        return;
      }
      // Finished the tour (Done on the last step) or closed via ESC — end it for
      // this visit only, so it auto-starts again next time.
      if (status === STATUS.FINISHED || action === ACTIONS.CLOSE) {
        close(false);
        return;
      }
      // Advance (or step back) once a step closes, or if a target couldn't be found.
      if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
        const next = index + (action === ACTIONS.PREV ? -1 : 1);
        if (next < 0 || next >= STEPS.length) {
          close(false);
          return;
        }
        applyView(STEPS[next].view);
        setStepIndex(next);
      }
    },
    [applyView, close]
  );

  // The tooltip's own look lives in _guided-tour.scss (GuidedTourTooltip). Here we
  // only theme the parts react-joyride still owns: overlay, spotlight and arrow.
  const options = useMemo(
    () => ({
      primaryColor: darkMode ? "#47a9ff" : "#1f6feb", // loader spinner while a target mounts
      arrowColor: darkMode ? "#12274a" : "#ffffff",
      overlayColor: darkMode ? "rgba(3,8,18,0.62)" : "rgba(16,35,92,0.3)",
      width: 410,
      zIndex: 13000,
      spotlightPadding: 8,
      spotlightRadius: 10,
      showProgress: false, // progress lives in the tooltip's eyebrow + bar
      skipBeacon: true,
      overlayClickAction: false, // don't dismiss when clicking the backdrop
      dismissKeyAction: "close", // ESC ends the tour (for this visit only)
      targetWaitTimeout: 3500, // wait for a just-switched view's target to mount
    }),
    [darkMode]
  );

  // Drop react-floater's default drop-shadow so it doesn't double up with the
  // card's own shadow.
  const styles = useMemo(() => ({ floater: { filter: "none" } }), []);

  const locale = useMemo(
    () => ({
      back: "Back",
      last: "Done",
      next: "Next",
      skip: "Don't show again",
    }),
    []
  );

  return (
    <Joyride
      steps={joyrideSteps}
      run={run}
      stepIndex={stepIndex}
      continuous
      onEvent={handleEvent}
      options={options}
      styles={styles}
      locale={locale}
      tooltipComponent={GuidedTourTooltip}
    />
  );
}
