import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GraphPage from "./components/GraphPage/GraphPage";
import NodeDetail from "./components/NodeDetail";
import { ThemeProvider } from '@mui/material/styles';
import theme from "./themes/theme";
import { DarkModeProvider, useDarkMode } from "./components/context/DarkModeContext";
import './styles/main.scss';
import { useEffect } from 'react';
import BookmarkedCalls from "./components/BookmarkedCalls";
import About from "./components/About";

function AppContent() {
  const { darkMode } = useDarkMode();

  useEffect(() => {
    document.body.classList.toggle('dark-theme', darkMode);
    document.body.classList.toggle('light-theme', !darkMode);
  }, [darkMode]);
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GraphPage />} />
        <Route path="/node/:id" element={<NodeDetail />} />
        <Route path="/bookmarks" element={<BookmarkedCalls />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
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
