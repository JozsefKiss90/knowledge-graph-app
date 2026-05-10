import { useMemo } from "react";
import { buildElements } from "../../utils/buildElements";
import { getCallDateRange, parseCallDate, bucketCallsByMonth, PROGRAMME_DISPLAY } from "../TimelineScrubber/utils";

const ALL_PROGRAMME_KEYS = [
  "ERC", "MSCA", "INFRA",
  "Cluster_1", "Cluster_2", "Cluster_3", "Cluster_4", "Cluster_5", "Cluster_6",
  "MISS", "EIC", "EIE", "WIDERA",
  "DEP", "ERASMUS", "CEF", "CREA", "EURATOM",
];

const HE_KEYS = [
  "ERC", "MSCA", "INFRA",
  "Cluster_1", "Cluster_2", "Cluster_3", "Cluster_4", "Cluster_5", "Cluster_6",
  "MISS", "EIC", "EIE", "WIDERA",
];

// Map sub-programme keys to top-level display programme
const TOP_LEVEL_PROGRAMME = {};
HE_KEYS.forEach((k) => { TOP_LEVEL_PROGRAMME[k] = "HE"; });
["DEP", "ERASMUS", "CEF", "CREA", "EURATOM"].forEach((k) => { TOP_LEVEL_PROGRAMME[k] = k; });

const TOP_LEVEL_LABELS = {
  HE: "Horizon Europe",
  DEP: "Digital Europe",
  ERASMUS: "Erasmus+",
  CEF: "Connecting Europe",
  CREA: "Creative Europe",
  EURATOM: "Euratom",
};

const TOP_LEVEL_COLORS = {
  HE: "#22C55E",
  DEP: "#60A5FA",
  ERASMUS: "#A78BFA",
  CEF: "#FBBF24",
  CREA: "#F472B6",
  EURATOM: "#22D3EE",
};

function parseNumber(v) {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const match = String(v).match(/([\d,]+\.?\d*)/);
  if (!match) return null;
  const num = parseFloat(match[1].replace(/,/g, ""));
  return Number.isFinite(num) ? num : null;
}

export function useDashboardData(loadFromStore) {
  return useMemo(() => {
    if (!loadFromStore) {
      return {
        totalCalls: 0,
        programmeCount: 0,
        openCalls: 0,
        closingIn30d: 0,
        totalCommitted: 0,
        topicsTracked: 0,
        callsByProgramme: [],
        monthlyBuckets: [],
        topicDistribution: [],
        upcomingCalls: [],
        allCalls: [],
      };
    }

    const now = new Date();
    const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const allTopics = new Set();
    const callMap = new Map(); // dedup by id
    const budgetByTopProgramme = {};
    const callCountByTopProgramme = {};

    for (const progKey of ALL_PROGRAMME_KEYS) {
      const raw = loadFromStore(progKey);
      if (!raw) continue;

      const { nodeElements, edgeElements } = buildElements(raw);
      const topProg = TOP_LEVEL_PROGRAMME[progKey] || progKey;

      for (const n of nodeElements) {
        const d = n?.data || {};
        const t = String(d.type || d.category || "").toLowerCase();

        if (t === "topic") {
          allTopics.add(d.label || d.name || d.id);
          continue;
        }

        if (t !== "call") continue;
        if (callMap.has(d.id)) continue;

        const range = getCallDateRange(d);
        if (!range) continue; // skip calls without any parseable dates

        const budget = parseNumber(d.indicative_budget) || parseNumber(d.total_budget) || parseNumber(d.budget) || 0;

        // Determine status
        let status = "unknown";
        const closeDate = range?.closeDate;
        const openDate = range?.openDate;
        if (closeDate && closeDate < now) {
          status = "closed";
        } else if (openDate && openDate <= now && (!closeDate || closeDate >= now)) {
          status = "open";
        } else if (openDate && openDate > now) {
          status = "upcoming";
        } else if (closeDate && closeDate >= now) {
          status = "open";
        }

        const callEntry = {
          id: d.id,
          label: d.label || d.name || d.id,
          programme: topProg,
          programmeKey: progKey,
          programmeLabel: PROGRAMME_DISPLAY[progKey]?.label || progKey,
          programmeColor: PROGRAMME_DISPLAY[progKey]?.color || TOP_LEVEL_COLORS[topProg] || "#60A5FA",
          budget,
          status,
          openDate,
          closeDate,
          deadline: d.deadline,
          deadlines: d.deadlines,
          opening_date: d.opening_date,
          stage: d.stage || d.submission_type || null,
          topic: d.topicCode || d.topic || d.label || d.name || "",
          ...range,
        };

        callMap.set(d.id, callEntry);

        // Accumulate budget
        if (!budgetByTopProgramme[topProg]) budgetByTopProgramme[topProg] = 0;
        budgetByTopProgramme[topProg] += budget;

        if (!callCountByTopProgramme[topProg]) callCountByTopProgramme[topProg] = 0;
        callCountByTopProgramme[topProg]++;
      }
    }

    const allCalls = Array.from(callMap.values());
    const openCalls = allCalls.filter((c) => c.status === "open" || c.status === "upcoming");
    const closingIn30d = allCalls.filter((c) => {
      if (c.status === "closed") return false;
      const dl = c.closeDate;
      return dl && dl >= now && dl <= in30d;
    });

    const totalCommitted = Object.values(budgetByTopProgramme).reduce((a, b) => a + b, 0);

    // Programmes with data
    const activeProgrammes = Object.keys(callCountByTopProgramme).filter(
      (k) => callCountByTopProgramme[k] > 0
    );

    // Funding by programme (sorted by budget descending)
    const callsByProgramme = Object.entries(budgetByTopProgramme)
      .map(([key, budget]) => ({
        key,
        label: TOP_LEVEL_LABELS[key] || key,
        color: TOP_LEVEL_COLORS[key] || "#60A5FA",
        budget,
        callCount: callCountByTopProgramme[key] || 0,
      }))
      .sort((a, b) => b.budget - a.budget);

    // Topic distribution from call labels/topics
    const topicCounts = {};
    allCalls.forEach((c) => {
      const topic = c.topic || "Other";
      // Simplify: extract top-level category from call ID or topic
      let category = "Other";
      const id = String(c.id || "");
      if (/CL4|DIGITAL|AI|digital/i.test(id)) category = "Digital & AI";
      else if (/CL1|HLTH|health/i.test(id)) category = "Health";
      else if (/CL5|climate|energy|mobility/i.test(id)) category = "Climate & Energy";
      else if (/CL2|CL3|society|culture|security/i.test(id)) category = "Society & Security";
      else if (/CL6|food|bio|farm/i.test(id)) category = "Food & Bio";
      else if (/ERC|EIC|EIE|msca|infra/i.test(id)) category = "Excellence & Innovation";
      else if (/erasmus|education/i.test(id)) category = "Education";
      else if (/cef|transport|cyber/i.test(id)) category = "Infrastructure";

      topicCounts[category] = (topicCounts[category] || 0) + 1;
    });

    const topicDistribution = Object.entries(topicCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Upcoming calls (sorted by deadline, soonest first)
    const upcomingCalls = allCalls
      .filter((c) => c.status !== "closed" && c.closeDate)
      .sort((a, b) => (a.closeDate || Infinity) - (b.closeDate || Infinity))
      .slice(0, 8);

    // Monthly buckets for the area chart (reuse timeline logic)
    const callsForBuckets = allCalls
      .filter((c) => c.openDate || c.closeDate)
      .map((c) => ({
        id: c.id,
        openDate: c.openDate,
        closeDate: c.closeDate,
        programme: c.programme,
      }));
    const monthlyBuckets = bucketCallsByMonth(callsForBuckets);

    return {
      totalCalls: allCalls.length,
      programmeCount: activeProgrammes.length,
      openCalls: openCalls.length,
      closingIn30d: closingIn30d.length,
      totalCommitted,
      topicsTracked: allTopics.size,
      callsByProgramme,
      monthlyBuckets,
      topicDistribution,
      upcomingCalls,
      allCalls,
    };
  }, [loadFromStore]);
}
