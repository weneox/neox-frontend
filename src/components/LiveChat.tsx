// src/components/LiveChat.tsx
import React, { useEffect, useMemo, useRef } from "react";

type Role = "agent" | "customer";
type Msg = { id: string; role: Role; text: string; time?: string };

type Item =
  | { kind: "msg"; id: string; role: Role; text: string; time?: string }
  | { kind: "typing"; id: string; role: Role };

export default function LiveChat({
  messages,
  typing, // "agent" | "customer" | null
  visibleSlots = 4,
}: {
  messages: Msg[];
  typing: Role | null;
  visibleSlots?: number;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);

  // ✅ son N slot (mesaj + typing) göstər
  const items = useMemo<Item[]>(() => {
    const base: Item[] = messages.map((m) => ({
      kind: "msg",
      id: m.id,
      role: m.role,
      text: m.text,
      time: m.time,
    }));

    if (typing) base.push({ kind: "typing", id: `typing-${typing}`, role: typing });

    return base.slice(-visibleSlots);
  }, [messages, typing, visibleSlots]);

  // ✅ Həmişə aşağı: scrollIntoView anchor
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    });
    return () => cancelAnimationFrame(raf);
  }, [items.length]);

  const whoLabel = (r: Role) => (r === "customer" ? "MÜŞTƏRİ" : "NEOX AGENT");

  return (
    <section className="neo-chat" aria-label="Live chat">
      {/* ✅ Scoped CSS — yalnız bu komponent */}
      <style>{`
        /* =========================
           LiveChat — Premium Natural (scoped)
           FPS-safe: no backdrop-filter, no heavy blur, minimal shadows
        ========================= */

        .neo-chat{
          --bg: rgba(255,255,255,.03);
          --bg2: rgba(0,0,0,.28);
          --line: rgba(255,255,255,.10);
          --line2: rgba(255,255,255,.14);
          --ink: rgba(255,255,255,.92);
          --muted: rgba(255,255,255,.68);
          --dim: rgba(255,255,255,.52);

          --cyan: #00f0ff;
          --violet: #7b68ff;
          --amber: #ffbe6e;

          width: 100%;
          border-radius: 22px;
          border: 1px solid var(--line);
          background: radial-gradient(1200px 600px at 12% -10%, rgba(0,240,255,.08), transparent 60%),
                      radial-gradient(900px 500px at 92% 0%, rgba(123,104,255,.08), transparent 55%),
                      linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
          overflow: hidden;
          color: var(--ink);
        }

        .neo-chat__head{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 12px;
          padding: 14px 14px 12px;
          border-bottom: 1px solid rgba(255,255,255,.08);
          background: linear-gradient(180deg, rgba(0,0,0,.35), rgba(0,0,0,.10));
        }

        .neo-chat__left{
          display:flex;
          flex-direction:column;
          gap: 2px;
          min-width: 0;
        }

        .neo-chat__title{
          display:flex;
          align-items:center;
          gap: 10px;
          font-weight: 900;
          letter-spacing: .12em;
          font-size: 12px;
          opacity: .92;
          white-space: nowrap;
        }

        .neo-chat__sub{
          font-size: 12px;
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .neo-chat__status{
          display:flex;
          align-items:center;
          gap: 8px;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.22);
          color: rgba(255,255,255,.86);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .08em;
          white-space: nowrap;
        }

        .neo-chat__dot{
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--cyan);
          box-shadow: 0 0 0 0 rgba(0,240,255,.35);
          animation: neoChatBreath 1.8s ease-in-out infinite;
        }

        @keyframes neoChatBreath{
          0%,100% { transform: translateZ(0) scale(1); box-shadow: 0 0 0 0 rgba(0,240,255,.35); }
          50% { transform: translateZ(0) scale(1.18); box-shadow: 0 0 0 10px rgba(0,240,255,0); }
        }

        /* frame */
        .neo-chat__frame{
          padding: 12px;
          background: linear-gradient(180deg, rgba(0,0,0,.10), rgba(0,0,0,.18));
        }

        .neo-chat__scroll{
          height: 260px; /* natural, not too tall */
          overflow: auto;
          padding: 10px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(0,0,0,.22);
          scroll-behavior: auto;
          scrollbar-gutter: stable;
        }

        /* scrollbars minimal */
        .neo-chat__scroll::-webkit-scrollbar{ width: 10px; }
        .neo-chat__scroll::-webkit-scrollbar-thumb{
          background: rgba(255,255,255,.12);
          border: 3px solid transparent;
          background-clip: padding-box;
          border-radius: 999px;
        }
        .neo-chat__scroll::-webkit-scrollbar-track{ background: transparent; }

        /* messages */
        .neo-msg{
          display:flex;
          flex-direction:column;
          gap: 6px;
          margin: 10px 0;
        }

        .neo-msg__meta{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 10px;
          font-size: 11px;
          color: var(--dim);
          letter-spacing: .08em;
        }

        .neo-msg__who{
          font-weight: 900;
          color: rgba(255,255,255,.72);
        }

        .neo-msg__time{
          font-weight: 700;
          color: rgba(255,255,255,.42);
          letter-spacing: .06em;
          white-space: nowrap;
        }

        .neo-msg__bubble{
          max-width: 86%;
          width: fit-content;
          padding: 10px 12px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.90);
          line-height: 1.35;
          font-size: 13px;
          white-space: pre-wrap;
          word-break: break-word;
        }

        /* alignment + bubble styles */
        .neo-msg--customer{ align-items: flex-start; }
        .neo-msg--customer .neo-msg__bubble{
          border-top-left-radius: 10px;
          background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.03));
        }

        .neo-msg--agent{ align-items: flex-end; }
        .neo-msg--agent .neo-msg__meta{ justify-content:space-between; }
        .neo-msg--agent .neo-msg__bubble{
          border-top-right-radius: 10px;
          border-color: rgba(0,240,255,.22);
          background: linear-gradient(180deg, rgba(0,240,255,.10), rgba(0,0,0,.18));
        }

        /* typing bubble */
        .neo-msg__bubble--typing{
          display:flex;
          align-items:center;
          gap: 8px;
          min-height: 38px;
        }

        .neo-dots{
          display:inline-flex;
          align-items:center;
          gap: 5px;
        }
        .neo-dots i{
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(255,255,255,.70);
          transform: translateZ(0);
          animation: neoDot 1.1s infinite ease-in-out;
        }
        .neo-dots i:nth-child(2){ animation-delay: .12s; opacity: .85; }
        .neo-dots i:nth-child(3){ animation-delay: .24s; opacity: .75; }

        @keyframes neoDot{
          0%, 100% { transform: translateZ(0) translateY(0); opacity: .55; }
          50% { transform: translateZ(0) translateY(-4px); opacity: 1; }
        }

        /* footer pills */
        .neo-chat__footer{
          display:flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 12px 14px 14px;
          border-top: 1px solid rgba(255,255,255,.08);
          background: linear-gradient(180deg, rgba(0,0,0,.14), rgba(0,0,0,.28));
        }

        .neo-pill{
          display:inline-flex;
          align-items:center;
          height: 30px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.78);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .04em;
          user-select: none;
          white-space: nowrap;
        }

        /* reduced motion */
        @media (prefers-reduced-motion: reduce){
          .neo-chat__dot, .neo-dots i { animation: none !important; }
        }

        /* small screens */
        @media (max-width: 520px){
          .neo-chat__scroll{ height: 240px; }
          .neo-msg__bubble{ max-width: 92%; }
          .neo-chat__title{ letter-spacing: .10em; }
        }
      `}</style>

      <div className="neo-chat__head">
        <div className="neo-chat__left">
          <div className="neo-chat__title">
            <span className="neo-chat__dot" aria-hidden="true" />
            LIVE CHAT
          </div>
          <div className="neo-chat__sub">Customer ↔ Agent • real-time demo</div>
        </div>

        <div className="neo-chat__status">
          <span className="neo-chat__dot" aria-hidden="true" />
          ACTIVE
        </div>
      </div>

      <div className="neo-chat__frame">
        <div className="neo-chat__scroll" aria-label="Chat messages">
          {items.map((it) => {
            if (it.kind === "typing") {
              const isCustomer = it.role === "customer";
              return (
                <div
                  key={it.id}
                  className={isCustomer ? "neo-msg neo-msg--customer" : "neo-msg neo-msg--agent"}
                >
                  <div className="neo-msg__meta">
                    <span className="neo-msg__who">{whoLabel(it.role)}</span>
                    <span className="neo-msg__time">typing…</span>
                  </div>
                  <div className="neo-msg__bubble neo-msg__bubble--typing" aria-label="Typing indicator">
                    <span className="neo-dots" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                </div>
              );
            }

            const isCustomer = it.role === "customer";
            return (
              <div key={it.id} className={isCustomer ? "neo-msg neo-msg--customer" : "neo-msg neo-msg--agent"}>
                <div className="neo-msg__meta">
                  <span className="neo-msg__who">{whoLabel(it.role)}</span>
                  <span className="neo-msg__time">{it.time ?? ""}</span>
                </div>
                <div className="neo-msg__bubble">{it.text}</div>
              </div>
            );
          })}

          <div ref={endRef} />
        </div>
      </div>

      <div className="neo-chat__footer" aria-label="Telemetry">
        <span className="neo-pill">intent: detect</span>
        <span className="neo-pill">route: auto</span>
        <span className="neo-pill">audit: on</span>
        <span className="neo-pill">latency: low</span>
      </div>
    </section>
  );
}
