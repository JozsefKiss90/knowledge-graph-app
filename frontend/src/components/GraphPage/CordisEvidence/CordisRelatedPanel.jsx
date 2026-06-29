import React from "react";
import { Box, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import useCordisRelated from "./useCordisRelated";
import CordisEmptyState from "./CordisEmptyState";
import { getDatasetConfigForId } from "../../NodeDetalParts/useNodeDetail";

const MAX_CHIPS = 5;

function Card({ children }) {
  return (
    <Box className="nd-card cordis-related">
      <Box className="nd-card-header">
        <Typography variant="body2" className="nd-card-title nd-muted-label">
          Related calls (CORDIS)
        </Typography>
      </Box>
      <Box className="nd-card-body">{children}</Box>
    </Box>
  );
}

/**
 * B3 — related-calls explorer: other calls whose CORDIS-funded projects sit in the same EuroSciVoc
 * research fields as this call. A "more calls like this" path: each row links to that call's detail page.
 * Honest framing: this is research-field overlap of funded projects, NOT call similarity, quality, or
 * substitutability. Hidden when there are no related calls (same gate as A2/A6).
 */
export default function CordisRelatedPanel({ callId, bare = false }) {
  const { loading, data } = useCordisRelated(callId);

  if (!callId || loading) return null;
  const related = data?.related || [];
  if (!data || related.length === 0) {
    return bare ? (
      <div className="cordis-related">
        <CordisEmptyState compact message="No related calls share this area's research fields." />
      </div>
    ) : null;
  }

  // Size each overlap bar against the strongest match (the first row, already sorted by score desc).
  const topScore = related[0]?.score || 0;

  const body = (
    <>
      {!bare && (
        <div className="cordis-related__hint">
          Other calls whose EU-funded projects sit in the same research fields (EuroSciVoc) as this one — a
          path to adjacent areas. This is field overlap of funded projects, not a measure of similarity,
          quality, or substitutability.
        </div>
      )}

      <ul className="cordis-related__list">
        {related.map((c) => {
          const graphName = getDatasetConfigForId(c.id).graphName;
          const chips = (c.sharedFields || []).slice(0, MAX_CHIPS);
          const moreCount = Math.max((c.sharedCount || 0) - chips.length, 0);
          const barPct = topScore > 0 ? Math.max((c.score / topScore) * 100, 4) : 0;
          return (
            <li key={c.id} className="cordis-related__row">
              <div className="cordis-related__main">
                <Link
                  to={`/node/${encodeURIComponent(c.id)}`}
                  state={{ graphName, returnGraphName: graphName }}
                  onClick={() => localStorage.setItem("graphName", graphName)}
                  title={c.name}
                  className="cordis-related__name"
                >
                  {c.name}
                </Link>
                {c.subject ? <div className="cordis-related__subject">{c.subject}</div> : null}
                {chips.length > 0 && (
                  <div className="cordis-related__chips">
                    {chips.map((t, i) => (
                      <span key={i} className="cordis-related__chip">{t}</span>
                    ))}
                    {moreCount > 0 && (
                      <span className="cordis-related__chip cordis-related__chip--more">
                        +{moreCount} more
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div
                className="cordis-related__overlap"
                title={`Research-field overlap: ${(c.score * 100).toFixed(0)}% (${c.sharedCount} shared fields)`}
              >
                <span className="cordis-related__overlap-count">
                  {c.sharedCount} shared
                </span>
                <span className="cordis-related__bar-track">
                  <span className="cordis-related__bar-fill" style={{ width: `${barPct}%` }} />
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {!bare && (
        <div className="cordis-related__prov">
          {data.provenance}
          {data.subject ? ` — “${data.subject}”` : ""}
        </div>
      )}
    </>
  );

  return bare ? <div className="cordis-related">{body}</div> : <Card>{body}</Card>;
}
