import React, { useMemo, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useMediaQuery } from "@mui/material";

import DashboardCustomizeIcon from "@mui/icons-material/DashboardCustomize";
import BarChartIcon from "@mui/icons-material/BarChart";
import StackedBarChartIcon from "@mui/icons-material/StackedBarChart";
import PublicIcon from "@mui/icons-material/Public";
import GroupsIcon from "@mui/icons-material/Groups";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BubbleChartIcon from "@mui/icons-material/BubbleChart";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import { useDashboardData } from "./useDashboardData";
import useCordisPortfolio from "./useCordisPortfolio";
import useFundingByProgramme, { mapAwardedToProgrammeKeys } from "./useFundingByProgramme";
import useCordisPortfolioTrend from "./useCordisPortfolioTrend";
import useCordisFieldTree from "../CordisFields/useCordisFieldTree";
import useCountryActivity from "../CountryActivity/useCountryActivity";
import useTopOrganisations from "./useTopOrganisations";
import useDraggableWindows from "./useDraggableWindows";

import CordisEmptyState from "../CordisEvidence/CordisEmptyState";
import CordisActivityTrend from "./CordisActivityTrend";
import CordisFieldMix from "./CordisFieldMix";
import CordisCountryLeaderboard from "./CordisCountryLeaderboard";
import CordisTopOrgs from "./CordisTopOrgs";
import DashboardToolPanel from "./DashboardToolPanel";
import FundingByProgramme from "./FundingByProgramme";
import CallsOverTime from "./CallsOverTime";
import DeadlineRunway from "./DeadlineRunway";
import OfferFundedStrip from "./OfferFundedStrip";
import TopicDistribution from "./TopicDistribution";
import OpenCallsTable from "./OpenCallsTable";
import SavedSearches from "./SavedSearches";
import SavedViews from "./SavedViews";
import DashCardSkeleton from "./DashCardSkeleton";
import DashWindow from "./DashWindow";

// The "Explore by theme" windows. Each opens a draggable DashWindow holding a reused dashboard
// component. `accent` colours the window header; the pills themselves share one blue-glass active
// style (the redesign is single-accent). `saved` is pulled out and right-aligned in the bar.
const THEMES = [
  { key: "funding", label: "Funding", icon: BarChartIcon, accent: "#47a9ff", width: 480 },
  { key: "funded", label: "Funded activity", icon: StackedBarChartIcon, accent: "#34d399", width: 540 },
  { key: "geography", label: "Geography", icon: PublicIcon, accent: "#60A5FA", width: 480 },
  { key: "orgs", label: "Organisations", icon: GroupsIcon, accent: "#F472B6", width: 460 },
  { key: "fields", label: "Fields & topics", icon: AccountTreeIcon, accent: "#22C55E", width: 460 },
  { key: "topics", label: "Topics", icon: BubbleChartIcon, accent: "#22D3EE", width: 460 },
  { key: "saved", label: "Saved", icon: BookmarkIcon, accent: "#FBBF24", width: 440 },
];

const WIN_KEYS = THEMES.map((t) => t.key);
const INITIAL_POS = {
  funding: { x: 470, y: 150 },
  funded: { x: 360, y: 120 },
  geography: { x: 380, y: 160 },
  orgs: { x: 430, y: 175 },
  fields: { x: 360, y: 150 },
  topics: { x: 300, y: 140 },
  saved: { x: 520, y: 190 },
};

/**
 * Gate for a CORDIS window body, honouring the hide-when-empty guardrail in every state:
 *  - no CORDIS ingested at all → the honest "what's been funded" teaser,
 *  - fetch failed → an honest "couldn't load" empty-state (not a perpetual skeleton),
 *  - fetch in flight → skeleton,
 *  - ingested but this view has no rows yet (e.g. projects present but not yet EuroSciVoc
 *    classified) → an honest empty-state, NEVER a window with blank chrome,
 *  - otherwise the real widget.
 * `hasRows` is the per-window non-empty predicate (a truthy-but-empty payload must not slip
 * through as renderable, since the reused widgets self-return null on empty data).
 */
function CordisGate({ active, loading, error, data, hasRows, children }) {
  if (!active) {
    return (
      <CordisEmptyState>
        Real awarded projects, organisations and countries appear here once EU funded-project
        data (CORDIS) is ingested. We only ever show real funded-project figures — never
        estimates.{" "}
        <Link to="/about" className="dash-cordis-teaser__help">
          Learn how this works
        </Link>
      </CordisEmptyState>
    );
  }
  if (error) {
    return (
      <CordisEmptyState compact>
        We couldn't load this CORDIS data right now. Try reopening the window.
      </CordisEmptyState>
    );
  }
  if (loading || !data) return <DashCardSkeleton />;
  if (hasRows === false) {
    return (
      <CordisEmptyState compact>
        No funded-project rows for this view yet.
      </CordisEmptyState>
    );
  }
  return children;
}

export default function PortfolioDashboard({
  loadFromStore,
  graphStats,
  setViewMode,
  dashboardPanel,
  setDashboardPanel,
  countryOverlayCode,
  setCountryOverlayCode,
  onLocateCall,
  locateCall,
  savedViews,
  onApplySavedView,
  onDeleteSavedView,
}) {
  const data = useDashboardData(loadFromStore);
  const cordis = useCordisPortfolio();
  // Gate the whole CORDIS layer on real data: an empty graph yields an all-zero summary, so we
  // fall back to planned-only KPIs and show the honest empty-state in windows rather than zeros.
  const cordisActive = !!cordis.data && (cordis.data.projectCount || 0) > 0;

  // Floating-window manager — drives which theme windows are open (and therefore which CORDIS
  // fetches fire, see below).
  const { open, toggle, mkWin } = useDraggableWindows(WIN_KEYS, INITIAL_POS);
  // The portaled layer only exists while a window is open: when stacked (below lg) it dims and
  // captures the whole viewport, so an always-mounted layer would block the dashboard on arrival.
  const anyWindowOpen = WIN_KEYS.some((k) => open[k]);

  // Closing a window (close button or Escape) hands focus back to the pill that launched it,
  // so keyboard users aren't dropped at the top of the document when the dialog unmounts.
  const launcherRefs = useRef({});
  const setLauncherRef = (key) => (el) => {
    launcherRefs.current[key] = el;
  };
  const windowFor = (key) => {
    const w = mkWin(key);
    return {
      ...w,
      onClose: () => {
        w.onClose();
        launcherRefs.current[key]?.focus();
      },
    };
  };

  // Below lg the floating windows restack into a scrolling column (see DashWindow +
  // .dash-windows-layer--stacked) so none of them land off-screen on tablets/phones.
  const stacked = useMediaQuery((theme) => theme.breakpoints.down("lg"));

  // The calls list doubles as a filter target. `callFilter` is null (default next-deadlines
  // slice), "open" (all open & forthcoming calls) or "closing30" (calls closing within 30 days).
  const [callFilter, setCallFilter] = useState(null);
  const tableRows = useMemo(() => {
    const byDeadline = (a, b) => (a.closeDate || Infinity) - (b.closeDate || Infinity);
    if (callFilter === "open") return [...(data.monitoredCallsList || [])].sort(byDeadline);
    if (callFilter === "closing30") return [...(data.closingIn30dList || [])].sort(byDeadline);
    return data.upcomingCalls;
  }, [callFilter, data.monitoredCallsList, data.closingIn30dList, data.upcomingCalls]);

  // Open + forthcoming — the full non-closed set the table's subtitle and the Saved
  // quick filter both describe.
  const monitoredCount = data.openCalls + data.forthcomingCalls;

  // A country-leaderboard row composes the overlay selection with a jump to the country tool.
  const handleSelectCountry = useCallback(
    (code) => {
      setCountryOverlayCode(code);
      setDashboardPanel("country");
    },
    [setCountryOverlayCode, setDashboardPanel]
  );

  // F2: per-programme awarded totals. Kept EAGER (gated only on cordisActive, not on a window
  // being open): FundingByProgramme paints planned bars immediately and derives its Awarded/Both
  // tab state from whether awarded data exists, so deferring it would mislead. Endpoint is
  // server-cached, so eager-fetching is cheap.
  const funding = useFundingByProgramme(cordisActive);
  const awardedByProgrammeKey = useMemo(
    () => mapAwardedToProgrammeKeys(funding.data),
    [funding.data]
  );

  // Open-gated CORDIS fetches: each window's data loads when it is first opened (and only if
  // CORDIS is active), replacing the old in-view sentinels.
  const trend = useCordisPortfolioTrend(cordisActive && open.funded);
  const fieldTree = useCordisFieldTree("default", cordisActive && open.fields);
  const countryActivity = useCountryActivity("", cordisActive && open.geography);
  const topOrgs = useTopOrganisations(cordisActive && open.orgs);

  const savedCount = savedViews?.length || 0;

  return (
    <div className="dash-shell">
      <div className="dash-canvas">
        {/* ── Explore by theme ──
            The page title / breadcrumb and global actions live in the CommandBar mounted above
            this dashboard, so we don't repeat a title block here. */}
        <div className="dash-themebar">
          <div className="dash-themebar__label">
            <DashboardCustomizeIcon fontSize="inherit" />
            <span>Explore by theme</span>
          </div>
          <div className="dash-themebar__pills">
            {THEMES.filter((t) => t.key !== "saved").map((t) => {
              const on = !!open[t.key];
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  ref={setLauncherRef(t.key)}
                  type="button"
                  className={`dash-pill${on ? " is-active" : ""}`}
                  aria-pressed={on}
                  onClick={() => toggle(t.key)}
                >
                  <Icon className="dash-pill__icon" fontSize="inherit" />
                  <span>{t.label}</span>
                  {on ? (
                    <CheckCircleIcon className="dash-pill__state" fontSize="inherit" />
                  ) : (
                    <span className="dash-pill__plus" aria-hidden="true">+</span>
                  )}
                </button>
              );
            })}
          </div>
          <span className="dash-themebar__grow" />
          {/* Saved is pulled out and right-aligned, carrying a live count of saved views. */}
          <button
            ref={setLauncherRef("saved")}
            type="button"
            className={`dash-pill dash-pill--saved${open.saved ? " is-active" : ""}`}
            aria-pressed={open.saved}
            onClick={() => toggle("saved")}
          >
            <BookmarkIcon className="dash-pill__icon" fontSize="inherit" />
            <span>Saved</span>
            {savedCount > 0 && <span className="dash-pill__count">{savedCount}</span>}
          </button>
        </div>

        {/* ── Main area: calls list + deadline runway (left) · research tools + calls-over-time (right) ── */}
        <div className="dash-main">
          <div className="dash-main__left">
            <OpenCallsTable
              rows={tableRows}
              setViewMode={setViewMode}
              onLocateCall={onLocateCall}
              locateCall={locateCall}
              filterLabel={
                callFilter === "open"
                  ? "All open & forthcoming calls"
                  : callFilter === "closing30"
                  ? "Calls closing in 30 days"
                  : null
              }
              callFilter={callFilter}
              onSetFilter={setCallFilter}
              openCount={data.openCalls}
              forthcomingCount={data.forthcomingCalls}
              totalCount={monitoredCount}
            />
            {/* Deadline runway — plots the very calls above by close date. */}
            <DeadlineRunway calls={tableRows} />
          </div>
          <div className="dash-main__right">
            {/* Research tools — the real panel (field explorer / country activity / hop-on),
                still driven by the sidebar via dashboardPanel + the lifted country overlay. */}
            <DashboardToolPanel
              panel={dashboardPanel}
              setPanel={setDashboardPanel}
              country={countryOverlayCode}
              setCountry={setCountryOverlayCode}
            />
            <CallsOverTime monthlyBuckets={data.monthlyBuckets} />
          </div>
        </div>

        {/* ── On offer / funded summary strip (indicative on-offer vs CORDIS-funded, kept as
            separate measures; the funded half renders honest loading / failed / not-ingested
            states until real CORDIS data is available) ── */}
        <OfferFundedStrip
          totalOnOffer={data.totalOnOffer}
          programmeCount={data.programmeCount}
          openCalls={data.openCalls}
          forthcomingCalls={data.forthcomingCalls}
          cordis={cordis.data}
          cordisActive={cordisActive}
          cordisLoading={cordis.loading}
          cordisError={cordis.error}
        />
      </div>

      {/* ── Floating window layer ──
          Portaled to <body> for z-index safety. It carries the navy dashboard token block so
          the reused components inside still read the Vision-UI palette; light-mode degradation
          keys off the `light-theme` class App.js sets on <body> (an ancestor of this portal),
          so we don't reuse the theme-wrapper class names here (those paint an opaque fill). The
          layer is transparent + click-through; only the windows capture pointer events. */}
      {anyWindowOpen &&
        createPortal(
        <div className={`dash-windows-layer${stacked ? " dash-windows-layer--stacked" : ""}`}>
          <DashWindow
            win={windowFor("funding")}
            winKey="funding"
            title="Funding"
            subtitle="Indicative funding on offer by programme"
            icon={BarChartIcon}
            accent="#7551FF"
            width={480}
          >
            <FundingByProgramme
              callsByProgramme={data.callsByProgramme}
              plannedByProgrammeKey={data.plannedByProgrammeKey}
              awardedByProgrammeKey={awardedByProgrammeKey}
            />
          </DashWindow>

          <DashWindow
            win={windowFor("funded")}
            winKey="funded"
            title="Funded activity"
            subtitle="Historical funded projects over time · EU CORDIS"
            icon={StackedBarChartIcon}
            accent="#34d399"
            width={540}
          >
            <CordisGate
              active={cordisActive}
              loading={trend.loading}
              error={trend.error}
              data={trend.data}
              hasRows={
                !!trend.data &&
                (trend.data.projectCount || 0) > 0 &&
                (trend.data.yearBuckets || []).length > 0
              }
            >
              <CordisActivityTrend data={trend.data} loading={false} />
            </CordisGate>
          </DashWindow>

          <DashWindow
            win={windowFor("geography")}
            winKey="geography"
            title="Geography"
            subtitle="Funded activity by country · EU CORDIS"
            icon={PublicIcon}
            accent="#60A5FA"
            width={480}
          >
            <CordisGate
              active={cordisActive}
              loading={countryActivity.loading}
              error={countryActivity.error}
              data={countryActivity.data}
              hasRows={
                !!countryActivity.data &&
                (countryActivity.data.facets?.countries || []).length > 0
              }
            >
              <CordisCountryLeaderboard
                data={countryActivity.data}
                loading={false}
                onSelectCountry={handleSelectCountry}
              />
            </CordisGate>
          </DashWindow>

          <DashWindow
            win={windowFor("orgs")}
            winKey="orgs"
            title="Organisations"
            subtitle="Most-funded organisations · EU CORDIS"
            icon={GroupsIcon}
            accent="#F472B6"
            width={460}
          >
            <CordisGate
              active={cordisActive}
              loading={topOrgs.loading}
              error={topOrgs.error}
              data={topOrgs.data}
              hasRows={!!topOrgs.data && (topOrgs.data.organisations || []).length > 0}
            >
              <CordisTopOrgs data={topOrgs.data} loading={false} />
            </CordisGate>
          </DashWindow>

          <DashWindow
            win={windowFor("fields")}
            winKey="fields"
            title="Fields & topics"
            subtitle="Funded research fields · EU CORDIS"
            icon={AccountTreeIcon}
            accent="#22C55E"
            width={460}
          >
            <CordisGate
              active={cordisActive}
              loading={fieldTree.loading}
              error={fieldTree.error}
              data={fieldTree.data}
              hasRows={
                !!fieldTree.data &&
                (fieldTree.data.tree || []).some((n) => n.depth === 1) &&
                (fieldTree.data.totalProjects || 0) > 0
              }
            >
              <CordisFieldMix
                data={fieldTree.data}
                loading={false}
                onShowFields={() => setDashboardPanel("fields")}
              />
            </CordisGate>
          </DashWindow>

          {/* Topics: planned/estimated topic distribution — distinct from the CORDIS
              "Fields & topics" window; keeps its "estimated from call IDs" disclaimer. */}
          <DashWindow
            win={windowFor("topics")}
            winKey="topics"
            title="Topics"
            subtitle="Estimated topic mix across planned calls"
            icon={BubbleChartIcon}
            accent="#22D3EE"
            width={460}
          >
            <TopicDistribution topicDistribution={data.topicDistribution} />
          </DashWindow>

          {/* Saved: quick filters (the real callFilter mechanism) and saved views folded
              into one window. */}
          <DashWindow
            win={windowFor("saved")}
            winKey="saved"
            title="Saved"
            subtitle="Quick filters and saved views"
            icon={BookmarkIcon}
            accent="#FBBF24"
            width={440}
          >
            <SavedSearches
              openForthcoming={monitoredCount}
              closingIn30d={data.closingIn30d}
              activeFilter={callFilter}
              onSelectFilter={setCallFilter}
            />
            <SavedViews
              views={savedViews}
              onApply={onApplySavedView}
              onDelete={onDeleteSavedView}
            />
          </DashWindow>
        </div>,
        document.body
      )}
    </div>
  );
}
