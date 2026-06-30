import React from "react";
import { Link } from "react-router-dom";

// Tier 3.4 — pivot an organisation name into its dossier (/org/:orgId). Degrades
// to a plain span when there's no id (e.g. an org row that predates the id field),
// so every call site stays safe. `newTab` opens the dossier in a new tab — used from
// surfaces (e.g. the chat) where same-tab navigation would unmount live state.
export default function OrgLink({ id, name, className = "", title, newTab = false }) {
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
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {label}
    </Link>
  );
}
