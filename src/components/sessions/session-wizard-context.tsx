"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type SessionType = "Match" | "Training" | "Monthly Review";

export type SessionWizardState = {
  date: string;
  type: SessionType;
  opponent: string;
  notes: string;
  pillarIds: string[];
  playerIds: string[];
};

const DEFAULT_STATE: SessionWizardState = {
  date: new Date().toISOString().slice(0, 10),
  type: "Training",
  opponent: "",
  notes: "",
  pillarIds: [],
  playerIds: [],
};

type SessionWizardContextValue = {
  state: SessionWizardState;
  update: (patch: Partial<SessionWizardState>) => void;
};

const SessionWizardContext = createContext<SessionWizardContextValue | null>(
  null,
);

export function SessionWizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionWizardState>(DEFAULT_STATE);

  function update(patch: Partial<SessionWizardState>) {
    setState((s) => ({ ...s, ...patch }));
  }

  return (
    <SessionWizardContext.Provider value={{ state, update }}>
      {children}
    </SessionWizardContext.Provider>
  );
}

export function useSessionWizard() {
  const ctx = useContext(SessionWizardContext);
  if (!ctx) {
    throw new Error(
      "useSessionWizard must be used within a SessionWizardProvider",
    );
  }
  return ctx;
}
