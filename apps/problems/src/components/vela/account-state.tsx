"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type AccountState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "signed_out" }
  | { status: "signed_in"; account: { displayName: string; email: string; initials: string } };

function isAccountState(value: unknown): value is Exclude<AccountState, { status: "loading" }> {
  if (!value || typeof value !== "object" || !("status" in value)) return false;
  const record = value as Record<string, unknown>;
  if (record.status === "unavailable" || record.status === "signed_out") return true;
  if (record.status !== "signed_in" || !record.account || typeof record.account !== "object") return false;
  const account = record.account as Record<string, unknown>;
  return [account.displayName, account.email, account.initials].every((field) => typeof field === "string");
}

const AccountStateContext = createContext<AccountState>({ status: "unavailable" });
const unavailableAccountState: AccountState = { status: "unavailable" };

export function AccountStateProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const [state, setState] = useState<AccountState>({ status: "loading" });

  useEffect(() => {
    if (!enabled) return;
    let current = true;
    void fetch("/api/account", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("account request failed");
        const value: unknown = await response.json();
        if (!isAccountState(value)) throw new Error("invalid account response");
        if (current) setState(value);
      })
      .catch(() => {
        if (current) setState({ status: "unavailable" });
      });
    return () => { current = false; };
  }, [enabled]);

  return <AccountStateContext.Provider value={enabled ? state : unavailableAccountState}>{children}</AccountStateContext.Provider>;
}

export function useAccountState(): AccountState {
  return useContext(AccountStateContext);
}
