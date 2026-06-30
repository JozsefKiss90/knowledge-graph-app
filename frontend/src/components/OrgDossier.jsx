// src/components/OrgDossier.jsx
//
// Tier 3.4 — cross-surface organisation dossier (route /org/:orgId). Reached from
// the dashboard leaderboard, the per-call partner finder, and the call-evidence
// panel. Aggregates one org's CORDIS-funded participation (awarded €, role split,
// research fields, tracked Horizon Europe calls, projects) and hosts a localStorage
// partner shortlist with CSV export.

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { Box, Button, Chip, CircularProgress, IconButton, Tooltip, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import { useDarkMode } from "./context/DarkModeContext";
import useOrganisation from "./GraphPage/CordisEvidence/useOrganisation";
import CordisEmptyState from "./GraphPage/CordisEvidence/CordisEmptyState";
import {
  readOrgShortlist,
  addToShortlist,
  removeFromShortlist,
  ORG_SHORTLIST_EVENT,
  ORG_SHORTLIST_KEY,
} from "./GraphPage/utils/orgShortlist";
import { buildCsv, downloadCsv } from "./GraphPage/utils/exportCsv";
import "../styles/nodedetails.scss";

function fmtEuro(n) {
  const v = Number(n) || 0;
  if (v <= 0) return "—";
  if (v >= 1e9) return `€${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `€${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `€${Math.round(v / 1e3)}k`;
  return `€${Math.round(v)}`;
}
const fmtNum = (n) => (Number(n) || 0).toLocaleString();

function Metric({ label, value, sub }) {
  return (
    <div className="org-dossier__metric">
      <div className="org-dossier__metric-value">{value}</div>
      <div className="org-dossier__metric-label">{label}</div>
      {sub && <div className="org-dossier__metric-sub">{sub}</div>}
    </div>
  );
}

export default function OrgDossier() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode } = useDarkMode();
  const { loading, data, error, notFound } = useOrganisation(orgId);

  // Deep-linked / new-tab loads have no in-app history, so navigate(-1) would leave the
  // app — fall back to the graph home in that case (react-router seeds key="default").
  const handleBack = () => {
    if (location.key && location.key !== "default") navigate(-1);
    else navigate("/");
  };

  const [shortlist, setShortlist] = useState(() => readOrgShortlist());
  useEffect(() => {
    const sync = () => setShortlist(readOrgShortlist());
    const onStorage = (e) => {
      // Only react to OUR key (or a clear(), which fires key=null) — not every tab's writes.
      if (e.key === ORG_SHORTLIST_KEY || e.key === null) sync();
    };
    window.addEventListener(ORG_SHORTLIST_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(ORG_SHORTLIST_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const shortlisted = !!data && shortlist.some((o) => o.id === String(data.id));
  const toggleShortlist = () => {
    if (!data) return;
    if (shortlisted) removeFromShortlist(data.id);
    else addToShortlist(data);
  };

  const exportShortlist = () => {
    const columns = [
      { key: "name", label: "Organisation" },
      { key: "country", label: "Country" },
      { key: "orgTypeLabel", label: "Type" },
      { key: "projectCount", label: "Funded projects" },
      { key: "totalEcContribution", label: "EU contribution (EUR)" },
      { key: "id", label: "CORDIS id" },
    ];
    downloadCsv("cordis-org-shortlist.csv", buildCsv(shortlist, columns));
  };

  return (
    <div className={`nd-shell ${darkMode ? "nd-shell--dark" : "nd-shell--light"}`}>
      <header className="nd-header" style={{ display: "flex", justifyContent: "space-between" }}>
        <Box className="nd-header-left">
          <Button
            size="small"
            variant="text"
            startIcon={<ArrowBackIcon fontSize="small" />}
            onClick={handleBack}
            className="nd-back-button"
          >
            Back
          </Button>
          <span className="nd-header-divider" />
          <Chip
            icon={<BusinessOutlinedIcon style={{ fontSize: 16 }} />}
            label="Organisation"
            size="small"
            className="nd-chip nd-chip--kind"
          />
        </Box>
        <Box className="nd-header-right" sx={{ display: "flex", gap: 1 }}>
          {data && (
            <Button
              size="small"
              variant={shortlisted ? "contained" : "outlined"}
              startIcon={shortlisted ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
              onClick={toggleShortlist}
              sx={{ textTransform: "none", borderRadius: "8px" }}
            >
              {shortlisted ? "In shortlist" : "Add to shortlist"}
            </Button>
          )}
        </Box>
      </header>

      <main className="nd-main">
        <div className="nd-main-inner org-dossier">
          <Box className="nd-title-block">
            <Box className="nd-title-dot" />
            <Box className="nd-title-text">
              <Typography variant="h1" className="nd-title">
                {loading ? "Loading…" : data ? data.name : "Organisation"}
              </Typography>
              <Typography className="nd-subtitle">
                {data
                  ? [data.orgTypeLabel, data.city, data.country].filter(Boolean).join(" · ")
                  : notFound
                  ? "This organisation isn't in the CORDIS data."
                  : "CORDIS funded-projects dossier"}
              </Typography>
            </Box>
          </Box>

          {loading && (
            <div className="org-dossier__loading">
              <CircularProgress size={28} />
            </div>
          )}

          {notFound && !loading && (
            <CordisEmptyState message="No CORDIS organisation matches this id. It may not have been ingested, or the link is stale." />
          )}
          {error && !loading && (
            <CordisEmptyState message={`Couldn't load this organisation (${error}).`} />
          )}

          {data && !loading && (
            <>
              <div className="org-dossier__metrics">
                <Metric label="EU contribution (awarded)" value={fmtEuro(data.totalEcContribution)} />
                <Metric
                  label="Funded projects"
                  value={fmtNum(data.projectCount)}
                  sub={`${fmtNum(data.coordinatedCount)} led · ${fmtNum(data.partneredCount)} joined`}
                />
                <Metric label="Tracked HE calls" value={fmtNum(data.trackedCallCount)} />
                <Metric label="Research fields" value={fmtNum(data.researchFieldCount)} />
              </div>

              <p className="org-dossier__prov">{data.provenance}</p>

              {data.researchFields?.length > 0 && (
                <section className="org-dossier__section">
                  <h2 className="org-dossier__section-title">
                    Research fields{" "}
                    <span className="org-dossier__section-sub">
                      (by funded projects{data.researchFieldsCapped ? `, top ${data.researchFields.length}` : ""})
                    </span>
                  </h2>
                  <div className="org-dossier__fields">
                    {data.researchFields.map((f) => (
                      <span key={f.code || f.title} className="org-dossier__field-chip">
                        {f.title}
                        <span className="org-dossier__field-count">{fmtNum(f.projectCount)}</span>
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {data.trackedCalls?.length > 0 && (
                <section className="org-dossier__section">
                  <h2 className="org-dossier__section-title">
                    Tracked Horizon Europe calls{" "}
                    <span className="org-dossier__section-sub">
                      ({fmtNum(data.trackedCallCount)} cover this org's funded areas
                      {data.trackedCallsCapped ? `, showing ${data.trackedCalls.length}` : ""})
                    </span>
                  </h2>
                  <ul className="org-dossier__calls">
                    {data.trackedCalls.map((c) => (
                      <li key={c.id} className="org-dossier__call-row">
                        <Link to={`/node/${encodeURIComponent(c.id)}`} className="org-dossier__call-link">
                          <span className="org-dossier__call-title">{c.title || c.id}</span>
                          <OpenInNewIcon fontSize="inherit" className="org-dossier__call-open" />
                        </Link>
                        <span className="org-dossier__call-meta">
                          {c.subject ? `${c.subject} · ` : ""}
                          {fmtNum(c.projectCount)} funded {c.projectCount === 1 ? "project" : "projects"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {data.projects?.length > 0 && (
                <section className="org-dossier__section">
                  <h2 className="org-dossier__section-title">
                    Funded projects{" "}
                    <span className="org-dossier__section-sub">
                      ({fmtNum(data.projectCount)} total
                      {data.projectsCapped ? `, showing the ${data.projects.length} most recent` : ""})
                    </span>
                  </h2>
                  <ul className="org-dossier__projects">
                    {data.projects.map((p) => (
                      <li key={p.id} className="org-dossier__project-row">
                        <div className="org-dossier__project-main">
                          <span className="org-dossier__project-name">{p.acronym || p.title || p.id}</span>
                          {p.acronym && p.title && (
                            <span className="org-dossier__project-full" title={p.title}>{p.title}</span>
                          )}
                        </div>
                        <div className="org-dossier__project-meta">
                          <span
                            className={`org-dossier__role org-dossier__role--${
                              p.role === "coordinator" ? "coord" : "partner"
                            }`}
                          >
                            {p.role === "coordinator" ? "Coordinator" : "Partner"}
                          </span>
                          {p.frameworkProgramme && <span>{p.frameworkProgramme}</span>}
                          {p.startDate && <span>{String(p.startDate).slice(0, 4)}</span>}
                          {p.ecContribution > 0 && <span>{fmtEuro(p.ecContribution)}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}

          <section className="org-dossier__section org-dossier__shortlist">
            <div className="org-dossier__shortlist-head">
              <h2 className="org-dossier__section-title">
                Your partner shortlist{" "}
                <span className="org-dossier__section-sub">({shortlist.length})</span>
              </h2>
              {shortlist.length > 0 && (
                <Tooltip title="Export shortlist as CSV">
                  <IconButton size="small" onClick={exportShortlist} aria-label="Export shortlist CSV">
                    <FileDownloadOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </div>
            {shortlist.length === 0 ? (
              <p className="org-dossier__shortlist-empty">
                Add organisations to build a partner shortlist, then export it as CSV.
              </p>
            ) : (
              <ul className="org-dossier__shortlist-list">
                {shortlist.map((o) => (
                  <li key={o.id} className="org-dossier__shortlist-row">
                    <Link to={`/org/${encodeURIComponent(o.id)}`} className="org-dossier__shortlist-link">
                      {o.name}
                    </Link>
                    <span className="org-dossier__shortlist-meta">
                      {[o.country, o.orgTypeLabel].filter(Boolean).join(" · ")}
                      {o.projectCount ? ` · ${fmtNum(o.projectCount)} projects` : ""}
                    </span>
                    <button
                      type="button"
                      className="org-dossier__shortlist-remove"
                      onClick={() => removeFromShortlist(o.id)}
                      aria-label={`Remove ${o.name} from shortlist`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
