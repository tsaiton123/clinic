import { useEffect, useRef, useState } from "react";
import { subscribeToApiChanges } from "./api";

// Scope is part of the key so late responses can never replace another scope.
export function useApiQuery<T>(key: string | null, load: () => Promise<T>) {
  const loader = useRef(load);
  loader.current = load;
  const [state, setState] = useState<{ key: string | null; data: T | null; error: string }>({
    key: null, data: null, error: "",
  });

  useEffect(() => {
    if (key === null) return;
    let sequence = 0;
    let active = true;
    function refresh() {
      const requestId = ++sequence;
      loader.current().then(
        (data) => {
          if (active && requestId === sequence) setState({ key, data, error: "" });
        },
        (error: unknown) => {
          if (active && requestId === sequence) {
            setState({ key, data: null, error: error instanceof Error ? error.message : "資料讀取失敗" });
          }
        },
      );
    }
    refresh();
    const unsubscribe = subscribeToApiChanges(refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("focus", refresh);
    };
  }, [key]);

  return key !== null && state.key === key ? state : { key, data: null, error: "" };
}
