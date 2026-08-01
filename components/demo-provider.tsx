"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import type { DemoAction, DemoState } from "@/lib/domain";

interface DemoContextValue {
  state: DemoState;
  act: (action: DemoAction) => Promise<void>;
  reset: () => Promise<void>;
  refresh: () => Promise<void>;
  pending: boolean;
  notice?: string;
  clearNotice: () => void;
}
const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({
  initialState,
  children,
}: {
  initialState: DemoState;
  children: ReactNode;
}) {
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string>();
  const act = useCallback(async (action: DemoAction) => {
    const response = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Action failed");
    startTransition(() => setState(body));
    setNotice("Saved to the demo record");
  }, []);
  const reset = useCallback(async () => {
    const response = await fetch("/api/reset", { method: "POST" });
    const body = await response.json();
    startTransition(() => setState(body));
    setNotice("Demo reset to its deterministic starting point");
  }, []);
  const refresh = useCallback(async () => {
    const response = await fetch("/api/state", { cache: "no-store" });
    const body = await response.json();
    startTransition(() => setState(body));
    setNotice("Local record refreshed");
  }, []);
  const value = useMemo(
    () => ({
      state,
      act,
      reset,
      refresh,
      pending,
      notice,
      clearNotice: () => setNotice(undefined),
    }),
    [state, act, reset, refresh, pending, notice],
  );
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemo must be used inside DemoProvider");
  return value;
}
