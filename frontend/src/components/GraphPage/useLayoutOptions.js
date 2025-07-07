import { useState } from "react";

export function useLayoutOptions() {
  const [layoutOptions, setLayoutOptions] = useState({
    name: "cose-bilkent",
    nodeRepulsion: 10000,
    idealEdgeLength: 140,
    edgeElasticity: 0.1,
    fit: false,
    animate: false,
    numIter: 12500
  });

  const updateOption = (key, value) => {
    setLayoutOptions((prev) => ({ ...prev, [key]: value }));
  };

  return {
    layoutOptions,
    setLayoutOptions,
    updateOption
  };
}
