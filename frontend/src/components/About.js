// src/components/About.js
import React from "react";
import { Box, Button, Chip, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useDarkMode } from "./context/DarkModeContext";
import "../styles/nodedetails.scss";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BookmarksOutlinedIcon from "@mui/icons-material/BookmarksOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ViewQuiltOutlinedIcon from "@mui/icons-material/ViewQuiltOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import TravelExploreOutlinedIcon from "@mui/icons-material/TravelExploreOutlined";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

/**
 * Reusable documentation card matching the NodeDetail card design.
 */
const Section = ({ title, icon, children }) => (
  <Box className="nd-card">
    <Box className={`nd-card-header${icon ? " nd-card-header--with-icon" : ""}`}>
      <Typography variant="body2" className="nd-card-title nd-muted-label">
        {title}
      </Typography>
      {icon}
    </Box>
    <Box className="nd-card-body nd-card-body--text">{children}</Box>
  </Box>
);

const P = ({ children }) => (
  <Typography variant="body2" className="nd-paragraph">
    {children}
  </Typography>
);

const Sub = ({ children }) => (
  <Typography component="h5" className="nd-md-heading">
    {children}
  </Typography>
);

const Muted = ({ children }) => (
  <Typography variant="body2" className="nd-paragraph nd-muted-text" sx={{ fontSize: "13px !important" }}>
    {children}
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
          <Chip label="Help & Documentation" size="small" className="nd-chip nd-chip--kind" />
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
              <Typography variant="h1" className="nd-title">
                Help &amp; Documentation
              </Typography>
              <Typography variant="body2" className="nd-call-id">
                Your guide to the EU Knowledge Graph — explore Horizon Europe and other EU programmes as an
                interactive graph, dive into individual funding calls, and see the real CORDIS funded-project
                evidence behind each research area.
              </Typography>
            </Box>
          </Box>

          {/* Capability tags */}
          <Box className="nd-tags-row">
            <Chip label="Interactive graph" size="small" className="nd-tag-chip" variant="outlined" />
            <Chip label="Programme drill-down" size="small" className="nd-tag-chip" variant="outlined" />
            <Chip label="Portfolio dashboard" size="small" className="nd-tag-chip" variant="outlined" />
            <Chip label="CORDIS funded projects" size="small" className="nd-tag-chip" variant="outlined" />
            <Chip label="Research fields" size="small" className="nd-tag-chip" variant="outlined" />
            <Chip label="Compare" size="small" className="nd-tag-chip" variant="outlined" />
            <Chip label="AI search" size="small" className="nd-tag-chip" variant="outlined" />
            <Chip label="Bookmarks" size="small" className="nd-tag-chip" variant="outlined" />
          </Box>

          {/* Grid: main column + sidebar */}
          <div className="nd-grid">
            {/* LEFT: main column */}
            <div className="nd-main-column">
              {/* ---- What this app is ---- */}
              <Section title="What this app is" icon={<InfoOutlinedIcon fontSize="small" className="nd-card-header-icon" />}>
                <P>
                  The EU Knowledge Graph turns EU research-funding programmes into a navigable map. You start from a
                  single <strong>EU Funding Programmes</strong> hub and drill down through pillars, programmes,
                  thematic destinations and individual funding calls — or switch to a <strong>Portfolio Dashboard</strong>{" "}
                  for the numbers at a glance.
                </P>
                <P>
                  Two kinds of data sit side by side. <strong>Work Programme</strong> data describes the calls
                  themselves — their budgets, deadlines, type of action and scope. <strong>CORDIS</strong> data adds
                  the real EU-funded projects, organisations and money behind each call&rsquo;s research area, so you
                  can see not just what is on offer but what has actually been funded. CORDIS insights appear wherever
                  that data has been loaded for the programme you are viewing.
                </P>
              </Section>

              {/* ---- The screen at a glance ---- */}
              <Section title="The screen at a glance" icon={<ViewQuiltOutlinedIcon fontSize="small" className="nd-card-header-icon" />}>
                <P>The main screen has four regions:</P>
                <ul className="nd-md-list">
                  <li>
                    <strong>Left — Filters &amp; Controls.</strong> Choose which programme/dataset to load (the
                    Graph Dataset tree), toggle node types, search-and-highlight nodes, and reset filters. Collapse
                    the panel with its chevron to give the graph more room.
                  </li>
                  <li>
                    <strong>Centre — Graph / Dashboard.</strong> The interactive graph canvas, or the Portfolio
                    Dashboard when you switch views. A status bar along the bottom shows node and edge counts and the
                    active layout.
                  </li>
                  <li>
                    <strong>Top bar.</strong> Breadcrumbs with a &ldquo;Level N&rdquo; indicator, Home and
                    &ldquo;Level up&rdquo;, the <strong>Open Dashboard / Back to Graph</strong> toggle, the layout
                    switch (Force-Directed / Hierarchical), and Reset view / Fit to screen.
                  </li>
                  <li>
                    <strong>Right — icon rail.</strong> Quick tools: Help, light/dark mode, Bookmarks, Send a
                    message, and — on the funding graphs — the Timeline scrubber, Compare programmes, the three CORDIS
                    research tools, and Graph layout &amp; settings.
                  </li>
                </ul>
              </Section>

              {/* ---- Exploring the graph ---- */}
              <Section title="Exploring the graph" icon={<AccountTreeOutlinedIcon fontSize="small" className="nd-card-header-icon" />}>
                <P>
                  The graph is layered so you can move from the big picture to fine detail without clutter. Click
                  (tap) a node to open the layer beneath it:
                </P>
                <ul className="nd-md-list">
                  <li>
                    <strong>EU Funding Programmes</strong> (the hub) → <strong>Horizon Europe</strong>&rsquo;s four
                    pillars → programmes and thematic <strong>clusters</strong> → <strong>destinations</strong>{" "}
                    (groupings of related calls) → individual <strong>calls</strong>.
                  </li>
                  <li>Standalone programmes go straight from the hub to their destinations and calls.</li>
                </ul>
                <P>
                  Use the top breadcrumb bar to move back out — click any breadcrumb to jump to that layer,
                  &ldquo;Level up&rdquo; to step out one level, or the Home icon to return to the hub.
                </P>
                <P>
                  Switch how nodes are arranged with the layout icons in the top bar: <strong>Force-Directed</strong>{" "}
                  (organic) or <strong>Hierarchical</strong> (top-down tree). &ldquo;Reset view&rdquo; re-shows
                  everything and re-fits the graph; &ldquo;Fit to screen&rdquo; zooms it to fit the window.
                </P>
              </Section>

              {/* ---- Choosing a programme ---- */}
              <Section title="Choosing a programme or dataset" icon={<LayersOutlinedIcon fontSize="small" className="nd-card-header-icon" />}>
                <P>
                  The <strong>Graph Dataset</strong> tree at the top of the left Filters &amp; Controls panel mirrors
                  the whole hierarchy. Expand a branch to list its destinations and calls, and click any row to jump
                  the graph straight there. Available programmes include:
                </P>
                <ul className="nd-md-list">
                  <li>
                    <strong>Horizon Europe</strong> — Pillar I (ERC, MSCA, Research Infrastructures); Pillar II
                    clusters CL1 Health, CL2 Culture &amp; Inclusive Society, CL3 Civil Security, CL4 Digital,
                    Industry &amp; Space, CL5 Climate, Energy &amp; Mobility, CL6 Food, Bioeconomy &amp; Environment,
                    plus Missions; Pillar III (EIC, EIE); and WIDERA (Widening Participation).
                  </li>
                  <li>
                    <strong>Other EU programmes</strong> — Digital Europe, Erasmus+, the Connecting Europe Facility
                    (CEF), Creative Europe and EURATOM.
                  </li>
                  <li>
                    <strong>Horizon Europe strategic plan (2025–2027)</strong> — a separate flat knowledge graph of
                    strategy entities and how they link to one another.
                  </li>
                </ul>
                <Muted>
                  Which programmes appear depends on what data the backend has loaded; a programme is listed only when
                  its data is available.
                </Muted>
              </Section>

              {/* ---- Filtering, searching, timeline ---- */}
              <Section title="Filtering, searching & the timeline" icon={<TuneOutlinedIcon fontSize="small" className="nd-card-header-icon" />}>
                <ul className="nd-md-list">
                  <li>
                    <strong>Node Types.</strong> In Filters &amp; Controls, toggle the pill buttons to show or hide
                    whole categories of nodes (for example Destinations or Calls) on the current layer.
                  </li>
                  <li>
                    <strong>Search &amp; Highlight.</strong> Type a call ID or label and matching nodes are
                    highlighted while the rest fade out. Search highlights matches — it doesn&rsquo;t remove the
                    non-matching nodes.
                  </li>
                  <li>
                    <strong>Timeline scrubber (&ldquo;Calls over time&rdquo;).</strong> Open it from the bar-chart
                    icon in the right rail. Drag the handles across the monthly bar chart to keep only the calls whose
                    opening/deadline dates fall inside your chosen window.
                  </li>
                  <li>
                    <strong>Reset All Filters.</strong> The button at the bottom of Filters &amp; Controls restores
                    hidden nodes, clears the search highlight and re-fits the graph.
                  </li>
                </ul>
              </Section>

              {/* ---- Hover & node detail ---- */}
              <Section title="Looking at a call: hover cards & detail pages" icon={<ArticleOutlinedIcon fontSize="small" className="nd-card-header-icon" />}>
                <P>
                  Hover any node for a floating summary card with its name, type and a short description (you can drag
                  the card to reposition it). For a <strong>call</strong>, the card also shows quick stats — type of
                  action, minimum/maximum contribution, indicative budget and an Open / Forthcoming / Closed status —
                  plus <strong>Related Topics</strong> chips (research fields drawn from CORDIS, see below).
                </P>
                <P>
                  The card&rsquo;s button adapts to the node: <strong>Enter Graph</strong> drills into a
                  cluster, destination or programme, while <strong>View Details</strong> on a call opens its full{" "}
                  <strong>Node Detail page</strong>, where you&rsquo;ll find:
                </P>
                <ul className="nd-md-list">
                  <li>
                    <strong>Key Information</strong> — contributions, total budget, type of action, the indicative
                    number of projects and the call identifiers (and Technology Readiness Level where given).
                  </li>
                  <li>
                    <strong>Timeline</strong> — opening date and application deadline(s), and an <strong>Official
                    Call Page</strong> button that opens the topic on the EU Funding &amp; Tenders Portal.
                  </li>
                  <li>
                    <strong>Description sections</strong> — the call&rsquo;s objective, scope, expected outcomes and
                    conditions, each expandable.
                  </li>
                  <li>
                    <strong>Connections</strong> — links to related programmes, destinations and calls; click one to
                    jump straight to it.
                  </li>
                  <li>
                    <strong>Bookmark this Call</strong> — saves it to your bookmarks for later.
                  </li>
                </ul>
              </Section>

              {/* ---- CORDIS evidence ---- */}
              <Section title="CORDIS funded-project evidence" icon={<ScienceOutlinedIcon fontSize="small" className="nd-card-header-icon" />}>
                <P>
                  This is where the app goes beyond the official text. <strong>CORDIS</strong> is the EU&rsquo;s public
                  database of funded research projects. For calls that have been linked to CORDIS, the call detail page
                  adds evidence cards describing the real EU-funded research in that call&rsquo;s <strong>subject
                  area</strong> — not the call&rsquo;s own budget or scope:
                </P>

                <Sub>Funded projects on this subject</Sub>
                <P>
                  How many EU-funded projects sit in this research area, the total EU contribution awarded, a
                  breakdown across framework programmes (Horizon Europe, Horizon 2020, FP7) and the leading
                  organisations and countries.
                </P>

                <Sub>Funding history</Sub>
                <P>
                  A year-by-year chart of funded activity, colour-coded by framework-programme era, switchable between
                  project counts and euros of EU funding.
                </P>

                <Sub>Related calls</Sub>
                <P>
                  Other calls whose funded projects fall in the same research fields, with the shared fields shown as
                  chips. Click any related call to open it.
                </P>

                <Sub>Who works in this area</Sub>
                <P>
                  The organisations most active in the area, showing how often each one leads (coordinates) versus
                  partners (joins) projects, filterable by country and organisation type.
                </P>

                <Muted>
                  These cards appear only for calls that have linked CORDIS data, and they reflect EU-funded
                  participation — &ldquo;most active&rdquo; is not &ldquo;best&rdquo;. Every figure describes the
                  research area, not the individual call.
                </Muted>
              </Section>

              {/* ---- Dashboard ---- */}
              <Section title="The Portfolio Dashboard" icon={<BarChartOutlinedIcon fontSize="small" className="nd-card-header-icon" />}>
                <P>
                  Switch from the graph to the Portfolio Dashboard with <strong>Open Dashboard</strong> in the top bar
                  (or the dashboard icon). It summarises the whole loaded portfolio as a grid of cards:
                </P>
                <ul className="nd-md-list">
                  <li>
                    A headline banner and KPI cards — total committed budget on offer, open calls, calls closing
                    within 30 days, and topics tracked. These are <strong>planned</strong> figures (money on offer),
                    not money awarded.
                  </li>
                  <li>
                    <strong>Funding by programme</strong> — programmes ranked by budget, with Planned (work-programme
                    indicative budget) and, where CORDIS data exists, Awarded (EU funding actually granted) shown side
                    by side.
                  </li>
                  <li>
                    <strong>Calls over time</strong> and <strong>Topic distribution</strong> — when calls open and
                    close through the year, and how they split across broad themes.
                  </li>
                  <li>
                    <strong>Open calls closing soon</strong> — the next deadlines, with a button to jump back to the
                    graph.
                  </li>
                </ul>
                <P>
                  Where CORDIS data is available, a <strong>&ldquo;What&rsquo;s actually been funded&rdquo;</strong>{" "}
                  section adds funded-reality KPIs (funded projects, EU&nbsp;&euro; awarded, organisations, countries
                  and research fields) plus leaderboards of funded activity across framework-programme eras, the top
                  research domains, the top countries and the top organisations.
                </P>
              </Section>

              {/* ---- CORDIS research tools ---- */}
              <Section title="CORDIS research tools" icon={<TravelExploreOutlinedIcon fontSize="small" className="nd-card-header-icon" />}>
                <P>
                  Three deeper CORDIS tools open as tabs at the top of the dashboard — launch them from the right-rail
                  icons (each takes you to the dashboard and opens its tab):
                </P>
                <ul className="nd-md-list">
                  <li>
                    <strong>Research fields.</strong> Browse the EuroSciVoc research-field hierarchy, each field
                    showing its funded-project and call counts. Pick a field to list the Horizon Europe calls funded
                    in it, ranked by relevance; click a call to open it.
                  </li>
                  <li>
                    <strong>Country activity.</strong> Choose a country to see the research areas its organisations
                    are most active in (leading versus joining). Your choice also tints the call nodes back in the
                    graph — green for led, lighter green for joined, dimmed for EU-funded elsewhere.
                  </li>
                  <li>
                    <strong>Hop-on opportunities.</strong> Recently started, ongoing Horizon Europe (Pillar II / EIC
                    Pathfinder) collaborative projects a widening-country partner might still be able to join, showing
                    the consortium so far and the widening countries not yet in it. A shortlist to investigate — not
                    an official eligibility ruling.
                  </li>
                </ul>
              </Section>

              {/* ---- Compare ---- */}
              <Section title="Comparing programmes" icon={<CompareArrowsIcon fontSize="small" className="nd-card-header-icon" />}>
                <P>
                  Open <strong>Compare programmes</strong> from the right icon rail, then click two programmes or
                  pillars on the graph. The panel stands them side by side and compares total budget, structure, open
                  calls, average call size and shared topics, and a <strong>&ldquo;Compare: A → B&rdquo;</strong> pill
                  appears in the top bar.
                </P>
                <Muted>
                  Compare and the Timeline scrubber are available on the funding graphs, not on the flat strategic-plan
                  knowledge graph.
                </Muted>
              </Section>

              {/* ---- AI search ---- */}
              <Section title="AI search" icon={<AutoAwesomeOutlinedIcon fontSize="small" className="nd-card-header-icon" />}>
                <P>
                  Click the sparkle <strong>AI search</strong> button on the graph to ask a plain-language question
                  about Horizon Europe 2026–2027 calls — for example,
                  &ldquo;climate calls in cluster 5 closing after September 2026&rdquo;. You get a written answer and a
                  list of matching calls. From there you can:
                </P>
                <ul className="nd-md-list">
                  <li>See the matches <strong>highlighted on the graph</strong>, and narrow them with the filter chips.</li>
                  <li><strong>Jump to</strong> a call on the graph, or <strong>open its details</strong>.</li>
                  <li><strong>Bookmark</strong> a call straight from the results.</li>
                </ul>
                <Muted>
                  AI search covers the Horizon Europe 2026–2027 calls and answers one question at a time — it
                  isn&rsquo;t a running chat with memory.
                </Muted>
              </Section>

              {/* ---- Bookmarks, themes, feedback ---- */}
              <Section title="Bookmarks, themes & feedback" icon={<SettingsOutlinedIcon fontSize="small" className="nd-card-header-icon" />}>
                <ul className="nd-md-list">
                  <li>
                    <strong>Bookmarks.</strong> Save calls from a call&rsquo;s detail page or from the AI search
                    results, and open them any time from the bookmark icon in the right rail (its badge shows how many
                    you have saved). Bookmarks are stored in your browser on this device.
                  </li>
                  <li>
                    <strong>Light / dark mode.</strong> Toggle the theme from the right rail; the whole app re-themes
                    instantly.
                  </li>
                  <li>
                    <strong>Send a message.</strong> Use the envelope icon to send feedback to the app&rsquo;s
                    maintainers.
                  </li>
                  <li>
                    <strong>On a phone or tablet.</strong> The app is designed for landscape; rotate your device if you
                    see the &ldquo;Rotate your device&rdquo; prompt.
                  </li>
                </ul>
              </Section>
            </div>

            {/* RIGHT: sidebar */}
            <aside className="nd-sidebar">
              {/* Quick start */}
              <Box className="nd-card">
                <Box className="nd-card-header nd-card-header--with-icon">
                  <Typography variant="body2" className="nd-card-title nd-muted-label">
                    Quick start
                  </Typography>
                  <InfoOutlinedIcon fontSize="small" className="nd-card-header-icon" />
                </Box>
                <Box className="nd-card-body nd-card-body--text">
                  <ul className="nd-md-list">
                    <li>
                      The app opens on the <strong>EU Funding Programmes</strong> graph — click a node such as
                      Horizon Europe to drill down to pillars, clusters, destinations and calls.
                    </li>
                    <li>
                      Use the top breadcrumbs (&ldquo;Level up&rdquo;, Home) to step back, or the <strong>Graph
                      Dataset</strong> tree on the left to jump to a programme.
                    </li>
                    <li>
                      Hover a node for a summary; click <strong>View Details</strong> on a call for budgets,
                      deadlines, the official portal link and CORDIS evidence where available.
                    </li>
                    <li>
                      Use the <strong>right icon rail</strong> for the Timeline, Compare, the CORDIS tools and
                      Bookmarks; use <strong>Open Dashboard</strong> in the top bar for the portfolio view.
                    </li>
                    <li>
                      Try the <strong>AI search</strong> sparkle button to find calls with a plain-language query.
                    </li>
                  </ul>
                </Box>
              </Box>

              {/* Right icon rail reference */}
              <Box className="nd-card">
                <Box className="nd-card-header">
                  <Typography variant="body2" className="nd-card-title nd-muted-label">
                    The right icon rail
                  </Typography>
                </Box>
                <Box className="nd-card-body nd-card-body--text">
                  <ul className="nd-md-list">
                    <li>Help &amp; Documentation</li>
                    <li>Switch light / dark mode</li>
                    <li>View bookmarks</li>
                    <li>Send a message</li>
                    <li>Timeline scrubber *</li>
                    <li>Compare programmes *</li>
                    <li>Browse research fields *</li>
                    <li>Country activity overlay *</li>
                    <li>Hop-on opportunities *</li>
                    <li>Graph layout &amp; settings</li>
                  </ul>
                  <Muted>* Shown on the funding graphs only.</Muted>
                </Box>
              </Box>

              {/* Good to know */}
              <Box className="nd-card">
                <Box className="nd-card-header">
                  <Typography variant="body2" className="nd-card-title nd-muted-label">
                    Good to know
                  </Typography>
                </Box>
                <Box className="nd-card-body nd-card-body--text">
                  <ul className="nd-md-list">
                    <li>
                      <strong>CORDIS sections appear where data has been loaded.</strong> Without CORDIS data for a
                      call or programme, the funded-project cards and the dashboard&rsquo;s funded-reality section are
                      simply hidden.
                    </li>
                    <li>
                      <strong>CORDIS describes a call&rsquo;s research area</strong>, drawn from EU-funded projects —
                      not the call&rsquo;s official budget or scope, and not a measure of quality.
                    </li>
                    <li>
                      <strong>Bookmarks live in your browser</strong> on this device; clearing browser data removes
                      them.
                    </li>
                    <li>
                      <strong>Some tools are dataset-specific</strong> — the strategic-plan knowledge graph hides the
                      Timeline, Compare and CORDIS tools.
                    </li>
                  </ul>
                </Box>
              </Box>

              {/* Links */}
              <Box className="nd-card">
                <Box className="nd-card-header">
                  <Typography variant="body2" className="nd-card-title nd-muted-label">
                    Jump back in
                  </Typography>
                </Box>
                <Box className="nd-card-body nd-card-body--text">
                  <Button
                    fullWidth
                    variant="outlined"
                    endIcon={<OpenInNewIcon fontSize="small" />}
                    onClick={() => navigate("/")}
                    sx={{ mb: 1 }}
                  >
                    Open Graph
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    endIcon={<BookmarksOutlinedIcon fontSize="small" />}
                    onClick={() => navigate("/bookmarks")}
                  >
                    Open Bookmarks
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
