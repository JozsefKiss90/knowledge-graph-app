import { Container, OverlayTrigger, Tooltip } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import IconButton from "@mui/material/IconButton";

function About() {
  const navigate = useNavigate();

  return (
    <Container className="mt-4 text-light">
      <h2>ℹ️ About This Application</h2>

      <p>
        This demo application enables intuitive, graph-based exploration of EU policy and research materials.
        It has been designed to researchers, project managers and academic stakeholders in extracting structured
        information from complex documents such as <strong>Horizon Europe Work Programmes</strong>,
        <strong> policy frameworks</strong>, and <strong>strategy papers</strong>.
      </p>

      <h4>🧠 Purpose</h4>
      <p>
        EU research and innovation documentation often contains intricate relationships between clusters,
        destinations, calls, policies, themes, and strategic goals. This app turns those relationships into
        interactive network graphs — helping you visually explore the context behind any element.
      </p>

      <h4>🌐 Available Graphs</h4>
      <p>
        As a demo, the application includes three preloaded graphs:
      </p>
      <ul>
        <li><strong>Work Programme 2025 - Cluster 2:</strong> Culture, Creativity and Inclusive Society</li>
        <li><strong>Work Programme 2025 - Cluster 4:</strong> Digital, Industry and Space</li>
        <li><strong>Horizon Europe strategic plan (2025 – 2027):</strong> A hybrid policy-to-calls graph including scores and similarities</li>
      </ul>

      <h4>🧩 Features</h4>
      <ul>
        <li><strong>Interactive Graph View:</strong> Visualize and zoom into call topics, destinations, themes, etc.</li>
        <li>
          <strong>Legend Sidebar:</strong> Toggle visibility of different <em>node types</em> (e.g. calls, topics) and
          <em> edge types</em> (e.g. "belongs to", "has call").
          
            When you hover over a node in the graph, detailed information about that node — such as its name, type,
            and metadata — is displayed directly in the sidebar. This allows you to quickly inspect nodes without
            having to click or navigate away.
        
        </li>
        <li><strong>Search:</strong> Instantly locate any node by keyword</li>
        <li><strong>Score Filter (HE strategic plan only):</strong> Filter call-topic similarity edges by score</li>
        <li><strong>Dark/Light Mode:</strong> Toggle theme to suit your preference</li>
        <li><strong>Node Details:</strong> Click a node to view detailed information and structured metadata (e.g. opening date, funding, scope)</li>
        <li><strong>Call Bookmarking:</strong> Save calls of interest (Cluster 2 and 4 only) and access them later from the 📌 bookmark panel</li>
      </ul>
      <h4>🔗 Edge Types</h4>
        <p>
          Each connection in the graph represents a meaningful relationship between entities (nodes).
          You can selectively toggle these edge types in the sidebar to control which connections are displayed:
        </p>
        <ul>
          <li><strong>HAS_CALL:</strong> Connects a destination to a call that implements or supports it.</li>
          <li><strong>BELONGS_TO_TOPIC:</strong> Links a call to a research or policy topic it addresses directly.</li>
          <li><strong>SHARED_TOPIC:</strong> Indicates that two calls address a common topic, revealing thematic overlaps.</li>
          <li><strong>CROSS_TOPIC_SIMILARITY:</strong> Shows similarity scores between topics based on semantic or contextual closeness (Cluster HE_2025 only).</li>
          <li><strong>BELONGS_TO_DESTINATION:</strong> Highlights which broader policy destination a topic or objective contributes to.</li>
        </ul>
        <p>
          You can hover over any edge type in the legend to temporarily highlight those connections in the graph,
          making it easier to visually trace relationships and focus your exploration.
        </p>
      <h4>🧪 Demo Status</h4>
      <p>
        This is a prototype application built to showcase what's possible when EU documents are parsed and structured into a knowledge graph. Based on your feedback and requests, additional features and data sources may be integrated in the future.
      </p>
      <OverlayTrigger
          placement="right"
          overlay={<Tooltip id="tooltip-back">Go to Graph View</Tooltip>}
      >
        <IconButton

          size="large"
          onClick={() => navigate("/")}
          style={{ color: "#39ff14", marginBottom: "1rem", boxShadow: "0 0 8px #39ff14, 0 0 15px #39ff14" }}
        >
        <ArrowBackIcon fontSize="large" />
        </IconButton>
      </OverlayTrigger>
    </Container>
  );
}

export default About;
