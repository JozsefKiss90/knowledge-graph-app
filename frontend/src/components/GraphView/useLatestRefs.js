import { useEffect, useRef } from "react";

export function useLatestRefs({
  nestedHandlers,
  onNodeHover,
  onHoverNodeIdChange,
  onCyReady,
  layoutOptions,
}) {
  const nhRef = useRef(nestedHandlers);
  const hoverRef = useRef(onNodeHover);
  const hoverIdRef = useRef(onHoverNodeIdChange);
  const onCyReadyRef = useRef(onCyReady);

  useEffect(() => {
    nhRef.current = nestedHandlers;
  }, [nestedHandlers]);

  useEffect(() => {
    hoverRef.current = onNodeHover;
  }, [onNodeHover]);

  useEffect(() => {
    hoverIdRef.current = onHoverNodeIdChange;
  }, [onHoverNodeIdChange]);

  useEffect(() => {
    onCyReadyRef.current = onCyReady;
  }, [onCyReady]);

  const layoutOptionsRef = useRef(layoutOptions);
  useEffect(() => {
    layoutOptionsRef.current = layoutOptions;
  }, [layoutOptions]);

  const lastLayoutNameRef = useRef(layoutOptions?.name || "cose-bilkent");

  return {
    nhRef,
    hoverRef,
    hoverIdRef,
    onCyReadyRef,
    layoutOptionsRef,
    lastLayoutNameRef,
  };
}
