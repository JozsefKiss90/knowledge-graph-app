// src/components/LegendParts/GraphSelector.js

// Graphs that should use the "cose" variant when selected
const coseGraphs = new Set([
  "Cluster_2",
  "Cluster_3",
  "Cluster_4",
  "Cluster_5",
  "Cluster_1",
  "Cluster_6",
]);

// We now include a "Meta layout" group for ROOT
const optionGroups = [
  {
    label: "Meta layout",
    options: [
      { value: "ROOT", label: "Horizon Europe (meta view)" },
    ],
  },
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
      { value: "Cluster_1", label: "Work Programme 2026 - Cluster 1 Health" },
      { value: "Cluster_6", label: "Work Programme 2026 - Food, Bioeconomy & Environment" },
      { value: "Cluster_2", label: "Work Programme 2026 - Culture, Creativity & Inclusive Society" },
      { value: "Cluster_3", label: "Work Programme 2026 - Civil Security for Society" },
      { value: "Cluster_4", label: "Work Programme 2026 - Digital, Industry & Space" },
      { value: "Cluster_5", label: "Work Programme 2026 - Climate, Energy & Mobility" },
    ],
  },
];

const GraphSelector = ({ graphName, setGraphName }) => {
  // the dropdown shows the "clean" graph key (without _cose suffix)
  const cleanGraphName = graphName.replace("_cose", "");

  const handleChange = (e) => {
    const selected = e.target.value;

    // ROOT and HE_2025 should never get a "_cose" suffix
    if (selected === "ROOT" || selected === "HE_2025") {
      setGraphName(selected);
      return;
    }

    // clusters may toggle default "cose" layout by suffixing _cose
    const updated = coseGraphs.has(selected) ? `${selected}_cose` : selected;
    setGraphName(updated);
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
