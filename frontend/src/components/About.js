// src/components/About.js
import React from "react";
import { Box, Button, Chip, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BookmarksOutlinedIcon from "@mui/icons-material/BookmarksOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useNavigate } from "react-router-dom";
import { useDarkMode } from "./context/DarkModeContext";
import "../styles/nodedetails.scss";

const Bullet = ({ children }) => (
  <Typography variant="body2" className="nd-paragraph">
    • {children}
  </Typography>
);

export default function About() {
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();

  return (
    <div className={`nd-shell ${darkMode ? "nd-shell--dark" : "nd-shell--light"}`}>
      {/* HEADER BAR (NodeDetail-style) */}
      <header className="nd-header">
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
          <Chip label="About" size="small" className="nd-chip nd-chip--kind" />
        </Box>

        <Box className="nd-header-right">
          <Button
            size="small"
            variant="outlined"
            startIcon={<BookmarksOutlinedIcon fontSize="small" />}
            onClick={() => navigate("/bookmarks")}
          >
            Bookmarks
          </Button>
        </Box>
      </header>

      {/* MAIN CONTENT */}
      <main className="nd-main">
        <div className="nd-main-inner">
          {/* Title block */}
          <Box className="nd-title-block">
            <Box className="nd-title-dot" />
            <Box className="nd-title-text">
              <Typography
                variant="h1"
                className="nd-title"
                sx={{
                  fontSize: "var(--text-2xl)",
                  fontWeight: 600,
                  lineHeight: 1.4,
                  letterSpacing: "-0.01em",
                  wordBreak: "break-word",
                }}
              >
                EU Research Knowledge Graph
              </Typography>
              <Typography variant="body2" className="nd-call-id">
                Horizon Europe strategic planning analytics and navigation across clusters, destinations, and calls
              </Typography>
            </Box>
          </Box>

          {/* Optional “tags row” to keep parity with NodeDetail spacing */}
          <Box className="nd-tags-row">
            <Chip label="Interactive Graph" size="small" className="nd-tag-chip" variant="outlined" />
            <Chip label="Filters & Layouts" size="small" className="nd-tag-chip" variant="outlined" />
            <Chip label="Hover Summaries" size="small" className="nd-tag-chip" variant="outlined" />
            <Chip label="Node Details" size="small" className="nd-tag-chip" variant="outlined" />
            <Chip label="Bookmarks" size="small" className="nd-tag-chip" variant="outlined" />
          </Box>

          {/* Grid: main column + sidebar (NodeDetail-style) */}
          <div className="nd-grid">
            {/* LEFT: main column */}
            <div className="nd-main-column">
              <Box className="nd-card">
                <Box className="nd-card-header">
                  <Typography variant="body2" className="nd-card-title nd-muted-label">
                    Purpose
                  </Typography>
                </Box>
                <Box className="nd-card-body nd-card-body--text">
                  <Typography variant="body2" className="nd-paragraph">
                    This application provides a navigable knowledge graph of Horizon Europe planning artefacts.
                    It is designed to help you explore how strategic areas connect to destinations and individual calls,
                    and to quickly switch between overview and detail views as you refine your focus.
                  </Typography>
                  <Typography variant="body2" className="nd-paragraph">
                    The experience is built around fast visual exploration (hover, filters, search) combined with
                    a structured drill-down path into node-level detail pages.
                  </Typography>
                </Box>
              </Box>

              <Box className="nd-card">
                <Box className="nd-card-header">
                  <Typography variant="body2" className="nd-card-title nd-muted-label">
                    What you can do
                  </Typography>
                </Box>
                <Box className="nd-card-body nd-card-body--text">
                  <Bullet>
                    Start from the top-level view and open a cluster to see the destination landscape for that cluster.
                  </Bullet>
                  <Bullet>
                    From a cluster overview, open a destination to reveal the associated calls as a focused subgraph.
                  </Bullet>
                  <Bullet>
                    Hover nodes to see a compact summary card and quick counts, then open full details when needed.
                  </Bullet>
                  <Bullet>
                    Filter node/edge types, run a node search, and switch layout modes to match your analysis task.
                  </Bullet>
                  <Bullet>
                    Bookmark calls (and destinations) for later review.
                  </Bullet>
                </Box>
              </Box>

              <Box className="nd-card">
                <Box className="nd-card-header">
                  <Typography variant="body2" className="nd-card-title nd-muted-label">
                    How exploration works
                  </Typography>
                </Box>
                <Box className="nd-card-body nd-card-body--text">
                  <Typography variant="body2" className="nd-paragraph">
                    The graph is intentionally multi-layered:
                  </Typography>
                  <Bullet>
                    Top level: a single Horizon Europe root node connected to the available clusters.
                  </Bullet>
                  <Bullet>
                    Cluster level: destinations and their thematic relationships (calls are kept out of the overview to
                    preserve readability).
                  </Bullet>
                  <Bullet>
                    Destination level: the destination node plus its connected calls (the call layer you can act on).
                  </Bullet>
                  <Typography variant="body2" className="nd-paragraph" sx={{ mt: 1 }}>
                    Use the breadcrumb/navigation bar at the top of the graph view to move back up levels without losing
                    context.
                  </Typography>
                </Box>
              </Box>

              <Box className="nd-card">
                <Box className="nd-card-header">
                  <Typography variant="body2" className="nd-card-title nd-muted-label">
                    Filters, search, and layouts
                  </Typography>
                </Box>
                <Box className="nd-card-body nd-card-body--text">
                  <Bullet>
                    Filters & Controls (left sidebar) lets you switch datasets/layers, toggle node types, and search nodes.
                  </Bullet>
                  <Bullet>
                    On the Strategic Plan dataset, additional controls appear for edge types and similarity threshold.
                  </Bullet>
                  <Bullet>
                    Layout Mode can be switched between force-directed and hierarchical views depending on the dataset.
                  </Bullet>
                  <Bullet>
                    Reset All Filters restores visibility and fits the graph back into view.
                  </Bullet>
                </Box>
              </Box>

              <Box className="nd-card">
                <Box className="nd-card-header">
                  <Typography variant="body2" className="nd-card-title nd-muted-label">
                    Node details and actions
                  </Typography>
                </Box>
                <Box className="nd-card-body nd-card-body--text">
                  <Typography variant="body2" className="nd-paragraph">
                    Selecting a node opens its details page, where calls expose key funding and timeline fields,
                    and both calls and destinations show a connections panel to navigate to related entities.
                  </Typography>
                  <Typography variant="body2" className="nd-paragraph">
                    Calls also include outbound actions such as opening the funding link (when available) and bookmarking
                    for later.
                  </Typography>
                </Box>
              </Box>
            </div>

            {/* RIGHT: sidebar */}
            <aside className="nd-sidebar">
              <Box className="nd-card">
                <Box className="nd-card-header nd-card-header--with-icon">
                  <Typography variant="body2" className="nd-card-title nd-muted-label">
                    Quick start
                  </Typography>
                  <InfoOutlinedIcon fontSize="small" className="nd-card-header-icon" />
                </Box>
                <Box className="nd-card-body nd-card-body--text">
                  <Bullet>Use the left panel to choose a dataset or cluster.</Bullet>
                  <Bullet>Hover nodes for a summary card; click for full details.</Bullet>
                  <Bullet>Use Reset All Filters if visibility becomes constrained.</Bullet>
                  <Bullet>Switch layouts if you need a strict hierarchy view.</Bullet>
                </Box>
              </Box>

              <Box className="nd-card">
                <Box className="nd-card-header">
                  <Typography variant="body2" className="nd-card-title nd-muted-label">
                    Bookmarks
                  </Typography>
                </Box>
                <Box className="nd-card-body nd-card-body--text">
                  <Typography variant="body2" className="nd-paragraph">
                    Bookmarks are stored locally in your browser. Use the Bookmarks page to review saved calls and return
                    to them quickly.
                  </Typography>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => navigate("/bookmarks")}
                    sx={{ mt: 0.5 }}
                  >
                    Open Bookmarks
                  </Button>
                </Box>
              </Box>

              <Box className="nd-card">
                <Box className="nd-card-header">
                  <Typography variant="body2" className="nd-card-title nd-muted-label">
                    Data loading
                  </Typography>
                </Box>
                <Box className="nd-card-body nd-card-body--text">
                  <Typography variant="body2" className="nd-paragraph">
                    Datasets are loaded from the configured backend API. Cluster datasets may be fetched from dedicated
                    endpoints, and can be derived from the Strategic Plan dataset when needed.
                  </Typography>
                </Box>
              </Box>

              <Box className="nd-card">
                <Box className="nd-card-header">
                  <Typography variant="body2" className="nd-card-title nd-muted-label">
                    Links
                  </Typography>
                </Box>
                <Box className="nd-card-body nd-card-body--text">
                  <Button
                    fullWidth
                    variant="outlined"
                    endIcon={<OpenInNewIcon fontSize="small" />}
                    onClick={() => navigate("/")}
                  >
                    Open Graph
                  </Button>
                </Box>
              </Box>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
