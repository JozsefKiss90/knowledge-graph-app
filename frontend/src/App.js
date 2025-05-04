import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GraphPage from "./components/GraphPage";
import NodeDetail from "./components/NodeDetail";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GraphPage />} />
        <Route path="/node/:id" element={<NodeDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
