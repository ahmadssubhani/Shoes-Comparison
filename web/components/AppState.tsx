"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const SAVED_KEY = "shoescope-saved";
const COMPARE_KEY = "shoescope-compare";
const MAX_COMPARE = 4;

function readList(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string" && id.trim()) : [];
  } catch {
    return [];
  }
}

function writeList(key: string, value: string[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode / quota — keep in-memory state only.
  }
}

function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next;
}

type AppStateValue = {
  saved: string[];
  compare: string[];
  toggleSaved: (id: string) => void;
  toggleCompare: (id: string) => void;
  removeCompare: (id: string) => void;
  clearCompare: () => void;
  isSaved: (id: string) => boolean;
  isCompared: (id: string) => boolean;
  canAddCompare: (id: string) => boolean;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);

  useEffect(() => {
    setSaved(uniqueIds(readList(SAVED_KEY)));
    setCompare(uniqueIds(readList(COMPARE_KEY)).slice(0, MAX_COMPARE));

    let cancelled = false;
    fetch("/api/product-ids")
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { ids?: string[] } | null) => {
        if (cancelled || !payload?.ids) return;
        const valid = new Set(payload.ids);
        setCompare((current) => {
          const next = current.filter((id) => valid.has(id));
          if (next.length !== current.length) writeList(COMPARE_KEY, next);
          return next;
        });
        setSaved((current) => {
          const next = current.filter((id) => valid.has(id));
          if (next.length !== current.length) writeList(SAVED_KEY, next);
          return next;
        });
      })
      .catch(() => {
        // Keep local lists if the catalog endpoint is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleSaved = useCallback((id: string) => {
    if (!id) return;
    setSaved((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      writeList(SAVED_KEY, next);
      return next;
    });
  }, []);

  const toggleCompare = useCallback((id: string) => {
    if (!id) return;
    setCompare((current) => {
      if (current.includes(id)) {
        const next = current.filter((item) => item !== id);
        writeList(COMPARE_KEY, next);
        return next;
      }
      const next =
        current.length >= MAX_COMPARE ? [...current.slice(1), id] : [...current, id];
      writeList(COMPARE_KEY, next);
      return next;
    });
  }, []);

  const removeCompare = useCallback((id: string) => {
    setCompare((current) => {
      const next = current.filter((item) => item !== id);
      writeList(COMPARE_KEY, next);
      return next;
    });
  }, []);

  const clearCompare = useCallback(() => {
    writeList(COMPARE_KEY, []);
    setCompare([]);
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      saved,
      compare,
      toggleSaved,
      toggleCompare,
      removeCompare,
      clearCompare,
      isSaved: (id: string) => saved.includes(id),
      isCompared: (id: string) => compare.includes(id),
      canAddCompare: (id: string) => Boolean(id) && (compare.includes(id) || compare.length < MAX_COMPARE),
    }),
    [saved, compare, toggleSaved, toggleCompare, removeCompare, clearCompare],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}

export { MAX_COMPARE };
