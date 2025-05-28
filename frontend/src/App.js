import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GraphPage from "./components/GraphPage";
import NodeDetail from "./components/NodeDetail";
import { ThemeProvider } from '@mui/material/styles';
import theme from "./themes/theme";
import { DarkModeProvider } from "./components/context/DarkModeContext";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <DarkModeProvider>
        <Router>
          <Routes>
            <Route path="/" element={<GraphPage />} />
            <Route path="/node/:id" element={<NodeDetail />} />
          </Routes>
        </Router>
      </DarkModeProvider>
    </ThemeProvider>
  );
}

export default App;
