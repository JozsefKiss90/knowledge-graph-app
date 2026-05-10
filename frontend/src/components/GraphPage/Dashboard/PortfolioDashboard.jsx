import React from "react";
import { useDashboardData } from "./useDashboardData";
import DashboardHero from "./DashboardHero";
import KpiCardsRow from "./KpiCardsRow";
import FundingByProgramme from "./FundingByProgramme";
import CallsOverTime from "./CallsOverTime";
import TopicDistribution from "./TopicDistribution";
import OpenCallsTable from "./OpenCallsTable";
import RecentActivity from "./RecentActivity";
import SavedSearches from "./SavedSearches";

export default function PortfolioDashboard({ loadFromStore, graphStats, setViewMode }) {
  const data = useDashboardData(loadFromStore);

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

        {/* Charts row: Funding (left) + Calls over time (right) */}
        <div className="dash-grid__charts">
          <FundingByProgramme callsByProgramme={data.callsByProgramme} />
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
