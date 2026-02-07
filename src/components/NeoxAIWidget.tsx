// src/components/NeoxAIWidget.tsx (FINAL RESET — stable toggle everywhere)

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

type UiRole = "user" | "ai";
type LlmRole = "user" | "assistant";
type MsgSource = "ai" | "admin";
type MsgKind = "welcome" | "system" | "normal";
type Msg = { id: string; role: UiRole; text: string; ts?: number; source?: MsgSource; kind?: MsgKind };

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const PROD_BACKEND_FALLBACK = "https://neox-backend-production.up.railway.app";
const API_BASE_RAW =
  ((globalThis as any)?.__NEOX_API__ as string | undefined) ||
  (import.meta as any)?.env?.VITE_API_BASE ||
  PROD_BACKEND_FALLBACK;

const API_BASE = String(API_BASE_RAW || "").replace(/\/+$/, "");

const SESSION_KEY = "neox_session_id";
const LEAD_KEY = "neox_lead_id";

function safeLSGet(k: string) {
  try { return localStorage.getItem(k); } catch { return null; }
}
function safeLSSet(k: string, v: string) {
  try { localStorage.setItem(k, v); } catch {}
}
function safeLSRemove(k: string) {
  try { localStorage.removeItem(k); } catch {}
}

function getOrCreateSessionId() {
  const existing = safeLSGet(SESSION_KEY);
  if (existing) return existing;

  let sid = "";
  try { sid = (globalThis.crypto as any)?.randomUUID?.() ?? uid(); }
  catch { sid = uid(); }
  safeLSSet(SESSION_KEY, sid);
  return sid;
}

function getStoredLeadId(): string | null {
  return safeLSGet(LEAD_KEY) || null;
}
function setStoredLeadId(leadId: string) {
  const v = String(leadId || "").trim();
  if (!v) return;
  safeLSSet(LEAD_KEY, v);
}

function clearSessionAndLead() {
  safeLSRemove(SESSION_KEY);
  safeLSRemove(LEAD_KEY);
}

function getLangSafe(i18nLang?: string) {
  const raw = String(i18nLang || "").toLowerCase();
  const ok = ["az", "tr", "en", "ru", "es"];
  const short = raw.split("-")[0];
  return ok.includes(short) ? short : "az";
}

function toLlmRole(r: UiRole): LlmRole {
  return r === "user" ? "user" : "assistant";
}

function detectOperatorIntent(text: string) {
  const s = String(text || "").toLowerCase();
  return (
    s.includes("operator") ||
    s.includes("canlı dəstək") ||
    s.includes("canli destek") ||
    s.includes("insan") ||
    s.includes("human") ||
    s.includes("оператор")
  );
}

function RobotHeadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
      <path d="M32 6v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      <circle cx="32" cy="4" r="2.2" fill="currentColor" opacity="0.9" />
      <path
        d="M16 24c0-7.732 6.268-14 14-14h4c7.732 0 14 6.268 14 14v18c0 6.627-5.373 12-12 12H28c-6.627 0-12-5.373-12-12V24Z"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.95"
      />
      <path
        d="M20 26c0-6.075 4.925-11 11-11h2c6.075 0 11 4.925 11 11v14c0 5.523-4.477 10-10 10H30c-5.523 0-10-4.477-10-10V26Z"
        fill="currentColor"
        opacity="0.08"
      />
      <path
        d="M23 33c0-2.761 2.239-5 5-5h8c2.761 0 5 2.239 5 5v2c0 2.761-2.239 5-5 5h-8c-2.761 0-10-2.239-10-5v-2Z"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.9"
      />
      <circle cx="29.5" cy="34" r="1.8" fill="currentColor" opacity="0.95" />
      <circle cx="34.5" cy="34" r="1.8" fill="currentColor" opacity="0.95" />
      <path d="M26 44h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
      <path d="M14 32h3M47 32h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function isAdminPath(pathname: string) {
  return /^\/(az|en|tr|ru|es)\/admin(\/|$)/.test(pathname || "");
}
function isApiBaseValid(base: string) {
  return !!base && /^https?:\/\/[^ "]+$/i.test(base);
}

export default function NeoxAIWidget() {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  if (isAdminPath(location.pathname)) return null;
  const apiOk = useMemo(() => isApiBaseValid(API_BASE), []);
  if (!apiOk) return null;

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "suallar">("chat");
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const sessionIdRef = useRef<string>(getOrCreateSessionId());
  const [handoff, setHandoff] = useState(false);

  const welcomeIdRef = useRef<string>(uid());
  const [msgs, setMsgs] = useState<Msg[]>(() => [
    { id: welcomeIdRef.current, role: "ai", text: String(t("neoxAi.welcome")), ts: Date.now(), source: "ai", kind: "welcome" },
  ]);

  const msgsRef = useRef<Msg[]>(msgs);
  useEffect(() => { msgsRef.current = msgs; }, [msgs]);

  const [leadIdLive, setLeadIdLive] = useState<string | null>(() => getStoredLeadId());
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMsgs((p) => p.map((m) => (m.kind === "welcome" ? { ...m, text: String(t("neoxAi.welcome")) } : m)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, msgs.length, typing]);

  function hardResetChat() {
    clearSessionAndLead();
    sessionIdRef.current = getOrCreateSessionId();
    setLeadIdLive(null);
    setHandoff(false);
    setTyping(false);
    setInput("");
    setTab("chat");

    welcomeIdRef.current = uid();
    setMsgs([{ id: welcomeIdRef.current, role: "ai", text: String(t("neoxAi.welcome")), ts: Date.now(), source: "ai", kind: "welcome" }]);
  }

  async function send(text: string, opts?: { requestOperator?: boolean }) {
    const tt = text.trim();
    if (!tt || typing) return;

    const requestOperator = opts?.requestOperator === true || detectOperatorIntent(tt);
    const sessionId = sessionIdRef.current;
    const lang = getLangSafe(i18n.language);
    const page = window.location.pathname;
    const leadId = getStoredLeadId();

    setMsgs((p) => [...p, { id: uid(), role: "user", text: tt, ts: Date.now(), kind: "normal" }]);
    setInput("");
    setTyping(true);

    const aiId = uid();
    setMsgs((p) => [...p, { id: aiId, role: "ai", text: "…", ts: Date.now(), source: "ai", kind: "normal" }]);

    try {
      const history = msgsRef.current
        .filter((m) => (m.text || "").trim())
        .filter((m) => !(m.role === "ai" && m.source === "admin"))
        .map((m) => ({ role: toLlmRole(m.role), content: m.text }));

      const payload = {
        messages: [...history, { role: "user" as const, content: tt }],
        session_id: sessionId,
        lead_id: leadId,
        lang,
        channel: "web",
        page,
        source: "ai_widget",
        request_operator: requestOperator ? true : false,
      };

      const r = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) throw new Error(String(r.status));
      const data = await r.json().catch(() => ({} as any));

      const newLeadId = String((data as any)?.lead_id ?? "").trim();
      if (newLeadId) {
        setStoredLeadId(newLeadId);
        setLeadIdLive(newLeadId);
      }

      const serverHandoff = Boolean((data as any)?.handoff);
      setHandoff(serverHandoff);

      const full = String((data as any)?.text ?? (data as any)?.reply ?? "").trim();
      setMsgs((p) => p.map((m) => (m.id === aiId ? { ...m, text: full || "…" } : m)));
    } catch {
      setMsgs((p) => p.map((m) => (m.id === aiId ? { ...m, text: "Xəta oldu. Yenidən yoxlayın." } : m)));
    } finally {
      setTyping(false);
    }
  }

  const QUICK = useMemo(() => {
    const arr = t("neoxAi.quick.items", { returnObjects: true }) as unknown;
    if (Array.isArray(arr) && arr.every((x) => typeof x === "string")) return arr as string[];
    return ["Demo istəyirəm", "Qiymətlər nədir?", "Operator istəyirəm"];
  }, [t, i18n.language]);

  return (
    <div className={cx("neox-ai", open && "is-open")}>
      <button
        type="button"
        className={cx("neox-ai-fab", open && "is-open")}
        onClick={() => setOpen((s) => !s)}
        aria-label="Open chat"
      >
        <span className="neox-ai-fabRing" aria-hidden="true" />
        <span className="neox-ai-fabCore" aria-hidden="true" />
        <span className="neox-ai-fabIcon" aria-hidden="true">
          <RobotHeadIcon className="neox-ai-robotMini" />
        </span>
        <span className="neox-ai-fabText">{t("neoxAi.brand")}</span>
        <span className="neox-ai-fabPing" aria-hidden="true" />
      </button>

      <div className={cx("neox-ai-panel", open && "is-open")} role="dialog" aria-label="NEOX AI">
        <div className="neox-ai-shell">
          <div className="neox-ai-decorFrame" aria-hidden="true" />
          <div className="neox-ai-decorCorners" aria-hidden="true" />
          <div className="neox-ai-scan" aria-hidden="true" />
          <div className="neox-ai-noise" aria-hidden="true" />

          <div className="neox-ai-top">
            <div className="neox-ai-brand">
              <div className="neox-ai-mark" aria-hidden="true">
                <div className="neox-ai-markGlow" />
                <div className="neox-ai-markRing" />
                <RobotHeadIcon className="neox-ai-robot" />
              </div>
              <div className="neox-ai-brandText">
                <div className="neox-ai-titleRow">
                  <div className="neox-ai-title">{t("neoxAi.brand")}</div>
                </div>
                <div className="neox-ai-sub">{t("neoxAi.subtitle")}</div>
              </div>
            </div>

            <button type="button" className="neox-ai-x" onClick={() => setOpen(false)} aria-label="Close">
              ✕
            </button>
          </div>

          <div className="neox-ai-tabs">
            <button type="button" className={cx("neox-ai-tab", tab === "chat" && "is-active")} onClick={() => setTab("chat")}>
              {t("neoxAi.tabs.chat")}
            </button>
            <button type="button" className={cx("neox-ai-tab", tab === "suallar" && "is-active")} onClick={() => setTab("suallar")}>
              {t("neoxAi.tabs.quick")}
            </button>
          </div>

          {tab === "suallar" ? (
            <div className="neox-ai-quick">
              <div className="neox-ai-quickTitle">{t("neoxAi.quick.title")}</div>
              <div className="neox-ai-quickGrid">
                {QUICK.map((q) => (
                  <button key={q} type="button" className="neox-ai-q" onClick={() => { setTab("chat"); setOpen(true); send(q); }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="neox-ai-list" ref={listRef}>
                {msgs.map((m) => (
                  <div key={m.id} className={cx("neox-ai-msg", m.role === "user" ? "is-user" : "is-ai")}>
                    <div className="neox-ai-bubble">
                      <div className="neox-ai-text">{m.text}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="neox-ai-inputRow">
                <input
                  className="neox-ai-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("neoxAi.input.placeholder")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (input.trim()) send(input);
                    }
                  }}
                />
                <button type="button" className="neox-ai-send" onClick={() => input.trim() && send(input)} disabled={!input.trim() || typing}>
                  {t("neoxAi.input.send")}
                </button>
                <button type="button" className="neox-ai-send" onClick={hardResetChat} style={{ marginLeft: 8 }}>
                  Reset
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
