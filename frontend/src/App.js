import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GraphPage from "./components/GraphPage/GraphPage";
import NodeDetail from "./components/NodeDetail";
import { ThemeProvider } from '@mui/material/styles';
import theme from "./themes/theme";
import { DarkModeProvider, useDarkMode } from "./components/context/DarkModeContext";
import './styles/main/main.scss';
import BookmarkedCalls from "./components/BookmarkedCalls";
import OrgDossier from "./components/OrgDossier";
import About from "./components/About";

// Soft, dismissible orientation nudge (replaces the old hard landscape gate).
// The layout is responsive now, so we never block — we only suggest landscape on
// genuinely small portrait phones, and remember "Continue anyway".
function RequireLandscape({ children }) {
  const [showNudge, setShowNudge] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("kg:orientationNudgeDismissed") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const compute = () => {
      const portraitByMQ = window.matchMedia?.("(orientation: portrait)")?.matches;
      const portraitByDims = window.innerHeight > window.innerWidth;
      const isPortrait = Boolean(portraitByMQ ?? portraitByDims) || portraitByDims;
      // Only nudge on small phones ( < $bp-sm ). Tablets/desktops in portrait are
      // fine now that the layout adapts.
      const isNarrow = window.innerWidth < 600;
      setShowNudge(isPortrait && isNarrow);
    };

    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);

    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
    };
  }, []);

  // Optional best-effort lock (mostly Android / PWA). Must be user-gesture in many browsers.
  const tryLockLandscape = async () => {
    try {
      if (window.screen?.orientation?.lock) {
        await window.screen.orientation.lock("landscape");
      }
    } catch {
      // Ignore: not supported / not allowed (common on iOS Safari)
    }
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("kg:orientationNudgeDismissed", "1");
    } catch {
      // ignore storage failures — the nudge just returns next session
    }
  };

  return (
    <>
      {children}

      {showNudge && !dismissed && (
        <div className="orientation-nudge" role="dialog" aria-label="Rotate for a better view">
          <div className="orientation-nudge__card">
            <div className="orientation-nudge__title">Best viewed in landscape</div>
            <div className="orientation-nudge__body">
              This is a dense funding map — rotating your phone (or using a larger screen)
              gives it more room. You can keep going in portrait if you prefer.
            </div>
            <div className="orientation-nudge__actions">
              <button
                type="button"
                className="orientation-nudge__btn orientation-nudge__btn--primary"
                onClick={tryLockLandscape}
              >
                Switch to landscape
              </button>
              <button type="button" className="orientation-nudge__btn" onClick={dismiss}>
                Continue anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AppContent() {
  const { darkMode } = useDarkMode();

  useEffect(() => {
    document.body.classList.toggle("dark-theme", darkMode);
    document.body.classList.toggle("light-theme", !darkMode);
  }, [darkMode]);

  return (
    <RequireLandscape>
      <Router>
        <Routes>
          <Route path="/" element={<GraphPage />} />
          <Route path="/node/:id" element={<NodeDetail />} />
          <Route path="/org/:orgId" element={<OrgDossier />} />
          <Route path="/bookmarks" element={<BookmarkedCalls />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Router>
    </RequireLandscape>
  );
}
// Wrap with providers
function App() {
  return (
    <ThemeProvider theme={theme}>
      <DarkModeProvider>
        <AppContent />
      </DarkModeProvider>
    </ThemeProvider>
  );
}

export default App;
// TRIPWIRE_2026_01_03