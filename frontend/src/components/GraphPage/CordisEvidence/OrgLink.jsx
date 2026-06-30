import React from "react";
import { Link } from "react-router-dom";

// Tier 3.4 — pivot an organisation name into its dossier (/org/:orgId). Degrades
// to a plain span when there's no id (e.g. an org row that predates the id field),
// so every call site stays safe.
export default function OrgLink({ id, name, className = "", title }) {
  const label = name || id || "";
  const tip = title || label;
  if (!id) {
    return (
      <span className={className} title={tip}>
        {label}
      </span>
    );
  }
  return (
    <Link
      to={`/org/${encodeURIComponent(id)}`}
      className={`${className} org-link`.trim()}
      title={`View ${label}'s funded-projects dossier`}
    >
      {label}
    </Link>
  );
}
