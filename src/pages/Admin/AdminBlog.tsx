// src/pages/Admin/AdminBlog.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminSectionSkeleton from "./AdminSectionSkeleton";

/* =========================
   Helpers
========================= */
function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const SUPPORTED_LANGS = ["az", "tr", "en", "ru", "es"] as const;
type Lang = (typeof SUPPORTED_LANGS)[number];

function getLangFromPath(pathname: string): Lang {
  const seg = (pathname.split("/")[1] || "").toLowerCase();
  return (SUPPORTED_LANGS as readonly string[]).includes(seg) ? (seg as Lang) : "en";
}

function safeSlugify(s: string) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\u00C0-\u024f]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function stripHtml(s: string) {
  return String(s || "").replace(/<[^>]*>/g, "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

type PostStatus = "draft" | "published" | "archived" | string;

type AdminPost = {
  id: string;
  lang?: Lang | string;
  status?: PostStatus;
  published?: boolean;
  published_at?: string | null;
  publishedAt?: string | null;

  title: string;
  slug: string;
  excerpt?: string;
  content?: string;

  coverUrl?: string;
  cover_url?: string;
  category?: string;
  author?: string;
  read_time?: string;

  seo_title?: string;
  seo_description?: string;
  seo?: { title?: string; description?: string };

  createdAt?: string;
  updatedAt?: string;
};

/* =========================
   Admin auth + API base
   (sənin Admin pages-lərdə necədirsə, bu adaptivdir)
========================= */
const LS_TOKEN_KEYS = ["neox_admin_token", "ADMIN_TOKEN", "admin_token"];

function readTokenFromStorage(): string {
  for (const k of LS_TOKEN_KEYS) {
    try {
      const v = localStorage.getItem(k);
      if (v && String(v).trim()) return String(v).trim();
    } catch {}
  }
  return "";
}

function readApiBase(): string {
  const raw = (import.meta as any)?.env?.VITE_API_BASE || "";
  return String(raw || "").replace(/\/+$/, "");
}

function adminHeaders(token: string) {
  const t = String(token || "").trim();
  const h: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (t) {
    h["Authorization"] = `Bearer ${t}`;
    h["x-admin-token"] = t; // legacy
  }
  return h;
}

/* =========================
   UI types
========================= */
type EditDraft = {
  id?: string; // undefined => new
  lang: Lang;
  status: PostStatus;

  title: string;
  slug: string;
  excerpt: string;
  content: string;

  coverUrl: string;
  category: string;
  author: string;
  read_time: string;

  seo_title: string;
  seo_description: string;
};

function toDraft(p: AdminPost, fallbackLang: Lang): EditDraft {
  const lang = (p.lang as Lang) || fallbackLang;
  const status = p.status || (p.published ? "published" : "draft");

  const seoTitle = p.seo_title || p.seo?.title || "";
  const seoDesc = p.seo_description || p.seo?.description || "";

  return {
    id: p.id,
    lang,
    status,

    title: p.title || "",
    slug: p.slug || "",
    excerpt: p.excerpt || "",
    content: p.content || "",

    coverUrl: p.coverUrl || p.cover_url || "",
    category: p.category || "",
    author: p.author || "NEOX",
    read_time: p.read_time || "5 dəq",

    seo_title: seoTitle,
    seo_description: seoDesc,
  };
}

function emptyDraft(lang: Lang): EditDraft {
  return {
    lang,
    status: "draft",
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    coverUrl: "",
    category: "",
    author: "NEOX",
    read_time: "5 dəq",
    seo_title: "",
    seo_description: "",
  };
}

/* =========================
   Main
========================= */
export default function AdminBlog() {
  const location = useLocation();
  const nav = useNavigate();
  const langFromUrl = getLangFromPath(location.pathname);

  const API_BASE = useMemo(() => readApiBase(), []);
  const [token, setToken] = useState<string>(() => readTokenFromStorage());

  // list state
  const [rows, setRows] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "published">("all");
  const [filterLang, setFilterLang] = useState<"all" | Lang>("all");

  // editor
  const [editing, setEditing] = useState<EditDraft>(() => emptyDraft(langFromUrl));
  const [dirty, setDirty] = useState(false);

  // cover upload
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadNote, setUploadNote] = useState<string | null>(null);

  // keep token in sync if user logs in elsewhere
  useEffect(() => {
    const t = readTokenFromStorage();
    if (t && t !== token) setToken(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ====== API calls ======
  const fetchPosts = useCallback(async () => {
    try {
      setErr(null);
      setLoading(true);

      if (!API_BASE) {
        setRows([]);
        setErr("VITE_API_BASE tapılmadı. Frontend env-də API base olmalıdır.");
        return;
      }
      if (!token) {
        setRows([]);
        setErr("Admin token tapılmadı. Login et, sonra yenilə.");
        return;
      }

      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status !== "all") params.set("status", status);
      if (filterLang !== "all") params.set("lang", filterLang);

      // primary endpoint
      let res = await fetch(`${API_BASE}/api/admin/posts?${params.toString()}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "x-admin-token": token,
        },
      });

      // fallback: legacy path (sənin skeleton chips-də /api/admin/blog yazılıb)
      if (!res.ok) {
        res = await fetch(`${API_BASE}/api/admin/blog?${params.toString()}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "x-admin-token": token,
          },
        });
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      const list = (Array.isArray(j) ? j : j?.posts || j?.data || []) as any[];

      const norm: AdminPost[] = list
        .map((x) => {
          const p: any = x || {};
          const id = String(p.id ?? p.post_id ?? p._id ?? "");
          const title = String(p.title ?? "").trim();
          const slug = String(p.slug ?? "").trim();
          if (!id || !title || !slug) return null;

          return {
            id,
            lang: p.lang,
            status: p.status ?? (p.published ? "published" : "draft"),
            published: !!p.published,
            published_at: p.published_at ?? null,
            publishedAt: p.publishedAt ?? null,

            title,
            slug,
            excerpt: p.excerpt ?? "",
            content: p.content ?? "",

            coverUrl: p.coverUrl ?? p.cover_url ?? "",
            cover_url: p.cover_url ?? "",
            category: p.category ?? "",
            author: p.author ?? "NEOX",
            read_time: p.read_time ?? "5 dəq",

            seo_title: p.seo_title ?? p.seo?.title ?? "",
            seo_description: p.seo_description ?? p.seo?.description ?? "",
            seo: p.seo ?? undefined,

            createdAt: p.createdAt ?? p.created_at,
            updatedAt: p.updatedAt ?? p.updated_at,
          } as AdminPost;
        })
        .filter(Boolean) as AdminPost[];

      setRows(norm);

      // if nothing selected yet, keep current draft
    } catch (e: any) {
      setErr(String(e?.message || e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, token, q, status, filterLang]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const openNew = useCallback(() => {
    setEditing(emptyDraft(langFromUrl));
    setDirty(false);
    setUploadNote(null);
  }, [langFromUrl]);

  const openEdit = useCallback(
    (p: AdminPost) => {
      setEditing(toDraft(p, langFromUrl));
      setDirty(false);
      setUploadNote(null);
    },
    [langFromUrl]
  );

  const updateField = <K extends keyof EditDraft>(k: K, v: EditDraft[K]) => {
    setEditing((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
  };

  // auto slug from title when creating new (and slug empty or matches old auto)
  const lastAutoSlug = useRef<string>("");
  useEffect(() => {
    if (editing.id) return; // existing post
    const auto = safeSlugify(editing.title);
    const current = String(editing.slug || "");
    const canAuto = !current || current === lastAutoSlug.current;
    if (canAuto && auto && auto !== current) {
      lastAutoSlug.current = auto;
      setEditing((p) => ({ ...p, slug: auto }));
    }
  }, [editing.title, editing.slug, editing.id]);

  // save (create/update)
  const saveDraft = useCallback(async () => {
    try {
      setErr(null);
      if (!API_BASE) throw new Error("VITE_API_BASE yoxdur.");
      if (!token) throw new Error("Admin token yoxdur.");

      const body: any = {
        lang: editing.lang,
        title: editing.title.trim(),
        slug: editing.slug.trim(),
        excerpt: editing.excerpt.trim(),
        content: editing.content,
        coverUrl: editing.coverUrl.trim(),
        category: editing.category.trim(),
        author: editing.author.trim(),
        read_time: editing.read_time.trim(),
        seo: {
          title: editing.seo_title.trim(),
          description: editing.seo_description.trim(),
        },
        status: editing.status || "draft",
      };

      if (!body.title) throw new Error("Title boşdur.");
      if (!body.slug) throw new Error("Slug boşdur.");

      // create
      if (!editing.id) {
        // primary
        let res = await fetch(`${API_BASE}/api/admin/posts`, {
          method: "POST",
          headers: adminHeaders(token),
          body: JSON.stringify(body),
        });

        // fallback legacy
        if (!res.ok) {
          res = await fetch(`${API_BASE}/api/admin/blog`, {
            method: "POST",
            headers: adminHeaders(token),
            body: JSON.stringify(body),
          });
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        const created = (j?.post || j?.data || j) as any;
        const newId = String(created?.id ?? created?.post_id ?? "");
        if (newId) setEditing((p) => ({ ...p, id: newId }));
      } else {
        // update
        let res = await fetch(`${API_BASE}/api/admin/posts/${encodeURIComponent(editing.id)}`, {
          method: "PATCH",
          headers: adminHeaders(token),
          body: JSON.stringify(body),
        });

        // fallback legacy
        if (!res.ok) {
          res = await fetch(`${API_BASE}/api/admin/blog/${encodeURIComponent(editing.id)}`, {
            method: "PATCH",
            headers: adminHeaders(token),
            body: JSON.stringify(body),
          });
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }

      setDirty(false);
      await fetchPosts();
      setUploadNote("✅ Saved");
      window.setTimeout(() => setUploadNote(null), 1200);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }, [API_BASE, token, editing, fetchPosts]);

  // publish/unpublish (tries dedicated endpoints, falls back to PATCH)
  const setPublish = useCallback(
    async (publish: boolean) => {
      try {
        setErr(null);
        if (!editing.id) throw new Error("Əvvəl save et (post ID lazımdır).");
        if (!API_BASE) throw new Error("VITE_API_BASE yoxdur.");
        if (!token) throw new Error("Admin token yoxdur.");

        const id = editing.id;

        // try: /publish or /unpublish
        const tryEndpoints = async () => {
          const url1 = publish
            ? `${API_BASE}/api/admin/posts/${encodeURIComponent(id)}/publish`
            : `${API_BASE}/api/admin/posts/${encodeURIComponent(id)}/unpublish`;
          let res = await fetch(url1, { method: "POST", headers: adminHeaders(token) });
          if (res.ok) return true;

          // legacy
          const url2 = publish
            ? `${API_BASE}/api/admin/blog/${encodeURIComponent(id)}/publish`
            : `${API_BASE}/api/admin/blog/${encodeURIComponent(id)}/unpublish`;
          res = await fetch(url2, { method: "POST", headers: adminHeaders(token) });
          return res.ok;
        };

        const ok = await tryEndpoints();

        if (!ok) {
          // fallback: patch status/published flag
          const patchBody: any = publish
            ? { status: "published", published: true, published_at: nowIso() }
            : { status: "draft", published: false, published_at: null };

          let res = await fetch(`${API_BASE}/api/admin/posts/${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: adminHeaders(token),
            body: JSON.stringify(patchBody),
          });

          if (!res.ok) {
            res = await fetch(`${API_BASE}/api/admin/blog/${encodeURIComponent(id)}`, {
              method: "PATCH",
              headers: adminHeaders(token),
              body: JSON.stringify(patchBody),
            });
          }

          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        }

        setEditing((p) => ({ ...p, status: publish ? "published" : "draft" }));
        setDirty(false);
        await fetchPosts();
        setUploadNote(publish ? "✅ Published" : "✅ Unpublished");
        window.setTimeout(() => setUploadNote(null), 1200);
      } catch (e: any) {
        setErr(String(e?.message || e));
      }
    },
    [API_BASE, token, editing.id, fetchPosts]
  );

  // ====== Cloudinary signed upload ======
  const uploadCover = useCallback(
    async (file: File) => {
      try {
        setErr(null);
        setUploadNote(null);
        if (!API_BASE) throw new Error("VITE_API_BASE yoxdur.");
        if (!token) throw new Error("Admin token yoxdur.");

        setUploading(true);

        // 1) sign
        const signRes = await fetch(`${API_BASE}/api/admin/media/sign`, {
          method: "POST",
          headers: adminHeaders(token),
          body: JSON.stringify({
            // optional hints to backend (safe if ignored)
            kind: "blog_cover",
            lang: editing.lang,
          }),
        });
        if (!signRes.ok) throw new Error(`Sign HTTP ${signRes.status}`);
        const sign = await signRes.json();

        const uploadUrl =
          sign.upload_url || sign.uploadUrl || sign.url || "https://api.cloudinary.com/v1_1/" + sign.cloud_name + "/auto/upload";

        // expected fields
        const signature = sign.signature;
        const timestamp = sign.timestamp;
        const apiKey = sign.api_key || sign.apiKey;
        const folder = sign.folder || sign.params?.folder;

        if (!signature || !timestamp || !apiKey) {
          throw new Error("Sign response natamamdır (signature/timestamp/api_key).");
        }

        // 2) upload to Cloudinary
        const fd = new FormData();
        fd.append("file", file);
        fd.append("api_key", String(apiKey));
        fd.append("timestamp", String(timestamp));
        fd.append("signature", String(signature));
        if (folder) fd.append("folder", String(folder));

        // allow backend-provided extra params
        const extra = sign.params && typeof sign.params === "object" ? sign.params : null;
        if (extra) {
          for (const [k, v] of Object.entries(extra)) {
            if (v === undefined || v === null) continue;
            if (k === "signature" || k === "timestamp" || k === "api_key" || k === "file") continue;
            fd.append(k, String(v));
          }
        }

        const upRes = await fetch(String(uploadUrl), { method: "POST", body: fd });
        if (!upRes.ok) throw new Error(`Cloudinary HTTP ${upRes.status}`);
        const up = await upRes.json();

        const secureUrl = up.secure_url || up.url;
        if (!secureUrl) throw new Error("Cloudinary cavabında secure_url yoxdur.");

        // 3) store in media library (optional but recommended)
        try {
          await fetch(`${API_BASE}/api/admin/media`, {
            method: "POST",
            headers: adminHeaders(token),
            body: JSON.stringify({
              kind: "blog_cover",
              tags: ["blog", "cover", editing.lang],
              cloudinary: up,
            }),
          });
        } catch {
          // ignore – coverUrl yenə işləyəcək
        }

        updateField("coverUrl", String(secureUrl));
        setUploadNote("✅ Cover uploaded");
        window.setTimeout(() => setUploadNote(null), 1400);
      } catch (e: any) {
        setErr(String(e?.message || e));
      } finally {
        setUploading(false);
      }
    },
    [API_BASE, token, editing.lang]
  );

  const onPickFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (!f) return;
      await uploadCover(f);
    },
    [uploadCover]
  );

  // ====== derived ======
  const filteredRows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows
      .filter((p) => {
        if (status === "draft" && (p.status === "published" || p.published)) return false;
        if (status === "published" && !(p.status === "published" || p.published)) return false;
        if (filterLang !== "all" && String(p.lang || "") !== filterLang) return false;
        if (!qq) return true;
        const hay = `${p.title} ${p.slug} ${p.excerpt || ""} ${p.author || ""} ${p.category || ""}`.toLowerCase();
        return hay.includes(qq);
      })
      .sort((a, b) => {
        const da = String(a.published_at || a.publishedAt || a.updatedAt || a.createdAt || "");
        const db = String(b.published_at || b.publishedAt || b.updatedAt || b.createdAt || "");
        return db.localeCompare(da);
      });
  }, [rows, q, status, filterLang]);

  const isPublished = editing.status === "published";

  /* =========================
     UI
  ========================= */
  return (
    <AdminSectionSkeleton
      title="Blog"
      subtitle="Post list + editor + publish. Cover upload Cloudinary signed media ilə işləyir."
      chips={[
        "/api/posts, /api/admin/posts",
        "GET list",
        "POST create",
        "PATCH update",
        "publish/unpublish",
        "Cloudinary signed cover",
      ]}
    >
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.06] transition"
            onClick={openNew}
            type="button"
          >
            + New post
          </button>

          <button
            className={cx(
              "px-3 py-2 rounded-xl border transition",
              dirty ? "border-[rgba(47,184,255,.35)] bg-[rgba(47,184,255,.08)]" : "border-white/10 bg-white/[0.04]",
              "hover:bg-white/[0.06]"
            )}
            onClick={saveDraft}
            type="button"
          >
            Save
          </button>

          <button
            className={cx(
              "px-3 py-2 rounded-xl border transition",
              isPublished ? "border-white/10 bg-white/[0.04]" : "border-[rgba(47,184,255,.35)] bg-[rgba(47,184,255,.10)]",
              "hover:bg-white/[0.06]"
            )}
            onClick={() => setPublish(true)}
            type="button"
            disabled={!editing.id}
            title={!editing.id ? "Əvvəl save et" : "Publish"}
          >
            Publish
          </button>

          <button
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.06] transition"
            onClick={() => setPublish(false)}
            type="button"
            disabled={!editing.id}
            title={!editing.id ? "Əvvəl save et" : "Unpublish"}
          >
            Unpublish
          </button>

          <button
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.06] transition"
            onClick={() => nav(`/${langFromUrl}/admin/media`)}
            type="button"
          >
            Open Media
          </button>

          {uploadNote ? <span className="text-white/70 text-sm ml-2">{uploadNote}</span> : null}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.06] transition"
            onClick={fetchPosts}
            type="button"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {err ? (
        <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 whitespace-pre-wrap">
          {err}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)] gap-4">
        {/* Left: list */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <div className="p-3 border-b border-white/10">
            <div className="flex flex-col gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search title/slug/category…"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none text-white/85 placeholder:text-white/35"
              />

              <div className="flex gap-2 flex-wrap">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none text-white/85"
                >
                  <option value="all">All</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>

                <select
                  value={filterLang}
                  onChange={(e) => setFilterLang(e.target.value as any)}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none text-white/85"
                >
                  <option value="all">All langs</option>
                  {SUPPORTED_LANGS.map((l) => (
                    <option key={l} value={l}>
                      {l.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="max-h-[72vh] overflow-auto">
            {loading ? (
              <div className="p-4 text-white/60 text-sm">Loading…</div>
            ) : filteredRows.length ? (
              <div className="divide-y divide-white/10">
                {filteredRows.map((p) => {
                  const pub = p.status === "published" || p.published;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => openEdit(p)}
                      className="w-full text-left p-3 hover:bg-white/[0.04] transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-white font-semibold truncate">{p.title}</div>
                          <div className="text-white/55 text-xs truncate mt-0.5">/{p.slug}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={cx(
                              "text-[11px] px-2 py-1 rounded-full border",
                              pub ? "border-[rgba(47,184,255,.35)] bg-[rgba(47,184,255,.10)] text-white/85" : "border-white/10 bg-white/[0.03] text-white/60"
                            )}
                          >
                            {pub ? "Published" : "Draft"}
                          </span>
                          <span className="text-[11px] px-2 py-1 rounded-full border border-white/10 bg-white/[0.03] text-white/60">
                            {(p.lang as any)?.toUpperCase?.() || "—"}
                          </span>
                        </div>
                      </div>

                      {p.excerpt ? <div className="mt-2 text-white/65 text-sm line-clamp-2">{stripHtml(p.excerpt)}</div> : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-white/60 text-sm">No posts.</div>
            )}
          </div>
        </div>

        {/* Right: editor */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-white font-semibold truncate">
                {editing.id ? `Edit: ${editing.title || "Untitled"}` : "New post"}
              </div>
              <div className="text-white/55 text-xs truncate mt-0.5">
                Status: {String(editing.status || "draft")} • Lang: {editing.lang.toUpperCase()}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={editing.lang}
                onChange={(e) => updateField("lang", e.target.value as Lang)}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none text-white/85"
              >
                {SUPPORTED_LANGS.map((l) => (
                  <option key={l} value={l}>
                    {l.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 gap-3">
            {/* Title */}
            <div>
              <div className="text-white/70 text-xs mb-1">Title</div>
              <input
                value={editing.title}
                onChange={(e) => updateField("title", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none text-white/90 placeholder:text-white/35"
                placeholder="Post title…"
              />
            </div>

            {/* Slug */}
            <div>
              <div className="text-white/70 text-xs mb-1">Slug</div>
              <input
                value={editing.slug}
                onChange={(e) => updateField("slug", safeSlugify(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none text-white/90 placeholder:text-white/35"
                placeholder="my-post-slug"
              />
              <div className="text-white/45 text-[11px] mt-1">Public URL: /{editing.lang}/blog/{editing.slug || "..."}</div>
            </div>

            {/* Meta row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div className="text-white/70 text-xs mb-1">Category</div>
                <input
                  value={editing.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none text-white/90 placeholder:text-white/35"
                  placeholder="e.g. Case Study"
                />
              </div>
              <div>
                <div className="text-white/70 text-xs mb-1">Author</div>
                <input
                  value={editing.author}
                  onChange={(e) => updateField("author", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none text-white/90 placeholder:text-white/35"
                  placeholder="NEOX"
                />
              </div>
              <div>
                <div className="text-white/70 text-xs mb-1">Read time</div>
                <input
                  value={editing.read_time}
                  onChange={(e) => updateField("read_time", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none text-white/90 placeholder:text-white/35"
                  placeholder='e.g. "5 dəq"'
                />
              </div>
            </div>

            {/* Cover */}
            <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-white/80 font-semibold">Cover</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={onPickFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    className={cx(
                      "px-3 py-2 rounded-xl border transition",
                      uploading ? "border-white/10 bg-white/[0.02] opacity-60" : "border-[rgba(47,184,255,.35)] bg-[rgba(47,184,255,.10)] hover:bg-[rgba(47,184,255,.14)]"
                    )}
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading…" : "Upload cover"}
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.06] transition"
                    onClick={() => updateField("coverUrl", "")}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-white/60 text-xs mb-1">Cover URL</div>
                <input
                  value={editing.coverUrl}
                  onChange={(e) => updateField("coverUrl", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none text-white/90 placeholder:text-white/35"
                  placeholder="https://res.cloudinary.com/.../image/upload/..."
                />
              </div>

              {editing.coverUrl ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
                  <img
                    src={editing.coverUrl}
                    alt="cover"
                    className="w-full h-[220px] object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ) : null}
            </div>

            {/* Excerpt */}
            <div>
              <div className="text-white/70 text-xs mb-1">Excerpt</div>
              <textarea
                value={editing.excerpt}
                onChange={(e) => updateField("excerpt", e.target.value)}
                className="w-full min-h-[92px] rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none text-white/90 placeholder:text-white/35"
                placeholder="Short summary…"
              />
            </div>

            {/* Content */}
            <div>
              <div className="text-white/70 text-xs mb-1">Content</div>
              <textarea
                value={editing.content}
                onChange={(e) => updateField("content", e.target.value)}
                className="w-full min-h-[240px] rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none text-white/90 placeholder:text-white/35 font-mono text-[13px]"
                placeholder="Write your post content (plain text or HTML)…"
              />
              <div className="text-white/45 text-[11px] mt-1">
                İpucu: HTML göndərsən, public BlogPost onu render edəcək.
              </div>
            </div>

            {/* SEO */}
            <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
              <div className="text-white/80 font-semibold">SEO</div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-white/60 text-xs mb-1">SEO Title</div>
                  <input
                    value={editing.seo_title}
                    onChange={(e) => updateField("seo_title", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none text-white/90 placeholder:text-white/35"
                    placeholder="Optional…"
                  />
                </div>
                <div>
                  <div className="text-white/60 text-xs mb-1">SEO Description</div>
                  <input
                    value={editing.seo_description}
                    onChange={(e) => updateField("seo_description", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none text-white/90 placeholder:text-white/35"
                    placeholder="Optional…"
                  />
                </div>
              </div>
            </div>

            {/* Footer hints */}
            <div className="text-white/45 text-xs">
              API base: <span className="text-white/65">{API_BASE || "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </AdminSectionSkeleton>
  );
}
