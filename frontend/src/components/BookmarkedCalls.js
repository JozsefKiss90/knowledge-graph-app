// src/components/BookmarkedCalls.js
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import { useDarkMode } from "./context/DarkModeContext";
import "../styles/nodedetails.scss";

export default function BookmarkedCalls() {
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("bookmarkedCalls") || "[]");
    setBookmarks(stored);
  }, []);

  const removeBookmark = (id) => {
    const updated = bookmarks.filter((item) => item.id !== id);
    localStorage.setItem("bookmarkedCalls", JSON.stringify(updated));
    setBookmarks(updated);
    window.dispatchEvent(new Event("bookmarksChanged"));
  };

  const clearAll = () => {
    localStorage.setItem("bookmarkedCalls", JSON.stringify([]));
    setBookmarks([]);
    window.dispatchEvent(new Event("bookmarksChanged"));
  };

  return (
    <div className={`nd-shell ${darkMode ? "nd-shell--dark" : "nd-shell--light"}`}>
      {/* Header */}
      <header className="nd-header" style={{ display: "flex", justifyContent: "space-between" }}>
        <Box className="nd-header-left">
          <Button
            size="small"
            variant="text"
            startIcon={<ArrowBackIcon fontSize="small" />}
            onClick={() => navigate("/")}
            className="nd-back-button"
          >
            Back to Graph
          </Button>
          <span className="nd-header-divider" />
          <Chip
            icon={<BookmarkIcon style={{ fontSize: 16 }} />}
            label="Bookmarks"
            size="small"
            className="nd-chip nd-chip--kind"
          />
        </Box>

        {bookmarks.length > 0 && (
          <Box className="nd-header-right">
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={clearAll}
              sx={{ textTransform: "none", borderRadius: "8px" }}
            >
              Clear all
            </Button>
          </Box>
        )}
      </header>

      {/* Main */}
      <main className="nd-main">
        <div className="nd-main-inner">
          <Box className="nd-title-block">
            <Box className="nd-title-dot" />
            <Box className="nd-title-text">
              <Typography variant="h1" className="nd-title">
                Bookmarked Calls
              </Typography>
              <Typography className="nd-subtitle">
                {bookmarks.length === 0
                  ? "You have no bookmarked calls yet."
                  : `${bookmarks.length} saved call${bookmarks.length !== 1 ? "s" : ""}`}
              </Typography>
            </Box>
          </Box>

          {/* Call list */}
          <Box className="bm-list">
            {bookmarks.map((call) => (
              <Box key={call.id} className="bm-card">
                <Box className="bm-card__body">
                  <Typography variant="caption" className="bm-card__id">
                    {call.id}
                  </Typography>
                  <Typography variant="body1" className="bm-card__name">
                    {call.name || call.id}
                  </Typography>
                </Box>

                <Box className="bm-card__actions">
                  <Tooltip title="View details" placement="top" arrow>
                    <IconButton
                      size="small"
                      className="bm-card__action-btn"
                      onClick={() => navigate(`/node/${encodeURIComponent(call.id)}`)}
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove bookmark" placement="top" arrow>
                    <IconButton
                      size="small"
                      className="bm-card__action-btn bm-card__action-btn--remove"
                      onClick={() => removeBookmark(call.id)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))}
          </Box>

          {/* Empty state */}
          {bookmarks.length === 0 && (
            <Box className="bm-empty">
              <BookmarkIcon className="bm-empty__icon" />
              <Typography variant="body2" className="bm-empty__text">
                Use the AI search panel or node detail pages to bookmark calls.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate("/")}
                sx={{ textTransform: "none", borderRadius: "8px", mt: 1 }}
              >
                Back to Graph
              </Button>
            </Box>
          )}
        </div>
      </main>
    </div>
  );
}
