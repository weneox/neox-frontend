import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { LogOut, Search, RefreshCcw, ArrowLeft, ShieldCheck } from "lucide-react";

type ConvRow = {
  lead_id: string;
  session_id: string | null;
  lang: string | null;
  channel: string | null;
  page: string | null;
  last_message: string | null;
  last_role: string | null;
  last_message_at: string | null;
  created_at: string | null;
  priority: number | null;
};

type MsgRow = {
  id: string;
  created_at: string;
  lead_id: string;
  role: "user" | "assistant" | "system" | string;
  content: string;
  lang: string | null;
  channel: string | null;
  session_id: string | null;
  meta: any;
};

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function AdminPage() {
  const nav = useNavigate();
  const { lang, leadId } = useParams();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // data
  const [rows, setRows] = useState<ConvRow[]>([]);
  const [msgs, setMsgs] = useState<MsgRow[]>([]);
  const [q, setQ] = useState("");
  const [busyList, setBusyList] = useState(false);
  const [busyMsgs, setBusyMsgs] = useState(false);

  // ✅ boş conversation-ları göstər/gizlət (default: false → yalnız mesajlılar)
  const [showEmpty, setShowEmpty] = useState(false);

  // ✅ auto-scroll (default ON)
  const [autoScroll, setAutoScroll] = useState(true);

  // ✅ OPERATOR REPLY state
  const [reply, setReply] = useState("");
  const [busyReply, setBusyReply] = useState(false);
  const [replyErr, setReplyErr] = useState<string | null>(null);

  const base = useMemo(() => `/${lang || "az"}/admin`, [lang]);

  async function checkAdmin() {
    setLoading(true);
    setAuthError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const hasSession = !!sessionData?.session;

    if (!hasSession) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc("is_admin");
    if (error) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setIsAdmin(!!data);
    setLoading(false);
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      return;
    }

    await checkAdmin();
    if (leadId) await loadMessages(leadId);
    await loadConversations();
  }

  async function signOut() {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setRows([]);
    setMsgs([]);
    nav(base);
  }

  async function loadConversations() {
    setBusyList(true);

    let query = supabase
      .from("v_conversations")
      .select("*")
      .order("last_message_at", { ascending: false });

    // ✅ default: boşları gizlət (last_message_at null olanları göstərmə)
    if (!showEmpty) query = query.not("last_message_at", "is", null);

    const { data, error } = await query;

    setBusyList(false);
    if (!error && data) setRows(data as any);
  }

  async function loadMessages(id: string) {
    setBusyMsgs(true);

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("lead_id", id)
      .order("created_at", { ascending: true });

    setBusyMsgs(false);
    if (!error && data) setMsgs(data as any);
  }

  // ✅ OPERATOR reply insert
  async function sendAdminReply() {
    if (!leadId) return;
    const text = reply.trim();
    if (!text || busyReply) return;

    setBusyReply(true);
    setReplyErr(null);

    // conversation məlumatını tap (lang/session)
    const conv = rows.find((r) => r.lead_id === leadId);

    const payload = {
      lead_id: leadId,
      role: "assistant",
      content: text,
      lang: conv?.lang ?? (lang || "az"),
      channel: "admin",
      session_id: conv?.session_id ?? null,
      meta: { source: "admin_panel" },
    };

    const { error } = await supabase.from("chat_messages").insert(payload as any);

    setBusyReply(false);

    if (error) {
      setReplyErr(error.message);
      return;
    }

    setReply("");
    // dərhal yenilə
    await loadMessages(leadId);
    await loadConversations();
  }

  // --- boot auth check
  useEffect(() => {
    checkAdmin();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      checkAdmin();
    });

    return () => {
      sub?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ admin olduqca və showEmpty dəyişdikcə list yenilə
  useEffect(() => {
    if (!isAdmin) return;
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, showEmpty]);

  // ✅ lead dəyişəndə mesajları yüklə
  useEffect(() => {
    if (!isAdmin) return;
    setReply("");
    setReplyErr(null);
    if (leadId) loadMessages(leadId);
    else setMsgs([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, isAdmin]);

  // ✅ REALTIME 1: chat_messages dəyişəndə conversations list yenilənsin
  useEffect(() => {
    if (!isAdmin) return;

    const ch = supabase
      .channel("admin-conversations-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
        loadConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, showEmpty]);

  // ✅ REALTIME 2: açıq lead-in mesajları canlı gəlsin (INSERT)
  useEffect(() => {
    if (!isAdmin) return;
    if (!leadId) return;

    const ch = supabase
      .channel(`admin-messages-${leadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          const row = payload.new as any;

          setMsgs((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [isAdmin, leadId]);

  // ✅ Auto-scroll: yeni mesaj gələndə aşağı düş
  useEffect(() => {
    if (!autoScroll) return;
    const el = document.getElementById("admin-msg-list");
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [msgs, autoScroll]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const hay = [r.lead_id, r.session_id, r.lang, r.channel, r.page, r.last_message, r.last_role]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  // ---------------- UI ----------------
  if (loading) {
    return (
      <div className="neox-admin">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="neo-card neo-card--premium p-6">
            <div className="text-white/80">Loading admin…</div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="neox-admin">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="neo-card neo-card--premium p-6 md:p-8 max-w-xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 grid place-items-center">
                <ShieldCheck className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <div className="text-white text-lg font-semibold">Admin Login</div>
                <div className="text-white/60 text-sm">Only authorized admins.</div>
              </div>
            </div>

            <form onSubmit={signIn} className="space-y-3">
              <input
                className="neo-input w-full"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <input
                className="neo-input w-full"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
              />

              {authError && (
                <div className="text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  {authError}
                </div>
              )}

              <button className="neo-btn neo-btn--premium w-full" type="submit">
                Sign in
              </button>

              <div className="text-white/50 text-xs">
                Qeyd: admin deyilsənsə, login olsa belə panel açılmayacaq (RLS + is_admin).
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="neox-admin">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <div className="text-white text-2xl font-semibold">NEOX Admin</div>
            <div className="text-white/60 text-sm">Conversations & messages</div>
          </div>

          <div className="flex items-center gap-2">
            {/* ✅ EMPTY toggle */}
            <button
              className={cx("neo-chip", showEmpty && "border-white/22 bg-white/6")}
              onClick={() => setShowEmpty((v) => !v)}
              title="Boş conversation-ları göstər/gizlət"
              type="button"
            >
              {showEmpty ? "Empty: ON" : "Empty: OFF"}
            </button>

            {/* ✅ AutoScroll toggle */}
            <button
              className={cx("neo-chip", autoScroll && "border-white/22 bg-white/6")}
              onClick={() => setAutoScroll((v) => !v)}
              title="Mesaj gələndə avtomatik aşağı scroll"
              type="button"
            >
              {autoScroll ? "AutoScroll: ON" : "AutoScroll: OFF"}
            </button>

            <button
              className="neo-chip"
              onClick={() => {
                loadConversations();
                if (leadId) loadMessages(leadId);
              }}
              title="Refresh"
              type="button"
            >
              <RefreshCcw className="w-4 h-4" />
              Refresh
            </button>

            <button className="neo-chip" onClick={signOut} type="button">
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[420px,1fr] gap-4">
          {/* LEFT: list */}
          <div className="neo-card neo-card--premium p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-white/50 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  className="neo-input w-full pl-9"
                  placeholder="Search lead/session/lang/channel/page…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div className="text-white/50 text-xs">{busyList ? "…" : filtered.length}</div>
            </div>

            <div className="max-h-[64vh] overflow-auto pr-1">
              {filtered.map((r) => {
                const active = r.lead_id === leadId;
                const isEmpty = !r.last_message_at;

                return (
                  <button
                    key={r.lead_id}
                    className={cx(
                      "w-full text-left rounded-2xl p-3 mb-2 border transition",
                      active
                        ? "bg-white/7 border-white/20"
                        : "bg-white/3 border-white/10 hover:bg-white/6 hover:border-white/16"
                    )}
                    onClick={() => nav(`${base}/${r.lead_id}`)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-white/90 text-sm font-medium truncate flex items-center gap-2">
                        <span className="truncate">{r.page || "—"}</span>

                        {showEmpty && isEmpty && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/15 text-white/60">
                            EMPTY
                          </span>
                        )}
                      </div>
                      <div className="text-white/50 text-xs">
                        {r.lang || "—"} • {r.channel || "—"}
                      </div>
                    </div>

                    <div className="text-white/60 text-xs mt-1 truncate">
                      {r.last_role || "—"}: {r.last_message || "—"}
                    </div>

                    <div className="text-white/35 text-[11px] mt-2 truncate">
                      lead_id: {r.lead_id}
                      {r.session_id ? ` • session: ${r.session_id}` : ""}
                    </div>
                  </button>
                );
              })}

              {!filtered.length && (
                <div className="text-white/60 text-sm p-3">
                  {showEmpty ? "No conversations." : "No conversations with messages yet."}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: messages */}
          <div className="neo-card neo-card--premium p-4">
            {!leadId ? (
              <div className="text-white/70">Soldan bir conversation seç — mesajlar burada görünəcək.</div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <button className="neo-chip" onClick={() => nav(base)} type="button">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>

                  <div className="text-white/50 text-xs truncate">
                    lead_id: {leadId} {busyMsgs ? " • loading…" : ` • ${msgs.length} msgs`}
                  </div>
                </div>

                <div id="admin-msg-list" className="max-h-[56vh] overflow-auto pr-1 space-y-2">
                  {msgs.map((m) => {
                    const isUser = m.role === "user";
                    return (
                      <div
                        key={m.id}
                        className={cx(
                          "rounded-2xl border p-3",
                          isUser ? "bg-white/3 border-white/10" : "bg-white/5 border-white/14"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="text-white/80 text-xs font-semibold">
                            {m.role?.toUpperCase?.() || "MSG"}
                          </div>
                          <div className="text-white/40 text-[11px]">
                            {new Date(m.created_at).toLocaleString()}
                          </div>
                        </div>

                        <div className="text-white/85 text-sm whitespace-pre-wrap">{m.content}</div>

                        <div className="text-white/35 text-[11px] mt-2">
                          {m.lang ? `lang: ${m.lang} • ` : ""}
                          {m.channel ? `channel: ${m.channel} • ` : ""}
                          {m.session_id ? `session: ${m.session_id}` : ""}
                        </div>
                      </div>
                    );
                  })}

                  {!msgs.length && <div className="text-white/60 text-sm p-3">No messages.</div>}
                </div>

                {/* ✅ OPERATOR REPLY */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="text-white/70 text-sm mb-2">Operator reply</div>

                  {replyErr && (
                    <div className="text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-2">
                      {replyErr}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <textarea
                      className="neo-input w-full min-h-[46px] resize-none"
                      placeholder="Buradan cavab yaz…"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (!busyReply && reply.trim()) sendAdminReply();
                        }
                      }}
                    />

                    <button
                      className="neo-btn neo-btn--premium whitespace-nowrap"
                      onClick={sendAdminReply}
                      disabled={busyReply || !reply.trim()}
                      type="button"
                      title="Send (Enter), yeni sətir üçün Shift+Enter"
                    >
                      {busyReply ? "Sending…" : "Send"}
                    </button>
                  </div>

                  <div className="text-white/40 text-xs mt-2">Enter = göndər • Shift+Enter = yeni sətir</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
