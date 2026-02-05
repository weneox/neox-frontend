import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const LS_TOKEN = "neox_admin_token";

type AdminCtx = {
  apiBase: string;
  token: string;
  setToken: (t: string) => void;
  logout: () => void;
};

const Ctx = createContext<AdminCtx | null>(null);

export function AdminProvider({ apiBase, children }: { apiBase: string; children: React.ReactNode }) {
  const [token, setTokenState] = useState(() => localStorage.getItem(LS_TOKEN) || "");

  const setToken = (t: string) => {
    const v = (t || "").trim();
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

  const value = useMemo(() => ({ apiBase, token, setToken, logout }), [apiBase, token]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdmin() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdmin must be used inside <AdminProvider>");
  return v;
}
