// src/pages/Admin/AdminLeads.tsx  (MOBILE-READY — stacked list/detail + no sideways scroll)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAdmin } from "./adminContext";

type LeadStatus = "new" | "contacted" | "closed" | "spam";

type Lead = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  source?: string;
  status?: LeadStatus | string;
  note?: string;
};

function formatDt(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function normalizePhone(phone?: string) {
  const raw = String(phone ?? "").trim();
  if (!raw) return "";
  let p = raw.replace(/[^\d+]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  return p;
}

function waLink(phone?: string, text?: string) {
  const p = normalizePhone(phone);
  if (!p) return "";
  const digits = p.replace(/[^\d]/g, "");
  const msg = encodeURIComponent(text || "Salam! NEOX-dan yazıram 🙂");
  return `https://wa.me/${digits}?text=${msg}`;
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={S.kvRow}>
      <div style={S.k}>{k}</div>
      <div style={S.v}>{v}</div>
    </div>
  );
}

function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width:${breakpoint}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${breakpoint}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    if ((mq as any).addEventListener) mq.addEventListener("change", onChange);
    else (mq as any).addListener?.(onChange);
    return () => {
      if ((mq as any).removeEventListener) mq.removeEventListener("change", onChange);
      else (mq as any).removeListener?.(onChange);
    };
  }, [breakpoint]);

  return isMobile;
}

export default function AdminLeads() {
  const loc = useLocation();
  const { apiBase: apiBaseRaw, token, logout } = useAdmin();

  const isMobile = useIsMobile(900);

  // normalize API base (remove trailing /)
  const API_BASE = useMemo(() => String(apiBaseRaw || "").replace(/\/+$/, ""), [apiBaseRaw]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [draftStatus, setDraftStatus] = useState<LeadStatus>("new");
  const [draftNote, setDraftNote] = useState("");

  const pollRef = useRef<number | null>(null);
  const inflightRef = useRef(false);

  const selected = useMemo(() => leads.find((l) => l.id === selectedId) || null, [leads, selectedId]);

  // mobile view: list vs detail
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  // if we have a selected lead on mobile, show detail automatically
  useEffect(() => {
    if (!isMobile) return;
    if (selectedId) setMobileView("detail");
  }, [isMobile, selectedId]);

  // when leaving mobile, reset view
  useEffect(() => {
    if (!isMobile) setMobileView("list");
  }, [isMobile]);

  useEffect(() => {
    if (!selected) return;
    setDraftStatus(((selected.status as LeadStatus) || "new") as LeadStatus);
    setDraftNote(selected.note || "");
  }, [selectedId, selected?.status, selected?.note]); // eslint-disable-line

  const authHeaders = useMemo(() => {
    if (!token) return {};
    return {
      "x-admin-token": token,
      Authorization: `Bearer ${token}`,
    } as Record<string, string>;
  }, [token]);

  function stopPolling() {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = null;
  }

  function on401(msg?: string) {
    setErr(msg || "Token səhvdir. Yenidən daxil ol.");
    stopPolling();
    window.setTimeout(() => logout(), 250);
  }

  async function fetchLeads(silent = false) {
    if (!token) return;
    if (inflightRef.current) return;
    inflightRef.current = true;

    if (!silent) setLoading(true);
    if (!silent) setErr(null);

    try {
      const r = await fetch(`${API_BASE}/api/leads`, { headers: { ...authHeaders } });

      if (r.status === 401) return on401("Token səhvdir. Yenidən daxil ol.");

      if (!r.ok) {
        const t = await r.text();
        throw new Error(`${r.status} ${t || "fetch failed"}`);
      }

      const j = await r.json();
      const list: Lead[] = j.leads || [];
      setLeads(list);

      // keep selection stable
      if (selectedId) {
        const still = list.some((x) => x.id === selectedId);
        if (!still) setSelectedId(list[0]?.id || null);
      } else {
        setSelectedId(list[0]?.id || null);
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to fetch");
    } finally {
      if (!silent) setLoading(false);
      inflightRef.current = false;
    }
  }

  async function saveLead() {
    if (!token || !selected) return;
    setLoading(true);
    setErr(null);

    try {
      const r = await fetch(`${API_BASE}/api/leads/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ status: draftStatus, note: draftNote }),
      });

      if (r.status === 401) return on401("Token vaxtı bitib və ya səhvdir. Yenidən daxil ol.");

      if (!r.ok) {
        const t = await r.text();
        throw new Error(`${r.status} ${t || "save failed"}`);
      }

      const j = await r.json();
      const updated: Lead = j.lead;

      setLeads((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
      setErr(null);
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function exportCSV() {
    if (!token) return;
    setErr(null);

    try {
      const r = await fetch(`${API_BASE}/api/leads.csv`, { headers: { ...authHeaders } });

      if (r.status === 401) return on401("Token səhvdir. Yenidən daxil ol.");
      if (!r.ok) throw new Error(`CSV export failed (${r.status})`);

      const blob = await r.blob();
      const a = document.createElement("a");
      const href = URL.createObjectURL(blob);
      a.href = href;
      a.download = "neox-leads.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1200);
    } catch (e: any) {
      setErr(e?.message || "CSV export failed");
    }
  }

  // poll: 10s while visible, 25s when hidden
  useEffect(() => {
    if (!token) return;

    const setup = () => {
      stopPolling();
      fetchLeads(false);

      const interval = document.hidden ? 25000 : 10000;
      pollRef.current = window.setInterval(() => fetchLeads(true), interval);
    };

    setup();

    const onVis = () => setup();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stopPolling();
    };
    // eslint-disable-next-line
  }, [token, API_BASE]);

  const showList = !isMobile || mobileView === "list";
  const showDetail = !isMobile || mobileView === "detail";

  return (
    <div style={S.adminPage}>
      <div style={S.adminShell}>
        <div style={S.adminTopbar}>
          <div style={{ minWidth: 0 }}>
            <div style={S.topTitle}>Admin Leads</div>
            <div style={S.topSub}>
              Token: <b style={{ color: "rgba(255,255,255,.92)" }}>ON</b> • Route:{" "}
              <code style={S.codeMini}>{loc.pathname}</code>
              <span style={{ opacity: 0.7 }}> • Auto: {document.hidden ? "25s" : "10s"}</span>
            </div>
          </div>

          <div style={S.actions}>
            {isMobile && mobileView === "detail" && (
              <button
                onClick={() => setMobileView("list")}
                style={S.btn}
                disabled={loading}
                title="Back to list"
              >
                ← List
              </button>
            )}
            <button onClick={() => fetchLeads(false)} style={S.btn} disabled={loading}>
              Yenilə
            </button>
            <button onClick={exportCSV} style={S.btn} disabled={loading}>
              Export
            </button>
            <button onClick={logout} style={S.btnGhost}>
              Çıxış
            </button>
          </div>
        </div>

        {err && <div style={S.error}>{err}</div>}

        <div style={isMobile ? S.stack : S.grid}>
          {/* LIST */}
          {showList && (
            <div style={S.panel}>
              <div style={S.panelHead}>
                <div style={S.panelTitle}>Lead-lər</div>
                <div style={S.badge}>{loading ? "Yüklənir..." : `${leads.length}`}</div>
              </div>

              <div style={S.list}>
                {leads.length === 0 ? (
                  <div style={S.emptyPad}>Hələ lead yoxdur.</div>
                ) : (
                  leads.map((l) => {
                    const active = l.id === selectedId;
                    const st = ((l.status as LeadStatus) || "new") as LeadStatus;

                    return (
                      <button
                        key={l.id}
                        onClick={() => {
                          setSelectedId(l.id);
                          if (isMobile) setMobileView("detail");
                        }}
                        style={{ ...S.item, ...(active ? S.itemActive : null) }}
                      >
                        <div style={S.itemRow}>
                          <div style={S.itemName}>{l.name || "— Adsız"}</div>
                          <div style={S.pill(st)}>{st}</div>
                        </div>
                        <div style={S.itemMeta}>
                          {l.phone ? `📞 ${l.phone}` : l.email ? `✉️ ${l.email}` : "—"}
                        </div>
                        <div style={S.itemTime}>{formatDt(l.createdAt)}</div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* DETAIL */}
          {showDetail && (
            <div style={S.panel}>
              <div style={S.panelHead}>
                <div style={S.panelTitle}>Detallar</div>
                <div style={S.badgeDim}>{selected ? "Seçilib" : "—"}</div>
              </div>

              {!selected ? (
                <div style={S.emptyPad}>Soldan lead seç.</div>
              ) : (
                <div style={S.detailWrap}>
                  <div style={S.card}>
                    <KV k="Ad" v={selected.name || "—"} />
                    <KV k="Email" v={selected.email || "—"} />
                    <KV k="Telefon" v={selected.phone || "—"} />
                    <KV k="Mənbə" v={selected.source || "—"} />
                    <KV k="Yaradılıb" v={formatDt(selected.createdAt)} />
                    <KV k="Yenilənib" v={formatDt(selected.updatedAt)} />
                  </div>

                  <div style={S.card}>
                    <div style={S.k}>Mesaj</div>
                    <div style={S.message}>{selected.message || "—"}</div>
                  </div>

                  <div style={S.card}>
                    <div style={S.controls}>
                      <div style={{ display: "grid", gap: 6, flex: 1, minWidth: 220 }}>
                        <div style={S.k}>Status</div>
                        <select
                          value={draftStatus}
                          onChange={(e) => setDraftStatus(e.target.value as LeadStatus)}
                          style={S.select}
                        >
                          <option value="new">new</option>
                          <option value="contacted">contacted</option>
                          <option value="closed">closed</option>
                          <option value="spam">spam</option>
                        </select>
                      </div>

                      <div style={{ display: "grid", gap: 6, flex: 2, minWidth: 260 }}>
                        <div style={S.k}>Qeyd</div>
                        <input
                          value={draftNote}
                          onChange={(e) => setDraftNote(e.target.value)}
                          placeholder="Qısa qeyd..."
                          style={S.input}
                        />
                      </div>
                    </div>

                    <div style={S.detailActions}>
                      <button onClick={saveLead} style={S.btnPrimary} disabled={loading}>
                        Yadda saxla
                      </button>

                      {selected.phone && (
                        <a
                          href={waLink(selected.phone, "Salam! NEOX-dan yazıram 🙂")}
                          target="_blank"
                          rel="noreferrer"
                          style={S.btnLink}
                        >
                          WhatsApp
                        </a>
                      )}

                      {isMobile && (
                        <button onClick={() => setMobileView("list")} style={S.btn} disabled={loading}>
                          ← List
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={S.footerNote}>
          token header: <code style={S.codeMini}>x-admin-token</code> / <code style={S.codeMini}>Authorization</code> • API:{" "}
          <code style={S.codeMini}>{API_BASE}</code>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, any> = {
  adminPage: {
    minHeight: "100dvh",
    padding: "14px",
    paddingTop: "calc(14px + env(safe-area-inset-top))",
    paddingBottom: "calc(14px + env(safe-area-inset-bottom))",
    position: "relative",
    zIndex: 1,
    background:
      "radial-gradient(1200px 600px at 18% 8%, rgba(20,82,199,.22), transparent 58%), radial-gradient(900px 520px at 82% 18%, rgba(122,92,255,.16), transparent 55%), #05070f",
    color: "rgba(255,255,255,.92)",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
    overflowX: "hidden",
  },
  adminShell: { maxWidth: 1180, margin: "0 auto", paddingTop: 14 },

  adminTopbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,.10)",
    background: "linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.03))",
    boxShadow: "0 18px 60px rgba(0,0,0,.35)",
    marginBottom: 12,
    backdropFilter: "blur(10px)",
    overflow: "hidden",
  },
  topTitle: { fontSize: 18, fontWeight: 950, letterSpacing: ".02em" },
  topSub: { fontSize: 12, color: "rgba(255,255,255,.65)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },

  actions: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },

  grid: { display: "grid", gridTemplateColumns: "420px minmax(0, 1fr)", gap: 12 },
  stack: { display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12 },

  panel: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.03)",
    boxShadow: "0 18px 60px rgba(0,0,0,.30)",
    overflow: "hidden",
    backdropFilter: "blur(10px)",
    minWidth: 0,
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

  list: {
    maxHeight: "calc(100dvh - 240px)",
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",
  },

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
  itemRow: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", minWidth: 0 },
  itemName: { fontWeight: 900, fontSize: 14, color: "rgba(255,255,255,.92)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  itemMeta: { marginTop: 6, fontSize: 12, color: "rgba(255,255,255,.64)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  itemTime: { marginTop: 6, fontSize: 11, color: "rgba(255,255,255,.46)" },

  pill: (st: LeadStatus) => {
    const map: Record<LeadStatus, string> = {
      new: "rgba(20,82,199,.18)",
      contacted: "rgba(98,210,170,.16)",
      closed: "rgba(160,160,160,.14)",
      spam: "rgba(255,90,90,.14)",
    };
    return {
      fontSize: 11,
      padding: "4px 10px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,.12)",
      background: map[st] || "rgba(255,255,255,.06)",
      color: "rgba(255,255,255,.86)",
      whiteSpace: "nowrap",
    };
  },

  detailWrap: { padding: 14, display: "grid", gap: 12, minWidth: 0 },
  card: { borderRadius: 16, border: "1px solid rgba(255,255,255,.10)", background: "rgba(0,0,0,.22)", padding: 12, minWidth: 0 },

  kvRow: {
    display: "grid",
    gridTemplateColumns: "130px minmax(0, 1fr)",
    gap: 10,
    padding: "8px 0",
    borderBottom: "1px solid rgba(255,255,255,.06)",
  },
  k: { fontSize: 12, color: "rgba(255,255,255,.55)", letterSpacing: ".08em", textTransform: "uppercase" },
  v: { fontSize: 13, color: "rgba(255,255,255,.90)", overflow: "hidden", textOverflow: "ellipsis" },

  message: { marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.45, color: "rgba(255,255,255,.86)" },

  controls: { display: "flex", gap: 12, flexWrap: "wrap" },

  detailActions: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 },

  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.04)",
    color: "rgba(255,255,255,.92)",
    outline: "none",
    maxWidth: "100%",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.04)",
    color: "rgba(255,255,255,.92)",
    outline: "none",
    maxWidth: "100%",
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
  btnLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(98,210,170,.28)",
    background: "rgba(98,210,170,.10)",
    color: "rgba(255,255,255,.92)",
    fontWeight: 900,
    textDecoration: "none",
  },

  error: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,90,90,.28)",
    background: "rgba(255,90,90,.10)",
    color: "rgba(255,255,255,.92)",
    marginBottom: 12,
  },

  emptyPad: { padding: 16, color: "rgba(255,255,255,.65)" },
  footerNote: { marginTop: 10, fontSize: 12, color: "rgba(255,255,255,.55)", padding: "0 2px" },

  codeMini: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 11,
    padding: "2px 6px",
    borderRadius: 8,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.10)",
  },
};
