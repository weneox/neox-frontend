// src/pages/Admin/adminContext.tsx
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type Lang = "az" | "en" | "tr" | "ru" | "es";
const LANGS: Lang[] = ["az", "en", "tr", "ru", "es"];

const LS_TOKEN = "neox_admin_token";
const LS_LANG = "neox_admin_lang";

function safeGetLS(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLS(key: string, val: string) {
  try {
    localStorage.setItem(key, val);
  } catch {}
}

function safeRemoveLS(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

function normalizeBase(v: any) {
  return String(v || "").trim().replace(/\/+$/, "");
}

type AdminCtx = {
  apiBase: string; // "" => same-origin
  token: string;
  setToken: (t: string) => void;
  logout: () => void;

  adminLang: Lang;
  setAdminLang: (l: Lang) => void;
  langs: Lang[];
};

const Ctx = createContext<AdminCtx | null>(null);

export function useAdmin() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdmin must be used inside <AdminProvider />");
  return v;
}

export function AdminProvider({
  apiBase,
  children,
}: {
  apiBase: string;
  children: React.ReactNode;
}) {
  const [token, _setToken] = useState(() => safeGetLS(LS_TOKEN) || "");

  const [adminLang, _setAdminLang] = useState<Lang>(() => {
    const raw = (safeGetLS(LS_LANG) || "az").toLowerCase();
    return (LANGS as string[]).includes(raw) ? (raw as Lang) : "az";
  });

  const setToken = useCallback((t: string) => {
    const v = String(t || "").trim();
    _setToken(v);
    if (v) safeSetLS(LS_TOKEN, v);
    else safeRemoveLS(LS_TOKEN);
  }, []);

  const logout = useCallback(() => {
    _setToken("");
    safeRemoveLS(LS_TOKEN);
  }, []);

  const setAdminLang = useCallback((l: Lang) => {
    _setAdminLang(l);
    safeSetLS(LS_LANG, l);
  }, []);

  const value = useMemo<AdminCtx>(
    () => ({
      apiBase: normalizeBase(apiBase), // keep "" allowed
      token,
      setToken,
      logout,
      adminLang,
      setAdminLang,
      langs: LANGS,
    }),
    [apiBase, token, setToken, logout, adminLang, setAdminLang]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
