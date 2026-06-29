// src/components/GraphPage/Dashboard/SavedViews.jsx
//
// Tier 3.1 — named Saved Views, rendered as clickable rows. Each row re-applies
// its saved deep-link view (no page reload); the ✕ removes it. Empty until the
// user saves a view via the top bar / command palette.

import React from "react";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import BookmarksOutlinedIcon from "@mui/icons-material/BookmarksOutlined";

export default function SavedViews({ views, onApply, onDelete }) {
  const list = Array.isArray(views) ? views : [];

  return (
    <div className="dash-card dash-saved-views">
      <div className="dash-card__header">
        <h3 className="dash-card__title">Saved views</h3>
        <span className="dash-card__subtitle">Your bookmarked explorations</span>
      </div>

      {list.length === 0 ? (
        <div className="dash-saved-views__empty">
          <BookmarksOutlinedIcon fontSize="small" className="dash-saved-views__empty-icon" />
          <p>
            No saved views yet. Use <strong>Save current view</strong> in the top bar
            (or the command palette) to bookmark exactly what you're looking at.
          </p>
        </div>
      ) : (
        <ul className="dash-saved-views__list">
          {list.map((v) => (
            <li key={v.id} className="dash-saved-views__item">
              <button
                type="button"
                className="dash-saved-views__btn"
                title={`Open “${v.name}”`}
                onClick={() => onApply?.(v)}
              >
                <span className="dash-saved-views__name">{v.name}</span>
              </button>
              <IconButton
                size="small"
                className="dash-saved-views__remove"
                aria-label={`Delete saved view ${v.name}`}
                onClick={() => onDelete?.(v.id)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
