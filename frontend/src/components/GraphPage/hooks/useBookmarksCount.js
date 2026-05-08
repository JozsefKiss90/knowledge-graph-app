import { useCallback, useEffect, useState } from "react";

export function useBookmarksCount() {
  const read = useCallback(() => {
    const stored = JSON.parse(localStorage.getItem("bookmarkedCalls") || "[]");
    return stored.length;
  }, []);

  const [count, setCount] = useState(read);

  useEffect(() => {
    const refresh = () => setCount(read());

    // Same-tab updates (dispatched from ChatBot / NodeDetail)
    window.addEventListener("bookmarksChanged", refresh);
    // Cross-tab updates
    window.addEventListener("storage", (e) => {
      if (e.key === "bookmarkedCalls") refresh();
    });

    return () => {
      window.removeEventListener("bookmarksChanged", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [read]);

  return count;
}
