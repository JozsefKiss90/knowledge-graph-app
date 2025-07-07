// src/components/Legendparts/GraphSelector.js

const GraphSelector = ({ graphName, setGraphName }) => {
  const cleanGraphName = graphName.replace("_cose", "");

  const handleChange = (e) => {
    const selected = e.target.value;
    const useCoseLayout = ["Cluster_2", "Cluster_4"].includes(selected);
    const updatedGraphName = useCoseLayout ? `${selected}_cose` : selected;
    setGraphName(updatedGraphName);
  };

  return (
    <div className="graph-selector">
      <select
        className="graph-filter"
        value={cleanGraphName}
        onChange={handleChange}
      >
        <option value="HE_2025">Horizon Europe strategic plan (2025 – 2027)</option>
        <option value="Cluster_2">Work Programme 2025 - Culture, Creativity and Inclusive Society</option>
        <option value="Cluster_4">Work Programme 2025 - Digital, Industry and Space</option>
      </select>
    </div>
  );
};

export default GraphSelector;
