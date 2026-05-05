import { useEffect, useState } from "react";

export function useBookmarksCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("bookmarkedCalls") || "[]");
    setCount(stored.length);
  }, []);

  return count;
}
