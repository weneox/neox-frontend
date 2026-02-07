// src/pages/BlogPost.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

const LANGS = ["az", "tr", "en", "ru", "es"] as const;
type Lang = (typeof LANGS)[number];

function getLangFromPath(pathname: string): Lang {
  const seg = (pathname.split("/")[1] || "").toLowerCase();
  return (LANGS as readonly string[]).includes(seg) ? (seg as Lang) : "en";
}
function withLang(lang: Lang, path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `/${lang}${p}`;
}
function safeDateLabel(d: string, lang: Lang) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  const map: Record<Lang, string> = { az: "az-AZ", tr: "tr-TR", en: "en-US", ru: "ru-RU", es: "es-ES" };
  return dt.toLocaleDateString(map[lang], { year: "numeric", month: "short", day: "2-digit" });
}

type Post = {
  slug: string;
  title: string;
  excerpt?: string;
  content?: string; // HTML və ya plain
  author?: string;
  category?: string;
  read_time?: string;
  published_at?: string;
  coverUrl?: string;
  cover_url?: string;
};

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function BlogPost() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const lang = getLangFromPath(location.pathname);

  const API_BASE_RAW = (import.meta as any)?.env?.VITE_API_BASE || "";
  const API_BASE = String(API_BASE_RAW || "").replace(/\/+$/, "");

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        if (!API_BASE || !slug) {
          setPost(null);
          return;
        }

        const res = await fetch(`${API_BASE}/api/posts/${encodeURIComponent(slug)}?lang=${encodeURIComponent(lang)}`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        const p = (j?.post || j?.data || j) as Post;

        if (!dead) setPost(p && p.slug ? p : null);
      } catch (e: any) {
        if (!dead) setErr(String(e?.message || e));
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [API_BASE, slug, lang]);

  const cover = post?.coverUrl || post?.cover_url || "";
  const date = post?.published_at || "";

  return (
    <main className="min-h-[100vh] bg-black text-white">
      <div className="mx-auto max-w-[980px] px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        <Link
          to={withLang(lang, "/blog")}
          className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("blog.post.back", "Back to Blog")}
        </Link>

        {loading ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 animate-pulse">
            <div className="h-8 w-2/3 rounded bg-white/[0.06]" />
            <div className="mt-4 h-4 w-1/2 rounded bg-white/[0.06]" />
            <div className="mt-6 h-[240px] rounded bg-white/[0.05]" />
          </div>
        ) : err ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="text-white font-semibold text-[18px]">{t("blog.post.error", "Failed to load post")}</div>
            <div className="mt-2 text-white/70">{err}</div>
          </div>
        ) : !post ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="text-white font-semibold text-[18px]">{t("blog.post.notFound", "Post not found")}</div>
          </div>
        ) : (
          <>
            <h1 className="mt-6 text-[34px] sm:text-[44px] font-semibold leading-[1.08] break-words">
              {post.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-white/60 text-[13px]">
              <span className="inline-flex items-center gap-2">
                <User className="w-4 h-4" />
                {post.author || "NEOX"}
              </span>
              {date ? (
                <span className="inline-flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {safeDateLabel(date, lang)}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {post.read_time || "5 dəq"}
              </span>
              {post.category ? (
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                  {post.category}
                </span>
              ) : null}
            </div>

            {cover ? (
              <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
                <img src={cover} alt={post.title} className="w-full h-[320px] sm:h-[420px] object-cover opacity-[0.95]" />
              </div>
            ) : null}

            {post.excerpt ? <p className="mt-6 text-white/75 leading-[1.9] text-[16px]">{post.excerpt}</p> : null}

            <article className="mt-8 prose prose-invert max-w-none">
              {/* content HTML gəlirsə */}
              {post.content && post.content.trim().startsWith("<") ? (
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
              ) : (
                <div className="whitespace-pre-wrap text-white/85 leading-[1.9]">
                  {post.content || t("blog.post.empty", "Content coming soon.")}
                </div>
              )}
            </article>
          </>
        )}
      </div>
    </main>
  );
}
