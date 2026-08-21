import React, { useCallback, useEffect, useRef, useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import PublicIcon from "@mui/icons-material/Public";
import GroupAddIcon from "@mui/icons-material/GroupAdd";

import CordisFieldExplorer from "../CordisFields/CordisFieldExplorer";
import CountryActivityView from "../CountryActivity/CountryActivityView";
import HopOnHosts from "../HopOn/HopOnHosts";

// The three CORDIS exploration tools that used to be right-anchored pop-up drawers. They now live in a single
// distinct dashboard panel; clicking the matching sidebar button navigates to the dashboard and activates the
// corresponding tab here (driven by GraphPage's `dashboardPanel` state). `short` is the compact tab label
// (redesign's 3-segment control); `label` is the fuller name used in the idle teaching intro.
const TABS = [
  { key: "fields", label: "Research fields", short: "Fields", Icon: AccountTreeIcon, desc: "Browse EU-funded research fields (EuroSciVoc) and the calls funded in each." },
  { key: "country", label: "Country activity", short: "Country", Icon: PublicIcon, desc: "Pick a country to see where its organisations have been funded across the funding landscape." },
  { key: "hopOn", label: "Hop-on", short: "Hop-on", Icon: GroupAddIcon, desc: "Recently-started Horizon Europe projects a widening-country partner may still be able to join." },
];

const tabId = (key) => `dash-tool-tab-${key}`;
const tabPanelId = (key) => `dash-tool-tabpanel-${key}`;

const indexOfTab = (key) => TABS.findIndex((t) => t.key === key);

/**
 * DashboardToolPanel — the distinct dashboard panel that hosts the research-field explorer, the
 * country-activity view, and the hop-on host finder. `panel` is the active tool key (one of the TABS keys);
 * `setPanel` switches tabs (or `null` to close). The country tool's selection is lifted to GraphPage via
 * `country`/`setCountry` so the funding-map paint follows the choice when the user switches back to it.
 *
 * The tab strip follows the standard tablist pattern with MANUAL activation: Left/Right/Home/End move focus
 * only, and Enter/Space (a plain button activation) switches the tool. Each tool fetches on mount, so
 * activation stays deliberate rather than following focus. Only the active tool's panel is rendered, so
 * `aria-controls` is set on the selected tab alone — never pointing at an element that isn't there.
 *
 * The panel is closable, so it has an idle state in which no tool is selected: there, every tab is honestly
 * `aria-selected="false"` and no tabpanel exists. The strip still carries one tab stop, so the keyboard can
 * reach it and activate a tool.
 */
export default function DashboardToolPanel({ panel, setPanel, country, setCountry }) {
  const shellRef = useRef(null);
  const prevPanelRef = useRef(null);
  const tabRefs = useRef({});
  // Which tab owns the strip's single tab stop. Follows the active tool, and roves with the arrow keys
  // while no tool has been activated yet.
  const [tabStopKey, setTabStopKey] = useState(panel || TABS[0].key);
  // Set when the user closes the panel, so focus can return to the tab that was showing once the close
  // button (which had focus) has unmounted with the panel body.
  const returnFocusRef = useRef(null);

  useEffect(() => {
    if (panel) setTabStopKey(panel);
  }, [panel]);

  const focusTab = useCallback((key) => {
    setTabStopKey(key);
    tabRefs.current[key]?.focus();
  }, []);

  // Opening: bring the panel into view (a sidebar button may be clicked while the dashboard is scrolled
  // down). Only on the closed -> open transition, not when switching tabs within an already-open panel,
  // which would otherwise yank the dashboard back to the top mid-read. Focus is deliberately NOT moved
  // here: the panel can't tell who opened it, and an opener that keeps its own focus (a rail button, a
  // palette command) must not have it yanked away. The tab stop follows the activated tool instead, so the
  // next Tab lands on the right tab.
  useEffect(() => {
    const wasClosed = !prevPanelRef.current;
    prevPanelRef.current = panel;
    if (panel && wasClosed && shellRef.current) {
      shellRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [panel]);

  // Closing via the panel's own close button: that button unmounts with the panel body, so hand focus back
  // to the tab it belonged to instead of dropping it on the document.
  useEffect(() => {
    if (panel || !returnFocusRef.current) return;
    focusTab(returnFocusRef.current);
    returnFocusRef.current = null;
  }, [panel, focusTab]);

  const handleTabKeyDown = (e, key) => {
    const i = indexOfTab(key);
    let next = null;
    if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next === null) return;
    e.preventDefault();
    focusTab(TABS[next].key);
  };

  const handleClose = () => {
    returnFocusRef.current = panel;
    setPanel(null);
  };

  return (
    <div className={`dash-card dash-tool-panel${panel ? "" : " dash-tool-panel--idle"}`} ref={shellRef}>
      <div className="dash-tool-panel__title">
        <BuildOutlinedIcon className="dash-tool-panel__title-icon" />
        <span className="dash-tool-panel__title-text">Research tools</span>
        <span className="dash-tool-panel__title-grow" />
        <span className="dash-tool-panel__evidence">CORDIS EVIDENCE</span>
      </div>

      <div className="dash-tool-panel__header">
        <div className="dash-tool-panel__tabs" role="tablist" aria-label="Research tools">
          {TABS.map(({ key, label, short, Icon }) => {
            const active = panel === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                id={tabId(key)}
                // The strip goes icon-only under 560px, so the full tool name is carried in the
                // accessible name (which contains the visible short label at wider widths).
                aria-label={label}
                ref={(el) => {
                  tabRefs.current[key] = el;
                }}
                aria-selected={active}
                aria-controls={active ? tabPanelId(key) : undefined}
                tabIndex={tabStopKey === key ? 0 : -1}
                className={`dash-tool-panel__tab${active ? " dash-tool-panel__tab--active" : ""}`}
                onClick={() => setPanel(key)}
                onKeyDown={(e) => handleTabKeyDown(e, key)}
              >
                <Icon className="dash-tool-panel__tab-icon" />
                <span>{short}</span>
              </button>
            );
          })}
        </div>

        {panel && (
          <Tooltip title="Close panel" placement="left" arrow>
            <IconButton
              size="small"
              className="dash-tool-panel__close"
              onClick={handleClose}
              aria-label="Close the research tools panel"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </div>

      {panel ? (
        <div
          className="dash-tool-panel__body"
          role="tabpanel"
          id={tabPanelId(panel)}
          aria-labelledby={tabId(panel)}
        >
          {panel === "fields" && <CordisFieldExplorer />}
          {panel === "country" && (
            <CountryActivityView country={country} setCountry={setCountry} />
          )}
          {panel === "hopOn" && <HopOnHosts />}
        </div>
      ) : (
        <div className="dash-tool-panel__intro">
          <p className="dash-tool-panel__intro-lead">Pick a tool to explore the funded-project evidence (CORDIS) behind the calls:</p>
          <ul className="dash-tool-panel__intro-list">
            {TABS.map(({ key, label, Icon, desc }) => (
              <li key={key} className="dash-tool-panel__intro-item">
                <Icon className="dash-tool-panel__intro-icon" />
                <span className="dash-tool-panel__intro-text"><strong>{label}</strong> — {desc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
