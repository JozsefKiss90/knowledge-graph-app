import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PublicIcon from "@mui/icons-material/Public";

/**
 * A small floating badge shown on the graph view while a CORDIS country overlay is painting the call nodes.
 * The country picker lives in the dashboard tool panel, so without this the paint would persist on the graph
 * with no legend (to explain the green/dim tint) and no way to turn it off. It mirrors the panel's legend and
 * offers a one-click clear that resets the selected country.
 */
export default function CountryOverlayBadge({ country, onClear }) {
  if (!country) return null;

  return (
    <div className="country-overlay-badge" role="status">
      <PublicIcon className="country-overlay-badge__icon" />
      <span className="country-overlay-badge__title">
        Country overlay: <strong>{country}</strong>
      </span>
      <span className="country-overlay-badge__legend">
        <span>
          <i className="country-activity__swatch country-activity__swatch--coord" /> Led
        </span>
        <span>
          <i className="country-activity__swatch country-activity__swatch--part" /> Joined
        </span>
        <span>
          <i className="country-activity__swatch country-activity__swatch--dim" /> Funded
        </span>
      </span>
      <Tooltip title="Clear country overlay" placement="bottom" arrow>
        <IconButton
          size="small"
          className="country-overlay-badge__clear"
          onClick={onClear}
          aria-label="Clear country overlay"
        >
          <CloseIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
    </div>
  );
}
