import React from "react";

const fmt = (n) => (n || 0).toLocaleString();

/**
 * F6 — Top funded organisations: the aggregate counterpart to B2's per-call partner finder. The most active
 * organisations across ALL tracked CORDIS-funded projects, with their lead-vs-join role split, country, and
 * type. Reuses the B2 `.cordis-partners` split-bar idiom. Honest framing: EU-funded participation, NOT
 * scientific quality; coordinated and partnered are shown as two separate measures, never one score, and
 * 'most active' is not 'best'. Rendered only when CORDIS participation exists (gated by the parent on the
 * F1 summary); the cap is disclosed, never silent.
 */
export default function CordisTopOrgs({ data, loading }) {
  if (loading) return null;
  const orgs = data?.organisations || [];
  if (!orgs.length) return null;

  // Bars scaled to the busiest organisation's project total, split into the led/joined segments — the two
  // role measures sit side by side, never summed into a merit score.
  const maxTotal = Math.max(...orgs.map((o) => o.projectCount || 0), 1);

  return (
    <div className="dash-card dash-top-orgs">
      <div className="dash-card__header">
        <div>
          <h3 className="dash-card__title">Top funded organisations (CORDIS)</h3>
          <span className="dash-card__subtitle">
            {fmt(data.organisationCount)} organisations · by projects led &amp; joined
          </span>
        </div>
      </div>

      {/* The .cordis-partners wrapper activates the shared B2 list/split-bar styles (_cordis-partners.scss). */}
      <div className="cordis-partners">
        <div className="cordis-partners__legend">
          <span><i className="cordis-partners__swatch cordis-partners__swatch--coord" /> Leads (coordinates)</span>
          <span><i className="cordis-partners__swatch cordis-partners__swatch--partner" /> Joins (partners)</span>
        </div>

        <ul className="cordis-partners__list">
          {orgs.map((o) => {
            const coordPct = (o.coordinatedCount / maxTotal) * 100;
            const partnerPct = (o.partneredCount / maxTotal) * 100;
            return (
              <li key={o.id} className="cordis-partners__row">
                <div className="cordis-partners__main">
                  <span className="cordis-partners__name" title={o.name}>{o.name}</span>
                  <div className="cordis-partners__meta">
                    {o.country ? <span>{o.country}</span> : null}
                    {o.country ? <span aria-hidden> · </span> : null}
                    <span>{o.orgTypeLabel}</span>
                  </div>
                  <div
                    className="cordis-partners__bar-track"
                    title={`${fmt(o.coordinatedCount)} coordinated · ${fmt(o.partneredCount)} partnered`}
                  >
                    <span
                      className="cordis-partners__bar-seg cordis-partners__bar-seg--coord"
                      style={{ width: `${coordPct}%` }}
                    />
                    <span
                      className="cordis-partners__bar-seg cordis-partners__bar-seg--partner"
                      style={{ width: `${partnerPct}%` }}
                    />
                  </div>
                </div>
                <div className="cordis-partners__counts">
                  <span className="cordis-partners__count-total">{fmt(o.projectCount)} projects</span>
                  <span className="cordis-partners__count-split">
                    {fmt(o.coordinatedCount)} led · {fmt(o.partneredCount)} joined
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        {data.capped && (
          <div className="cordis-partners__capnote">
            Showing the top {fmt(data.returnedCount)} of {fmt(data.organisationCount)} funded organisations.
          </div>
        )}

        <div className="cordis-partners__prov">{data.provenance}</div>
      </div>
    </div>
  );
}
