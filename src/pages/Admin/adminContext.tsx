// src/pages/Admin/adminContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const LS_TOKEN = "neox_admin_token";

type AdminCtx = {
  apiBase: string; // normalized (no trailing slash). "" => same-origin
  token: string;
  setToken: (t: string) => void;
  logout: () => void;
};

const Ctx = createContext<AdminCtx | null>(null);

function normalizeBase(v: string) {
  const s = String(v || "").trim().replace(/\/+$/, "");
  return s; // "" is allowed (same-origin)
}

export function AdminProvider({
  apiBase,
  children,
}: {
  apiBase: string;
  children: React.ReactNode;
}) {
  const [token, setTokenState] = useState(() => localStorage.getItem(LS_TOKEN) || "");

  const base = useMemo(() => normalizeBase(apiBase), [apiBase]);

  const setToken = (t: string) => {
    const v = String(t || "").trim();

    if (!v) {
      localStorage.removeItem(LS_TOKEN);
      setTokenState("");
      return;
    }

    localStorage.setItem(LS_TOKEN, v);
    setTokenState(v);
  };

  const logout = () => {
    localStorage.removeItem(LS_TOKEN);
    setTokenState("");
  };

  // sync between tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_TOKEN) setTokenState(e.newValue || "");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({
      apiBase: base,
      token,
      setToken,
      logout,
    }),
    [base, token]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdmin() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdmin must be used inside <AdminProvider>");
  return v;
}
