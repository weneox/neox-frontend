// src/App.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Layout from "./components/Layout";
import IntroScreen from "./components/IntroScreen";
import MatrixLoader from "./components/MatrixLoader";

// pages
import Home from "./pages/Home";
import About from "./pages/About";
import Services from "./pages/Services";
import UseCases from "./pages/UseCases";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";

// ✅ ADMIN
import AdminLayout from "./pages/Admin/AdminLayout";
import AdminLeads from "./pages/Admin/AdminLeads";
import AdminChats from "./pages/Admin/AdminChats";
import AdminStub from "./pages/Admin/AdminStub";
import AdminMagic from "./pages/Admin/AdminMagic";

// ✅ NEW: skeleton admin pages (stub yerinə)
import AdminBlog from "./pages/Admin/AdminBlog";
import AdminProducts from "./pages/Admin/AdminProducts";
import AdminMedia from "./pages/Admin/AdminMedia";

// ✅ Admin context provider
import { AdminProvider } from "./pages/Admin/adminContext";

// i18n
import { LANGS, DEFAULT_LANG, type Lang } from "./i18n/lang";

type Boot = "intro" | "loader" | "app";
const AUTO_FALLBACK_LANG: Lang = "en";
const BOOT_SEEN_KEY = "neox_boot_seen_v1";

/* ---------------- helpers ---------------- */
function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (LANGS as readonly string[]).includes(x);
}

function getLangFromPath(pathname: string): Lang | null {
  const seg = (pathname.split("/")[1] || "").toLowerCase();
  return isLang(seg) ? seg : null;
}

function getLangFromBrowser(): Lang {
  const list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]).map((x) =>
    (x || "").toLowerCase().split("-")[0]
  );

  for (const base of list) {
    if (isLang(base)) return base as Lang;
  }
  return AUTO_FALLBACK_LANG;
}

function getAutoLang(): Lang {
  try {
    const saved = localStorage.getItem("lang");
    if (isLang(saved)) return saved;
  } catch {}
  return getLangFromBrowser();
}

function hasSeenBoot(): boolean {
  try {
    return localStorage.getItem(BOOT_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markBootSeen() {
  try {
    localStorage.setItem(BOOT_SEEN_KEY, "1");
  } catch {}
}

/* ---------------- route gates ---------------- */
function LangGate() {
  const { i18n } = useTranslation();
  const { lang } = useParams<{ lang?: string }>();
  const location = useLocation();

  const safeLang: Lang = isLang(lang) ? (lang as Lang) : DEFAULT_LANG;

  useEffect(() => {
    if (i18n.language !== safeLang) i18n.changeLanguage(safeLang);
    try {
      localStorage.setItem("lang", safeLang);
    } catch {}
    document.documentElement.lang = safeLang;
  }, [safeLang, i18n]);

  // URL-də lang səhvdirsə, düz lang-a redirect
  if (!lang || lang !== safeLang) {
    // "/x/..." -> "/safeLang/..."
    const rest = location.pathname.replace(/^\/[^/]+/, "");
    const next = `/${safeLang}${rest || ""}${location.search}${location.hash}`;
    return <Navigate to={next} replace />;
  }

  return <Outlet />;
}

/** Normal pages -> Layout var */
function WithLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

/**
 * Admin route-larda Layout daxilində hər hansı widget/supabase işləyirsə,
 * burada "admin-də heç nə əlavə etmə" kimi saxlayırıq.
 * (AdminLayout öz UI-sini verir.)
 */
function AdminOnlyGate({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const lang = getLangFromPath(loc.pathname) || DEFAULT_LANG;
  const isAdmin = loc.pathname.startsWith(`/${lang}/admin`) || loc.pathname.startsWith("/admin");
  return (
    <>
      {children}
      {isAdmin ? null : null}
    </>
  );
}

/** ✅ langsız /admin/magic -> /:lang/admin/magic (query/hash saxlanır) */
function AdminMagicRedirect({ toLang }: { toLang: Lang }) {
  const loc = useLocation();
  const next = `/${toLang}/admin/magic${loc.search}${loc.hash}`;
  return <Navigate to={next} replace />;
}

export default function App() {
  const { i18n } = useTranslation();
  const location = useLocation();

  const [boot, setBoot] = useState<Boot>(() => (hasSeenBoot() ? "app" : "intro"));

  const introOnce = useRef(false);
  const loaderOnce = useRef(false);

  // URL-də lang varsa i18n sync
  useEffect(() => {
    const urlLang = getLangFromPath(location.pathname);
    if (urlLang && i18n.language !== urlLang) i18n.changeLanguage(urlLang);
    if (urlLang) document.documentElement.lang = urlLang;
  }, [location.pathname, i18n]);

  const handleIntroDone = useCallback(() => {
    if (introOnce.current) return;
    introOnce.current = true;
    setBoot("loader");
  }, []);

  const handleLoaderDone = useCallback(() => {
    if (loaderOnce.current) return;
    loaderOnce.current = true;
    markBootSeen();
    setBoot("app");
  }, []);

  // intro/loader zamanı scroll blok
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = boot === "app" ? prev || "" : "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [boot]);

  const rootLang = useMemo(() => getAutoLang(), []);

  return (
    <>
      {boot === "intro" && <IntroScreen onDone={handleIntroDone} />}
      {boot === "loader" && <MatrixLoader onDone={handleLoaderDone} />}

      {boot === "app" && (
        <AdminProvider>
          <AdminOnlyGate>
            <Routes>
              {/* root -> auto lang */}
              <Route path="/" element={<Navigate to={`/${rootLang}`} replace />} />

              {/* ✅ MAGIC (langsız) — bunu yuxarıda saxla ki /admin/* udmasın */}
              <Route path="/admin/magic" element={<AdminMagicRedirect toLang={rootLang} />} />

              {/* ✅ lang-sız admin route-lar -> auto lang admin */}
              <Route path="/admin" element={<Navigate to={`/${rootLang}/admin`} replace />} />
              <Route path="/admin/*" element={<Navigate to={`/${rootLang}/admin`} replace />} />

              <Route path="/:lang" element={<LangGate />}>
                {/* ✅ MAGIC (langlı) — AdminLayout-dan KƏNAR (auth-guard bloklamasın) */}
                <Route path="admin/magic" element={<AdminMagic />} />

                {/* ✅ ADMIN (Layout YOX — öz AdminLayout var) */}
                <Route path="admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="leads" replace />} />
                  <Route path="leads" element={<AdminLeads />} />
                  <Route path="chats" element={<AdminChats />} />
                  <Route path="chats/:id" element={<AdminChats />} />

                  {/* ✅ Stub -> real skeleton pages */}
                  <Route path="blog" element={<AdminBlog />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="media" element={<AdminMedia />} />

                  {/* (istəsən AdminStub-u başqa yerdə saxla / ya da sonra sil) */}
                  {/* <Route path="something" element={<AdminStub title="Coming soon" />} /> */}
                </Route>

                {/* ✅ normal pages: Layout VAR */}
                <Route element={<WithLayout />}>
                  <Route index element={<Home />} />
                  <Route path="about" element={<About />} />
                  <Route path="services" element={<Services />} />
                  <Route path="use-cases" element={<UseCases />} />
                  <Route path="pricing" element={<Pricing />} />
                  <Route path="contact" element={<Contact />} />
                  <Route path="blog" element={<Blog />} />
                </Route>
              </Route>

              {/* fallback */}
              <Route path="*" element={<Navigate to={`/${DEFAULT_LANG}`} replace />} />
            </Routes>
          </AdminOnlyGate>
        </AdminProvider>
      )}
    </>
  );
}
