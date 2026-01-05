import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GraphPage from "./components/GraphPage/GraphPage";
import NodeDetail from "./components/NodeDetail";
import { ThemeProvider } from '@mui/material/styles';
import theme from "./themes/theme";
import { DarkModeProvider, useDarkMode } from "./components/context/DarkModeContext";
import './styles/main/main.scss';
import BookmarkedCalls from "./components/BookmarkedCalls";
import About from "./components/About";

function RequireLandscape({ children }) {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const compute = () => {
      // Use both APIs to be resilient across browsers
      const portraitByMQ = window.matchMedia?.("(orientation: portrait)")?.matches;
      const portraitByDims = window.innerHeight > window.innerWidth;
      setIsPortrait(Boolean(portraitByMQ ?? portraitByDims) || portraitByDims);
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

  return (
    <>
      {children}

      {isPortrait && (
        <div className="orientation-overlay" role="dialog" aria-modal="true">
          <div className="orientation-overlay__card">
            <div className="orientation-overlay__title">Rotate your device</div>
            <div className="orientation-overlay__body">
              This application is optimized for landscape view on mobile.
              Please rotate your phone to continue.
            </div>

            <button
              type="button"
              className="orientation-overlay__button"
              onClick={tryLockLandscape}
            >
              Switch to landscape
            </button>
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