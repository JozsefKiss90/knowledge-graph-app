import React, { useEffect, useRef } from "react";
import { IconButton, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import PublicIcon from "@mui/icons-material/Public";
import GroupAddIcon from "@mui/icons-material/GroupAdd";

import CordisFieldExplorer from "../CordisFields/CordisFieldExplorer";
import CountryActivityView from "../CountryActivity/CountryActivityView";
import HopOnHosts from "../HopOn/HopOnHosts";

// The three CORDIS exploration tools that used to be right-anchored pop-up drawers. They now live in a single
// distinct dashboard panel; clicking the matching sidebar button navigates to the dashboard and activates the
// corresponding tab here (driven by GraphPage's `dashboardPanel` state).
const TABS = [
  { key: "fields", label: "Research fields", Icon: AccountTreeIcon },
  { key: "country", label: "Country activity", Icon: PublicIcon },
  { key: "hopOn", label: "Hop-on", Icon: GroupAddIcon },
];

/**
 * DashboardToolPanel — the distinct dashboard panel that hosts the research-field explorer, the
 * country-activity view, and the hop-on host finder. `panel` is the active tool key (one of the TABS keys);
 * `setPanel` switches tabs (or `null` to close). The country tool's selection is lifted to GraphPage via
 * `country`/`setCountry` so the graph paint follows the choice when the user switches back to the graph view.
 */
export default function DashboardToolPanel({ panel, setPanel, country, setCountry }) {
  const shellRef = useRef(null);
  const prevPanelRef = useRef(null);

  // Bring the panel into view when it OPENS (a sidebar button may be clicked while the dashboard is scrolled
  // down). Only scroll on the closed -> open transition, not when switching tabs within an already-open
  // panel, which would otherwise yank the dashboard back to the top mid-read.
  useEffect(() => {
    const wasClosed = !prevPanelRef.current;
    prevPanelRef.current = panel;
    if (panel && wasClosed && shellRef.current) {
      shellRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [panel]);

  if (!panel) return null;

  return (
    <div className="dash-card dash-tool-panel" ref={shellRef}>
      <div className="dash-tool-panel__header">
        <div className="dash-tool-panel__tabs" role="tablist" aria-label="Research tools">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={panel === key}
              className={`dash-tool-panel__tab${panel === key ? " dash-tool-panel__tab--active" : ""}`}
              onClick={() => setPanel(key)}
            >
              <Icon className="dash-tool-panel__tab-icon" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <Tooltip title="Close panel" placement="left" arrow>
          <IconButton
            size="small"
            className="dash-tool-panel__close"
            onClick={() => setPanel(null)}
            aria-label="Close panel"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>

      <div className="dash-tool-panel__body">
        {panel === "fields" && <CordisFieldExplorer />}
        {panel === "country" && (
          <CountryActivityView country={country} setCountry={setCountry} />
        )}
        {panel === "hopOn" && <HopOnHosts />}
      </div>
    </div>
  );
}
