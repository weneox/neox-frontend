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

  // ✅ son 4 slot (mesaj + typing) göstər
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
  const typingLabel = (r: Role) => (r === "customer" ? "Müştəri typing…" : "NEOX Agent typing…");

  return (
    <section className="neo-chat">
      <div className="neo-chat__head">
        <div className="neo-chat__title">LIVE / CUSTOMER CHAT</div>
        <div className="neo-chat__status">
          <span className="neo-chat__dot" />
          ACTIVE
        </div>
      </div>

      {/* SABİT frame */}
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
                    <span className="neo-msg__time">{typingLabel(it.role)}</span>
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
              <div
                key={it.id}
                className={isCustomer ? "neo-msg neo-msg--customer" : "neo-msg neo-msg--agent"}
              >
                <div className="neo-msg__meta">
                  <span className="neo-msg__who">{whoLabel(it.role)}</span>
                  <span className="neo-msg__time">{it.time ?? ""}</span>
                </div>
                <div className="neo-msg__bubble">{it.text}</div>
              </div>
            );
          })}

          {/* ✅ scroll anchor */}
          <div ref={endRef} />
        </div>
      </div>

      <div className="neo-chat__footer">
        <span className="neo-pill">intent: detect</span>
        <span className="neo-pill">route: auto</span>
        <span className="neo-pill">audit: on</span>
        <span className="neo-pill">latency: low</span>
      </div>
    </section>
  );
}
  