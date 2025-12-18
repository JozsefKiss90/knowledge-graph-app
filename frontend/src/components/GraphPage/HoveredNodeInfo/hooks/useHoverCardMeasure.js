import { useLayoutEffect, useRef, useState } from "react";

export function useHoverCardMeasure() {
  const cardRef = useRef(null);
  const [cardSize, setCardSize] = useState({ w: 360, h: 260 });

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries?.[0];
      const cr = entry?.contentRect;
      if (!cr) return;
      setCardSize({ w: cr.width, h: cr.height });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { cardRef, cardSize };
}
