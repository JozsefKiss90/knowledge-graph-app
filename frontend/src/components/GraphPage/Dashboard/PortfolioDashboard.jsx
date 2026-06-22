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
import KpiCardsRow from "./KpiCardsRow";
import CordisKpiRow from "./CordisKpiRow";
import FundingByProgramme from "./FundingByProgramme";
import CallsOverTime from "./CallsOverTime";
import TopicDistribution from "./TopicDistribution";
import OpenCallsTable from "./OpenCallsTable";
import RecentActivity from "./RecentActivity";
import SavedSearches from "./SavedSearches";

export default function PortfolioDashboard({ loadFromStore, graphStats, setViewMode }) {
  const data = useDashboardData(loadFromStore);
  const cordis = useCordisPortfolio();
  // Gate the whole CORDIS section on real data: an empty graph yields an all-zero summary, so we hide
  // the section entirely rather than showing a row of zeros (hide-when-empty, like the CORDIS drawers).
  const cordisActive = !!cordis.data && (cordis.data.projectCount || 0) > 0;

  // F2: per-programme awarded totals (fetched only once the CORDIS section is gated on). Mapped from raw
  // Call.source codes to the dashboard's programme keys so FundingByProgramme can merge them with planned.
  const funding = useFundingByProgramme(cordisActive);
  const awardedByProgrammeKey = useMemo(
    () => mapAwardedToProgrammeKeys(funding.data),
    [funding.data]
  );

  // F3: whole-portfolio funded-activity trend (fetched only once the CORDIS section is gated on).
  const trend = useCordisPortfolioTrend(cordisActive);

  // F4: funded-field portfolio mix — reuses the B5 /field-tree endpoint (shares its module cache with the
  // field-explorer drawer). Gated on the F1 summary like the rest of the section.
  const fieldTree = useCordisFieldTree("default", cordisActive);

  // F5: top-countries leaderboard — reuses the B4 /country-activity facets (country="" returns the facet
  // list; shares its module cache with the country-activity drawer). Gated on the F1 summary.
  const countryActivity = useCountryActivity("", cordisActive);

  // F6: top funded organisations leaderboard — one new read endpoint, gated on the F1 summary.
  const topOrgs = useTopOrganisations(cordisActive);

  return (
    <div className="dash-shell">
      <div className="dash-grid">
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
            <CordisActivityTrend data={trend.data} loading={trend.loading} />
            <CordisFieldMix data={fieldTree.data} loading={fieldTree.loading} />
            <CordisCountryLeaderboard data={countryActivity.data} loading={countryActivity.loading} />
            <CordisTopOrgs data={topOrgs.data} loading={topOrgs.loading} />
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
