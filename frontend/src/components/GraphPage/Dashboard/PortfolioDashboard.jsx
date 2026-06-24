import React, { useMemo } from "react";
import { useDashboardData } from "./useDashboardData";
import useCordisPortfolio from "./useCordisPortfolio";
import useFundingByProgramme, { mapAwardedToProgrammeKeys } from "./useFundingByProgramme";
import useCordisPortfolioTrend from "./useCordisPortfolioTrend";
import CordisActivityTrend from "./CordisActivityTrend";
import useCordisFieldTree from "../CordisFields/useCordisFieldTree";
import CordisFieldMix from "./CordisFieldMix";
import useCountryActivity from "../CountryActivity/useCountryActivity";
import CordisCountryLeaderboard from "./CordisCountryLeaderboard";
import useTopOrganisations from "./useTopOrganisations";
import CordisTopOrgs from "./CordisTopOrgs";
import DashboardHero from "./DashboardHero";
import DashboardToolPanel from "./DashboardToolPanel";
import KpiCardsRow from "./KpiCardsRow";
import CordisKpiRow from "./CordisKpiRow";
import FundingByProgramme from "./FundingByProgramme";
import CallsOverTime from "./CallsOverTime";
import TopicDistribution from "./TopicDistribution";
import OpenCallsTable from "./OpenCallsTable";
import RecentActivity from "./RecentActivity";
import SavedSearches from "./SavedSearches";
import useInView from "./useInView";
import DashCardSkeleton from "./DashCardSkeleton";

export default function PortfolioDashboard({
  loadFromStore,
  graphStats,
  setViewMode,
  dashboardPanel,
  setDashboardPanel,
  countryOverlayCode,
  setCountryOverlayCode,
}) {
  const data = useDashboardData(loadFromStore);
  const cordis = useCordisPortfolio();
  // Gate the whole CORDIS section on real data: an empty graph yields an all-zero summary, so we hide
  // the section entirely rather than showing a row of zeros (hide-when-empty, like the CORDIS drawers).
  const cordisActive = !!cordis.data && (cordis.data.projectCount || 0) > 0;

  // Part C (plan 12): lazy-load the below-the-fold CORDIS widgets. Each card gets its own in-view sentinel,
  // and its data hook only fires when the card scrolls near the viewport (AND the F1 summary confirms CORDIS
  // data), instead of all of them firing at once when `cordisActive` flips true. A skeleton reserves each
  // card's space until it's in view and loaded, so the cards below stay off-screen and the layout is stable.
  const [trendRef, trendInView] = useInView();
  const [fieldRef, fieldInView] = useInView();
  const [countryRef, countryInView] = useInView();
  const [orgsRef, orgsInView] = useInView();

  // F2: per-programme awarded totals. Mapped from raw Call.source codes to the dashboard's programme keys so
  // FundingByProgramme can merge them with planned. Kept EAGER (gated only on cordisActive, NOT on in-view):
  // FundingByProgramme always paints its planned bars immediately and derives its Awarded/Both tab state from
  // whether awarded data is present, so deferring this fetch would leave those tabs showing a misleading "no
  // CORDIS data ingested" tooltip until the charts row scrolled into view. The endpoint is server-cached
  // (plan A2), so eager-fetching it is cheap.
  const funding = useFundingByProgramme(cordisActive);
  const awardedByProgrammeKey = useMemo(
    () => mapAwardedToProgrammeKeys(funding.data),
    [funding.data]
  );

  // F3: whole-portfolio funded-activity trend.
  const trend = useCordisPortfolioTrend(cordisActive && trendInView);

  // F4: funded-field portfolio mix — reuses the B5 /field-tree endpoint (shares its module cache with the
  // field-explorer drawer).
  const fieldTree = useCordisFieldTree("default", cordisActive && fieldInView);

  // F5: top-countries leaderboard — reuses the B4 /country-activity facets (country="" returns the facet
  // list; shares its module cache with the country-activity drawer).
  const countryActivity = useCountryActivity("", cordisActive && countryInView);

  // F6: top funded organisations leaderboard — one new read endpoint.
  const topOrgs = useTopOrganisations(cordisActive && orgsInView);

  return (
    <div className="dash-shell">
      <div className="dash-grid">
        {/* Research tools – a distinct panel hosting the field explorer, country activity and hop-on
            finder. Hidden until a sidebar button activates it; rendered at the top so it's visible on
            arrival. */}
        {dashboardPanel && (
          <div className="dash-grid__tool-panel">
            <DashboardToolPanel
              panel={dashboardPanel}
              setPanel={setDashboardPanel}
              country={countryOverlayCode}
              setCountry={setCountryOverlayCode}
            />
          </div>
        )}

        {/* Hero – full width */}
        <div className="dash-grid__hero">
          <DashboardHero
            totalCalls={data.totalCalls}
            programmeCount={data.programmeCount}
            openCalls={data.openCalls}
            topicsTracked={data.topicsTracked}
          />
        </div>

        {/* KPI cards – full width */}
        <div className="dash-grid__kpis">
          <KpiCardsRow
            totalCommitted={data.totalCommitted}
            openCalls={data.openCalls}
            closingIn30d={data.closingIn30d}
            topicsTracked={data.topicsTracked}
          />
        </div>

        {/* Funded reality (CORDIS) – portfolio-wide awarded counterpart to the planned KPIs.
            Hidden entirely when no CORDIS data is ingested. */}
        {cordisActive && (
          <div className="dash-grid__cordis">
            <div className="dash-cordis-section__header">
              <h2 className="dash-cordis-section__title">What's actually been funded (CORDIS)</h2>
              <p className="dash-cordis-section__caption">{cordis.data.provenance}</p>
            </div>
            <CordisKpiRow data={cordis.data} />
            <p className="dash-cordis-section__note">
              Across {cordis.data.callCount.toLocaleString()} tracked calls with CORDIS evidence.
              Counts and euros are separate measures; "most funded" is not "best".
            </p>
            {/* Each below-the-fold card is wrapped in an in-view sentinel: a skeleton holds its space until
                the card scrolls near the viewport and its (lazily-fetched) data lands, then the real widget
                swaps in. */}
            <div ref={trendRef}>
              {!trendInView || trend.loading
                ? <DashCardSkeleton />
                : <CordisActivityTrend data={trend.data} loading={false} />}
            </div>
            <div ref={fieldRef}>
              {!fieldInView || fieldTree.loading
                ? <DashCardSkeleton />
                : <CordisFieldMix data={fieldTree.data} loading={false} />}
            </div>
            <div ref={countryRef}>
              {!countryInView || countryActivity.loading
                ? <DashCardSkeleton />
                : <CordisCountryLeaderboard data={countryActivity.data} loading={false} />}
            </div>
            <div ref={orgsRef}>
              {!orgsInView || topOrgs.loading
                ? <DashCardSkeleton />
                : <CordisTopOrgs data={topOrgs.data} loading={false} />}
            </div>
          </div>
        )}

        {/* Charts row: Funding (left) + Calls over time (right) */}
        <div className="dash-grid__charts">
          <FundingByProgramme
            callsByProgramme={data.callsByProgramme}
            plannedByProgrammeKey={data.plannedByProgrammeKey}
            awardedByProgrammeKey={awardedByProgrammeKey}
          />
          <CallsOverTime monthlyBuckets={data.monthlyBuckets} />
        </div>

        {/* Bottom row: Table + Topics (left) + Activity + Searches (right) */}
        <div className="dash-grid__bottom">
          <div className="dash-grid__bottom-left">
            <TopicDistribution topicDistribution={data.topicDistribution} />
            <OpenCallsTable
              upcomingCalls={data.upcomingCalls}
              setViewMode={setViewMode}
            />
          </div>
          <div className="dash-grid__bottom-right">
            <RecentActivity />
            <SavedSearches
              openCalls={data.openCalls}
              closingIn30d={data.closingIn30d}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
