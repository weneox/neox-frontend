// src/components/LiveChat.tsx
import React, { useEffect, useMemo, useRef } from "react";

type Role = "agent" | "customer";
type Msg = { id: string; role: Role; text: string; time?: string };

type Item =
  | { kind: "msg"; id: string; role: Role; text: string; time?: string }
  | { kind: "typing"; id: string; role: Role };

export default function LiveChat({
  messages,
  typing,
  visibleSlots = 4,
}: {
  messages: Msg[];
  typing: Role | null;
  visibleSlots?: number;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    });
    return () => cancelAnimationFrame(raf);
  }, [items.length]);

  const whoLabel = (r: Role) => (r === "customer" ? "MÜŞTƏRİ" : "NEOX AGENT");

  return (
    <section className="lcx" aria-label="Live chat demo">
      <style>{`
        /* LİVE CHAT — tam izolyasiya (köhnə neo-* CSS heç toxunmasın) */
        .lcx{
          --ink: rgba(255,255,255,.92);
          --muted: rgba(255,255,255,.68);
          --dim: rgba(255,255,255,.50);
          --line: rgba(255,255,255,.10);
          --cyan:#00f0ff;
          --violet:#7b68ff;

          width:100%;
          border-radius:22px;
          border:1px solid var(--line);
          overflow:hidden;
          color:var(--ink);
          background:
            radial-gradient(1200px 520px at 12% -10%, rgba(0,240,255,.10), transparent 60%),
            radial-gradient(900px 500px at 92% 0%, rgba(123,104,255,.10), transparent 58%),
            linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
        }

        .lcxHead{
          display:flex; align-items:center; justify-content:space-between; gap:12px;
          padding:14px 14px 12px;
          border-bottom:1px solid rgba(255,255,255,.08);
          background:linear-gradient(180deg, rgba(0,0,0,.35), rgba(0,0,0,.10));
        }
        .lcxLeft{ display:flex; flex-direction:column; gap:2px; min-width:0; }
        .lcxTitle{
          display:flex; align-items:center; gap:10px;
          font-weight:900; letter-spacing:.12em; font-size:12px; opacity:.92;
          white-space:nowrap;
        }
        .lcxSub{
          font-size:12px; color:var(--muted);
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }

        .lcxStatus{
          display:flex; align-items:center; gap:8px;
          padding:7px 10px; border-radius:999px;
          border:1px solid rgba(255,255,255,.12);
          background:rgba(0,0,0,.22);
          font-size:12px; font-weight:800; letter-spacing:.08em;
          white-space:nowrap;
        }

        .lcxDot{
          width:8px; height:8px; border-radius:999px;
          background:var(--cyan);
          box-shadow:0 0 0 0 rgba(0,240,255,.35);
          animation: lcxBreath 1.8s ease-in-out infinite;
        }
        @keyframes lcxBreath{
          0%,100%{ transform:translateZ(0) scale(1); box-shadow:0 0 0 0 rgba(0,240,255,.35); }
          50%{ transform:translateZ(0) scale(1.18); box-shadow:0 0 0 10px rgba(0,240,255,0); }
        }

        .lcxFrame{ padding:12px; background:linear-gradient(180deg, rgba(0,0,0,.10), rgba(0,0,0,.18)); }
        .lcxScroll{
          height:260px;
          overflow:auto;
          padding:10px;
          border-radius:18px;
          border:1px solid rgba(255,255,255,.10);
          background:rgba(0,0,0,.22);
          scrollbar-gutter: stable;
        }
        .lcxScroll::-webkit-scrollbar{ width:10px; }
        .lcxScroll::-webkit-scrollbar-thumb{
          background:rgba(255,255,255,.12);
          border:3px solid transparent;
          background-clip:padding-box;
          border-radius:999px;
        }
        .lcxScroll::-webkit-scrollbar-track{ background:transparent; }

        .lcxMsg{ display:flex; flex-direction:column; gap:6px; margin:10px 0; }
        .lcxMeta{
          display:flex; align-items:center; justify-content:space-between; gap:10px;
          font-size:11px; color:var(--dim); letter-spacing:.08em;
        }
        .lcxWho{ font-weight:900; color:rgba(255,255,255,.72); }
        .lcxTime{ font-weight:700; color:rgba(255,255,255,.42); white-space:nowrap; }

        .lcxBubble{
          max-width:86%;
          width:fit-content;
          padding:10px 12px;
          border-radius:16px;
          border:1px solid rgba(255,255,255,.10);
          background:rgba(255,255,255,.04);
          color:rgba(255,255,255,.90);
          line-height:1.35;
          font-size:13px;
          white-space:pre-wrap;
          word-break:break-word;
        }

        .lcxCustomer{ align-items:flex-start; }
        .lcxCustomer .lcxBubble{ border-top-left-radius:10px; }

        .lcxAgent{ align-items:flex-end; }
        .lcxAgent .lcxBubble{
          border-top-right-radius:10px;
          border-color:rgba(0,240,255,.22);
          background:linear-gradient(180deg, rgba(0,240,255,.10), rgba(0,0,0,.18));
        }

        .lcxTyping{ display:flex; align-items:center; min-height:38px; }
        .lcxDots{ display:inline-flex; align-items:center; gap:5px; }
        .lcxDots i{
          width:6px; height:6px; border-radius:999px;
          background:rgba(255,255,255,.70);
          animation: lcxDot 1.1s infinite ease-in-out;
          transform:translateZ(0);
        }
        .lcxDots i:nth-child(2){ animation-delay:.12s; opacity:.85; }
        .lcxDots i:nth-child(3){ animation-delay:.24s; opacity:.75; }
        @keyframes lcxDot{
          0%,100%{ transform:translateZ(0) translateY(0); opacity:.55; }
          50%{ transform:translateZ(0) translateY(-4px); opacity:1; }
        }

        .lcxFoot{
          display:flex; flex-wrap:wrap; gap:8px;
          padding:12px 14px 14px;
          border-top:1px solid rgba(255,255,255,.08);
          background:linear-gradient(180deg, rgba(0,0,0,.14), rgba(0,0,0,.28));
        }
        .lcxPill{
          display:inline-flex; align-items:center;
          height:30px; padding:0 10px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,.12);
          background:rgba(255,255,255,.04);
          color:rgba(255,255,255,.78);
          font-size:12px; font-weight:800;
          letter-spacing:.04em;
          user-select:none;
          white-space:nowrap;
        }

        @media (prefers-reduced-motion: reduce){
          .lcxDot, .lcxDots i{ animation:none !important; }
        }
        @media (max-width:520px){
          .lcxScroll{ height:240px; }
          .lcxBubble{ max-width:92%; }
        }
      `}</style>

      <div className="lcxHead">
        <div className="lcxLeft">
          <div className="lcxTitle">
            <span className="lcxDot" aria-hidden="true" />
            LIVE CHAT
          </div>
          <div className="lcxSub">Customer ↔ Agent • real-time demo</div>
        </div>

        <div className="lcxStatus">
          <span className="lcxDot" aria-hidden="true" />
          ACTIVE
        </div>
      </div>

      <div className="lcxFrame">
        <div className="lcxScroll" aria-label="Chat messages">
          {items.map((it) => {
            if (it.kind === "typing") {
              const isCustomer = it.role === "customer";
              return (
                <div key={it.id} className={`lcxMsg ${isCustomer ? "lcxCustomer" : "lcxAgent"}`}>
                  <div className="lcxMeta">
                    <span className="lcxWho">{whoLabel(it.role)}</span>
                    <span className="lcxTime">typing…</span>
                  </div>
                  <div className={`lcxBubble lcxTyping`} aria-label="Typing indicator">
                    <span className="lcxDots" aria-hidden="true">
                      <i /><i /><i />
                    </span>
                  </div>
                </div>
              );
            }

            const isCustomer = it.role === "customer";
            return (
              <div key={it.id} className={`lcxMsg ${isCustomer ? "lcxCustomer" : "lcxAgent"}`}>
                <div className="lcxMeta">
                  <span className="lcxWho">{whoLabel(it.role)}</span>
                  <span className="lcxTime">{it.time ?? ""}</span>
                </div>
                <div className="lcxBubble">{it.text}</div>
              </div>
            );
          })}

          <div ref={endRef} />
        </div>
      </div>

      <div className="lcxFoot" aria-label="Telemetry">
        <span className="lcxPill">intent: detect</span>
        <span className="lcxPill">route: auto</span>
        <span className="lcxPill">audit: on</span>
        <span className="lcxPill">latency: low</span>
      </div>
    </section>
  );
}
