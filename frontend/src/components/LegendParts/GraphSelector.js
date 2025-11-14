// src/components/Legendparts/GraphSelector.js

const coseGraphs = new Set([
  "Cluster_2",
  "Cluster_3",
  "Cluster_4",
  "Cluster_5",
  "Cluster_1_2026",
  "Cluster_6_2026",
]);

const optionGroups = [
  {
    label: "Strategic Plans",
    options: [
      {
        value: "HE_2025",
        label: "Horizon Europe strategic plan (2025 - 2027)",
      },
    ],
  },
  {
    label: "Clusters - 2026",
    options: [
      {
        value: "Cluster_1_2026",
        label: "Work Programme 2026 - Cluster 1 Health",
      },
      {
        value: "Cluster_6_2026",
        label: "Work Programme 2026 - Cluster 6 Food, Bioeconomy & Environment",
      },
      {
        value: "Cluster_2",
        label: "Work Programme 2026 - Culture, Creativity and Inclusive Society",
      },
      {
        value: "Cluster_3",
        label: "Work Programme 2026 - Civil Security for Society",
      },
      {
        value: "Cluster_4",
        label: "Work Programme 2026 - Digital, Industry and Space",
      },
      {
        value: "Cluster_5",
        label: "Work Programme 2026 - Climate, Energy and Mobility",
      }
    ],
  },
];

const GraphSelector = ({ graphName, setGraphName }) => {
  const cleanGraphName = graphName.replace("_cose", "");

  const handleChange = (e) => {
    const selected = e.target.value;
    const updatedGraphName = coseGraphs.has(selected) ? `${selected}_cose` : selected;
    setGraphName(updatedGraphName);
  };

  return (
    <div className="graph-selector">
      <select
        className="graph-filter"
        value={cleanGraphName}
        onChange={handleChange}
      >
        {optionGroups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
};

export default GraphSelector;
