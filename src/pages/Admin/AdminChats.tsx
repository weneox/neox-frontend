// src/pages/Admin/AdminChats.tsx (FINAL — stable polling + auto-scroll + handoff rollback + focus=reply)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams, Link } from "react-router-dom";

const API_BASE_RAW = (import.meta as any)?.env?.VITE_API_BASE || "http://localhost:5050";
const API_BASE = String(API_BASE_RAW || "").replace(/\/+$/, "");
const LS_TOKEN = "neox_admin_token";

type Conv = {
  id: string;
  session_id: string;
  createdAt: string;
  updatedAt?: string;
  lastMessageAt?: string | null;
  lang?: string;
  page?: string;
  channel?: string;
  lead_id?: string | null;

  handoff?: boolean;
};

type Msg = {
  id: string;
  conversation_id: string;
  session_id: string;
  createdAt: string;
  ts: number;
  role: "user" | "assistant" | string;
  content: string;
  lang?: string;
  page?: string;
  channel?: string;
  meta?: any;
};

function formatDt(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function useLangAndChatId() {
  const { lang, id } = useParams<{ lang?: string; id?: string }>();
  return {
    lang: (lang || "az").toLowerCase(),
    chatId: (id || "").trim() || null,
  };
}

function pickPreview(ms: Msg[]) {
  const last = ms.length ? ms[ms.length - 1] : null;
  const txt = String(last?.content || "").trim();
  return txt ? txt.slice(0, 140) : "—";
}

function buildAdminHeaders(token: string) {
  const t = String(token || "").trim();
  return {
    "x-admin-token": t,
    Authorization: `Bearer ${t}`,
  };
}

export default function AdminChats() {
  const loc = useLocation();
  const { lang, chatId } = useLangAndChatId();

  const [token, setToken] = useState(() => localStorage.getItem(LS_TOKEN) || "");
  const [tempToken, setTempToken] = useState(() => localStorage.getItem(LS_TOKEN) || "");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");

  const [handoffBusy, setHandoffBusy] = useState(false);

  const active = useMemo(() => convs.find((c) => c.id === activeId) || null, [convs, activeId]);

  const orderedMessages = useMemo(() => {
    const arr = Array.isArray(messages) ? messages.slice() : [];
    arr.sort((a, b) => (Number(a.ts || 0) || 0) - (Number(b.ts || 0) || 0));
    return arr;
  }, [messages]);

  // ✅ reply input ref (for ?focus=reply)
  const replyInputRef = useRef<HTMLInputElement | null>(null);

  // Thread auto-scroll
  const threadRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [orderedMessages.length]);

  // Abort controllers
  const convAbortRef = useRef<AbortController | null>(null);
  const threadAbortRef = useRef<AbortController | null>(null);

  // inflight flags (avoid abort-thrash from polling)
  const convInflight = useRef(false);
  const threadInflight = useRef(false);

  // Poll interval
  const pollRef = useRef<number | null>(null);

  function stopAllNetworking() {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = null;

    try {
      convAbortRef.current?.abort();
      threadAbortRef.current?.abort();
    } catch {}

    convAbortRef.current = null;
    threadAbortRef.current = null;

    convInflight.current = false;
    threadInflight.current = false;
  }

  function clearAuth(msg?: string | null) {
    stopAllNetworking();

    localStorage.removeItem(LS_TOKEN);
    setToken("");
    setTempToken("");
    setConvs([]);
    setActiveId(null);
    setMessages([]);
    setReply("");
    setErr(msg || null);
  }

  function doLogin() {
    const t = tempToken.trim();
    if (!t) return setErr("Token yaz.");
    localStorage.setItem(LS_TOKEN, t);
    setToken(t);
    setErr(null);
  }

  function logout() {
    clearAuth(null);
  }

  // ✅ sync between tabs (if token changes elsewhere)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LS_TOKEN) return;
      const v = e.newValue || "";
      setToken(v);
      setTempToken(v);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  async function fetchConversations(opts?: { silent?: boolean; keepActive?: boolean }) {
    const silent = opts?.silent ?? false;
    const keepActive = opts?.keepActive ?? true;
    if (!token) return;

    // ✅ prevent overlap
    if (convInflight.current) return;
    convInflight.current = true;

    try {
      // abort previous
      try {
        convAbortRef.current?.abort();
      } catch {}
      const ac = new AbortController();
      convAbortRef.current = ac;

      if (!silent) setLoading(true);
      if (!silent) setErr(null);

      const r = await fetch(`${API_BASE}/api/admin/conversations`, {
        headers: buildAdminHeaders(token),
        signal: ac.signal,
      });

      if (r.status === 401) {
        clearAuth("Token səhvdir. Yenidən daxil ol.");
        return;
      }

      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(`${r.status} ${t || "fetch failed"}`);
      }

      const j = await r.json().catch(() => ({} as any));
      const list: Conv[] = (j as any).conversations || [];
      setConvs(list);

      setActiveId((prev) => {
        if (chatId && list.some((x) => x.id === chatId)) return chatId;
        if (keepActive && prev && list.some((x) => x.id === prev)) return prev;
        return list[0]?.id || null;
      });
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      if (!silent) setErr(e?.message || "Failed to fetch");
    } finally {
      if (!silent) setLoading(false);
      convInflight.current = false;
    }
  }

  async function fetchThread(id: string, opts?: { silent?: boolean }) {
    const silent = opts?.silent ?? true;
    if (!token || !id) return;

    // ✅ prevent overlap
    if (threadInflight.current) return;
    threadInflight.current = true;

    try {
      // abort previous
      try {
        threadAbortRef.current?.abort();
      } catch {}
      const ac = new AbortController();
      threadAbortRef.current = ac;

      const r = await fetch(`${API_BASE}/api/admin/conversations/${id}/messages`, {
        headers: buildAdminHeaders(token),
        signal: ac.signal,
      });

      if (r.status === 401) {
        clearAuth("Token vaxtı bitib və ya səhvdir. Yenidən daxil ol.");
        return;
      }

      if (!r.ok) {
        if (!silent) {
          const t = await r.text().catch(() => "");
          setErr(`${r.status} ${t || "thread fetch failed"}`);
        }
        return;
      }

      const j = await r.json().catch(() => ({} as any));
      const list: Msg[] = (j as any).messages || [];
      setMessages(list);
      if (!silent) setErr(null);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      if (!silent) setErr(e?.message || "Thread fetch failed");
    } finally {
      threadInflight.current = false;
    }
  }

  // ✅ Robust handoff update (tries multiple endpoint shapes)
  async function setConversationHandoff(next: boolean) {
    if (!token || !activeId) return;

    setHandoffBusy(true);
    setErr(null);

    // exact rollback
    const prevHandoff = !!active?.handoff;

    // optimistic UI
    setConvs((prev) => prev.map((c) => (c.id === activeId ? { ...c, handoff: next } : c)));

    const headers = {
      "Content-Type": "application/json",
      ...buildAdminHeaders(token),
    };

    const attempts: Array<{ url: string; method: string; body?: any }> = [
      { url: `${API_BASE}/api/admin/conversations/${activeId}`, method: "PATCH", body: { handoff: next } },
      { url: `${API_BASE}/api/admin/conversations/${activeId}/handoff`, method: "PATCH", body: { handoff: next } },
      { url: `${API_BASE}/api/admin/conversations/${activeId}/handoff`, method: "POST", body: { handoff: next } },
      { url: `${API_BASE}/api/admin/conversations/${activeId}`, method: "PATCH", body: { ai_enabled: !next } },
    ];

    let ok = false;
    let lastErr = "";

    try {
      for (const a of attempts) {
        try {
          const r = await fetch(a.url, {
            method: a.method,
            headers,
            body: JSON.stringify(a.body ?? {}),
          });

          if (r.status === 401) {
            clearAuth("Token vaxtı bitib və ya səhvdir. Yenidən daxil ol.");
            return;
          }

          if (r.ok) {
            ok = true;

            const j = await r.json().catch(() => ({} as any));
            const updated: Conv | undefined = (j as any).conversation || (j as any).conv || (j as any).data || undefined;

            if (updated?.id) {
              setConvs((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
            }
            break;
          } else {
            const t = await r.text().catch(() => "");
            lastErr = `${r.status} ${t || "handoff update failed"}`;
          }
        } catch (e: any) {
          lastErr = e?.message || "handoff update failed";
        }
      }

      if (!ok) {
        setConvs((prev) => prev.map((c) => (c.id === activeId ? { ...c, handoff: prevHandoff } : c)));
        setErr(lastErr || "Handoff dəyişmədi (endpoint tapılmadı).");
        return;
      }

      fetchConversations({ silent: true, keepActive: true });
      fetchThread(activeId, { silent: true });
    } finally {
      setHandoffBusy(false);
    }
  }

  async function sendReply() {
    if (!token || !activeId) return;
    const text = reply.trim();
    if (!text) return;

    setLoading(true);
    setErr(null);

    try {
      const r = await fetch(`${API_BASE}/api/admin/conversations/${activeId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAdminHeaders(token),
        },
        body: JSON.stringify({ content: text }),
      });

      if (r.status === 401) {
        clearAuth("Token vaxtı bitib və ya səhvdir. Yenidən daxil ol.");
        return;
      }

      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(`${r.status} ${t || "send failed"}`);
      }

      const j = await r.json().catch(() => ({} as any));
      const msg: Msg | undefined = (j as any).message;

      setReply("");

      if (msg?.id) setMessages((prev) => [...prev, msg]);

      // operator replied => handoff true
      setConvs((prev) => prev.map((c) => (c.id === activeId ? { ...c, handoff: true } : c)));

      fetchConversations({ silent: true, keepActive: true });
      fetchThread(activeId, { silent: true });
    } catch (e: any) {
      setErr(e?.message || "Send failed");
    } finally {
      setLoading(false);
    }
  }

  // Boot: when token appears
  useEffect(() => {
    if (!token) return;

    fetchConversations({ silent: false, keepActive: true });

    return () => stopAllNetworking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // When active changes, load thread
  useEffect(() => {
    if (!token || !activeId) return;
    fetchThread(activeId, { silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeId]);

  // Poll (uses latest activeId)
  const activeIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    if (!token) return;

    if (pollRef.current) window.clearInterval(pollRef.current);

    pollRef.current = window.setInterval(() => {
      fetchConversations({ silent: true, keepActive: true });
      const cur = activeIdRef.current;
      if (cur) fetchThread(cur, { silent: true });
    }, 6000);

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ✅ focus=reply support (for magic link)
  useEffect(() => {
    if (!token || !activeId) return;

    const qs = new URLSearchParams(loc.search);
    const focus = (qs.get("focus") || "").toLowerCase();
    if (focus !== "reply") return;

    // give UI a moment (thread + input mounted)
    const t = window.setTimeout(() => {
      replyInputRef.current?.focus();
    }, 180);

    return () => window.clearTimeout(t);
  }, [loc.search, token, activeId, orderedMessages.length]);

  // LOGIN
  if (!token) {
    return (
      <div style={S.page}>
        <div style={S.shell}>
          <div style={S.cardLogin}>
            <div style={S.brandRow}>
              <div style={S.brandDot} />
              <div style={S.brandText}>NEOX Admin</div>
            </div>

            <div style={{ marginTop: 10, fontSize: 26, fontWeight: 980 }}>Daxil ol</div>
            <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,.65)" }}>
              Token-i bir dəfə yaz — yadda qalacaq. (<code style={S.code}>ADMIN_TOKEN</code>)
            </div>

            {err && <div style={S.err}>{err}</div>}

            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <input
                value={tempToken}
                onChange={(e) => setTempToken(e.target.value)}
                placeholder="ADMIN TOKEN"
                style={S.input}
              />
              <button onClick={doLogin} style={S.btnPrimary}>
                Daxil ol
              </button>

              <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)" }}>
                Backend test: <code style={S.code}>{API_BASE}/health</code>
              </div>
            </div>

            <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,.55)" }}>
              <Link to={`/${lang}/admin/leads`} style={{ color: "rgba(255,255,255,.8)" }}>
                ← Admin Leads
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const aiOff = !!active?.handoff;

  // MAIN
  return (
    <div style={S.page}>
      <div style={S.shell}>
        <div style={S.topbar}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 950 }}>Admin Chats</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)", marginTop: 4 }}>
              Token: <b style={{ color: "rgba(255,255,255,.92)" }}>ON</b> • Route:{" "}
              <code style={S.code}>{loc.pathname}</code> <span style={{ opacity: 0.7 }}> • Auto: 6s</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Link to={`/${lang}/admin/leads`} style={S.btnLinkNav as any}>
              Leads
            </Link>
            <button onClick={() => fetchConversations({ silent: false, keepActive: true })} style={S.btn} disabled={loading}>
              Yenilə
            </button>
            <button onClick={logout} style={S.btnGhost}>
              Çıxış
            </button>
          </div>
        </div>

        {err && <div style={S.err}>{err}</div>}

        <div style={S.grid}>
          {/* LEFT */}
          <div style={S.panel}>
            <div style={S.panelHead}>
              <div style={S.panelTitle}>Conversations</div>
              <div style={S.badge}>{loading ? "..." : `${convs.length}`}</div>
            </div>

            <div style={S.list}>
              {convs.length === 0 ? (
                <div style={S.empty}>Hələ chat yoxdur.</div>
              ) : (
                convs.map((c) => {
                  const isActive = c.id === activeId;
                  const label = `SID: ${c.session_id?.slice?.(0, 8) || c.id.slice(0, 8)}`;
                  const sub = `Lang: ${(c.lang || "az").toUpperCase()} • ${c.page || "—"}`;

                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveId(c.id)}
                      style={{ ...S.item, ...(isActive ? S.itemActive : null) }}
                      title={c.id}
                    >
                      <div style={S.itemRow}>
                        <div style={S.itemName}>{label}</div>

                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {c.handoff ? <div style={S.pillAiOff}>AI OFF</div> : <div style={S.pillAiOn}>AI ON</div>}
                          <div style={S.pill}>{String(c.channel || "WEB").toUpperCase()}</div>
                        </div>
                      </div>

                      <div style={S.itemMeta}>{sub}</div>
                      <div style={S.itemTime}>{formatDt(c.lastMessageAt || c.updatedAt || c.createdAt)}</div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div style={S.panel}>
            <div style={S.panelHead}>
              <div style={S.panelTitle}>Thread</div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {active ? (
                  <>
                    {aiOff ? <div style={S.badgeAiOff}>Operator Active</div> : <div style={S.badgeAiOn}>AI Active</div>}
                    <div style={S.badgeDim}>{handoffBusy ? "..." : "Seçilib"}</div>
                  </>
                ) : (
                  <div style={S.badgeDim}>—</div>
                )}
              </div>
            </div>

            {!active ? (
              <div style={S.empty}>Soldan chat seç.</div>
            ) : (
              <div style={{ padding: 14, display: "grid", gap: 12 }}>
                <div style={S.card}>
                  <div style={S.kv}>
                    <div style={S.k}>Session</div>
                    <div style={S.v}>{active.session_id || "—"}</div>
                  </div>
                  <div style={S.kv}>
                    <div style={S.k}>Lead</div>
                    <div style={S.v}>{active.lead_id || "—"}</div>
                  </div>
                  <div style={S.kv}>
                    <div style={S.k}>Dil</div>
                    <div style={S.v}>{(active.lang || "az").toUpperCase()}</div>
                  </div>
                  <div style={S.kv}>
                    <div style={S.k}>Son</div>
                    <div style={S.v}>{formatDt(active.lastMessageAt || active.updatedAt || active.createdAt)}</div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.70)" }}>
                      AI status:{" "}
                      <b style={{ color: aiOff ? "rgba(255,120,120,.95)" : "rgba(140,255,200,.95)" }}>
                        {aiOff ? "OFF (Operator)" : "ON"}
                      </b>
                    </div>

                    <div style={{ flex: 1 }} />

                    <button
                      onClick={() => setConversationHandoff(!aiOff)}
                      disabled={handoffBusy}
                      style={aiOff ? S.btnAiOn : S.btnAiOff}
                      title="AI ON/OFF (handoff)"
                    >
                      {handoffBusy ? "..." : aiOff ? "AI-ni aktiv et" : "Operator takeover (AI OFF)"}
                    </button>
                  </div>

                  {aiOff && (
                    <div style={S.noticeOff}>
                      Operator takeover aktivdir — widgetdə AI cavabları dayanacaq. İstəsən “AI-ni aktiv et” ilə geri aça
                      bilərsən.
                    </div>
                  )}
                </div>

                <div style={S.thread} ref={threadRef as any}>
                  {orderedMessages.length === 0 ? (
                    <div style={{ padding: 10, color: "rgba(255,255,255,.65)" }}>Mesaj yoxdur.</div>
                  ) : (
                    orderedMessages.map((m) => {
                      const isAdminReply =
                        m.role === "assistant" && (m?.meta?.source === "admin_panel" || m.channel === "admin");
                      const isUser = m.role === "user";
                      const mine = isAdminReply;

                      const roleLabel = isAdminReply ? "OPERATOR" : isUser ? "USER" : String(m.role || "").toUpperCase();

                      return (
                        <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                          <div style={{ ...S.bubble, ...(mine ? S.bubbleMine : S.bubbleUser) }}>
                            <div style={S.bubbleRole}>{roleLabel}</div>
                            <div style={S.bubbleText}>{m.content}</div>
                            <div style={S.bubbleTime}>{formatDt(m.createdAt)}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div style={S.replyBox}>
                  <input
                    ref={replyInputRef}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Operator reply yaz…"
                    style={S.input}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply();
                    }}
                  />
                  <button onClick={sendReply} style={S.btnPrimary} disabled={loading || !reply.trim()}>
                    Göndər
                  </button>

                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)" }}>
                    Tip: <code style={S.code}>Ctrl+Enter</code>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,.55)" }}>
          token headers: <code style={S.code}>x-admin-token</code> / <code style={S.code}>Authorization</code> • API:{" "}
          <code style={S.code}>{API_BASE}</code> • preview: <code style={S.code}>{pickPreview(orderedMessages)}</code>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, any> = {
  page: {
    minHeight: "100vh",
    padding: 18,
    background:
      "radial-gradient(1200px 600px at 18% 8%, rgba(20,82,199,.22), transparent 58%), radial-gradient(900px 520px at 82% 18%, rgba(122,92,255,.16), transparent 55%), #05070f",
    color: "rgba(255,255,255,.92)",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },
  shell: { maxWidth: 1180, margin: "0 auto", paddingTop: 14 },

  topbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,.10)",
    background: "linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.03))",
    boxShadow: "0 18px 60px rgba(0,0,0,.35)",
    marginBottom: 12,
    backdropFilter: "blur(10px)",
  },

  grid: { display: "grid", gridTemplateColumns: "420px 1fr", gap: 12 },

  panel: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.03)",
    boxShadow: "0 18px 60px rgba(0,0,0,.30)",
    overflow: "hidden",
    backdropFilter: "blur(10px)",
    minHeight: "calc(100vh - 210px)",
  },
  panelHead: {
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid rgba(255,255,255,.08)",
    background: "rgba(0,0,0,.14)",
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: ".16em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,.82)",
  },

  badge: {
    fontSize: 12,
    padding: "3px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.05)",
    color: "rgba(255,255,255,.80)",
  },
  badgeDim: {
    fontSize: 12,
    padding: "3px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.03)",
    color: "rgba(255,255,255,.62)",
  },

  badgeAiOff: {
    fontSize: 11,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,90,90,.28)",
    background: "rgba(255,90,90,.10)",
    color: "rgba(255,255,255,.86)",
    letterSpacing: ".10em",
    textTransform: "uppercase",
  },
  badgeAiOn: {
    fontSize: 11,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(140,255,200,.20)",
    background: "rgba(140,255,200,.08)",
    color: "rgba(255,255,255,.86)",
    letterSpacing: ".10em",
    textTransform: "uppercase",
  },

  list: { maxHeight: "calc(100vh - 260px)", overflow: "auto" },
  item: {
    width: "100%",
    textAlign: "left",
    padding: 12,
    border: 0,
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    borderBottom: "1px solid rgba(255,255,255,.06)",
    transition: "background .15s ease, transform .15s ease",
  },
  itemActive: { background: "rgba(255,255,255,.05)", transform: "translateY(-1px)" },
  itemRow: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" },
  itemName: { fontWeight: 900, fontSize: 14, color: "rgba(255,255,255,.92)" },
  itemMeta: {
    marginTop: 6,
    fontSize: 12,
    color: "rgba(255,255,255,.70)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  itemTime: { marginTop: 6, fontSize: 11, color: "rgba(255,255,255,.46)" },

  pill: {
    fontSize: 10,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(20,82,199,.18)",
    color: "rgba(255,255,255,.86)",
    letterSpacing: ".12em",
  },
  pillAiOff: {
    fontSize: 10,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,90,90,.28)",
    background: "rgba(255,90,90,.10)",
    color: "rgba(255,255,255,.86)",
    letterSpacing: ".12em",
  },
  pillAiOn: {
    fontSize: 10,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(140,255,200,.20)",
    background: "rgba(140,255,200,.08)",
    color: "rgba(255,255,255,.86)",
    letterSpacing: ".12em",
  },

  card: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(0,0,0,.22)",
    padding: 12,
  },
  kv: {
    display: "grid",
    gridTemplateColumns: "120px 1fr",
    gap: 10,
    padding: "8px 0",
    borderBottom: "1px solid rgba(255,255,255,.06)",
  },
  k: { fontSize: 12, color: "rgba(255,255,255,.55)", letterSpacing: ".08em", textTransform: "uppercase" },
  v: { fontSize: 13, color: "rgba(255,255,255,.90)", overflow: "hidden", textOverflow: "ellipsis" },

  noticeOff: {
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,90,90,.22)",
    background: "rgba(255,90,90,.08)",
    color: "rgba(255,255,255,.85)",
    fontSize: 12,
    lineHeight: 1.4,
  },

  thread: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(0,0,0,.18)",
    padding: 12,
    height: "44vh",
    overflow: "auto",
    display: "grid",
    gap: 10,
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.10)",
    padding: 10,
  },
  bubbleMine: {
    background: "linear-gradient(135deg, rgba(20,82,199,.26), rgba(122,92,255,.16))",
  },
  bubbleUser: {
    background: "rgba(255,255,255,.05)",
  },
  bubbleRole: { fontSize: 10, letterSpacing: ".16em", opacity: 0.75, marginBottom: 6 },
  bubbleText: { whiteSpace: "pre-wrap", lineHeight: 1.45 },
  bubbleTime: { marginTop: 8, fontSize: 11, opacity: 0.55 },

  replyBox: { display: "grid", gap: 10, alignItems: "center" },

  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.04)",
    color: "rgba(255,255,255,.92)",
    outline: "none",
  },

  btn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.04)",
    color: "rgba(255,255,255,.86)",
    cursor: "pointer",
  },
  btnGhost: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.12)",
    background: "transparent",
    color: "rgba(255,255,255,.74)",
    cursor: "pointer",
  },
  btnPrimary: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(20,82,199,.35)",
    background: "linear-gradient(135deg, rgba(20,82,199,.85), rgba(122,92,255,.55))",
    color: "white",
    fontWeight: 950,
    cursor: "pointer",
  },

  btnAiOff: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,90,90,.28)",
    background: "rgba(255,90,90,.10)",
    color: "rgba(255,255,255,.90)",
    cursor: "pointer",
    fontWeight: 850,
  },
  btnAiOn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(140,255,200,.20)",
    background: "rgba(140,255,200,.08)",
    color: "rgba(255,255,255,.90)",
    cursor: "pointer",
    fontWeight: 850,
  },

  btnLinkNav: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.03)",
    color: "rgba(255,255,255,.86)",
    textDecoration: "none",
  },

  err: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,90,90,.28)",
    background: "rgba(255,90,90,.10)",
    color: "rgba(255,255,255,.92)",
    marginBottom: 12,
  },
  empty: { padding: 16, color: "rgba(255,255,255,.65)" },

  code: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 11,
    padding: "2px 6px",
    borderRadius: 8,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.10)",
  },

  cardLogin: {
    width: "min(560px, 92vw)",
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.05)",
    boxShadow: "0 18px 60px rgba(0,0,0,.45)",
    padding: 18,
    backdropFilter: "blur(10px)",
    margin: "12vh auto 0",
  },
  brandRow: { display: "flex", alignItems: "center", gap: 10 },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    background: "linear-gradient(135deg, rgba(20,82,199,1), rgba(122,92,255,1))",
    boxShadow: "0 0 0 6px rgba(20,82,199,.12)",
  },
  brandText: {
    fontWeight: 950,
    letterSpacing: ".08em",
    textTransform: "uppercase",
    fontSize: 12,
    color: "rgba(255,255,255,.78)",
  },
};
