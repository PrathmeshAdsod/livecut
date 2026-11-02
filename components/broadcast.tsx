"use client";
import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { usePolling, Brand, Clock } from "./common";
import { Creation } from "./creation";
import { QR, useOrigin } from "./round-panels";
import { getPreset } from "@/lib/presets";
import type { RoundData } from "@/lib/types";
export function Broadcast({
  id,
  cinematic = false,
}: {
  id: string;
  cinematic?: boolean;
}) {
  const { data, error, loading } = usePolling<RoundData>(
    "/api/rounds/" + id,
    2000,
  );
  const [preview, setPreview] = useState(false);
  const origin = useOrigin();
  useEffect(() => {
    setPreview(
      new URLSearchParams(window.location.search).get("preview") === "1",
    );
    document.body.style.background = "transparent";
    return () => {
      document.body.style.background = "";
    };
  }, []);
  if (loading && !data) return <div className="broadcast-page" />;
  if (!data)
    return (
      <div className="broadcast-page">
        <div className="broadcast-error">
          <h2>Overlay waiting to connect.</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  const r = data.round,
    e = data.entries.find(
      (e) => e.id === r.revealId && e.status === "approved",
    );
  const winner = e?.id === r.winnerId;
  return (
    <main
      className={`broadcast-page ${preview ? "preview" : ""} ${cinematic ? "cinematic" : ""}`}
    >
      {e ? (
        <div className="reveal-stage" key={e.id + ":" + winner}>
          <div className="reveal-kicker">
            {winner
              ? "THE CREATOR HAS CHOSEN"
              : "THE COMMUNITY BROUGHT THE CREATIVITY"}
          </div>
          <div className="reveal-title">
            {winner && <Trophy />}
            {winner ? "THE WINNING TAKE" : "IN THE SPOTLIGHT"}
          </div>
          <div className="reveal-artifact">
            <Creation
              mode={e.mode}
              headline={e.headline}
              detail={e.detail}
              scene={r.clipType === "scene"}
            />
          </div>
          <div className="reveal-credit">
            <span>Created by</span>
            <strong>@{e.nickname}</strong>
            <span>
              · {winner ? "Picked live by the creator" : getPreset(e.mode).name}
            </span>
          </div>
          {(!!r.demo || !!e.synthetic) && (
            <div className="reveal-demo">
              {r.demo ? "REHEARSAL ROUND" : ""}
              {r.demo && e.synthetic ? " · " : ""}
              {e.synthetic ? "SYNTHETIC DEMO ENTRY" : ""}
            </div>
          )}
          {winner && (
            <div className="confetti" aria-hidden="true">
              {Array.from({ length: 32 }, (_, i) => (
                <i
                  key={i}
                  style={{
                    left: `${(i * 37) % 100}%`,
                    animationDelay: `${-i * 0.23}s`,
                    animationDuration: `${3 + (i % 4) * 0.4}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ) : cinematic ? (
        <div className="reveal-idle">
          <Brand light />
          <p>THE NEXT GREAT TAKE IS COMING.</p>
          <span className="tag">
            {r.status === "completed"
              ? "REVEAL HIDDEN BY CREATOR"
              : "WAITING FOR CREATOR REVEAL"}
          </span>
        </div>
      ) : (
        <>
          <div className="broadcast-top">
            <Brand light />
            <span>
              {r.status === "open"
                ? "CREATIVE ROUND ACTIVE"
                : r.status === "paused"
                  ? "ROUND PAUSED"
                  : r.status === "draft"
                    ? "COMING UP NEXT"
                    : "FINALIST REVIEW"}
            </span>
          </div>
          <aside className="broadcast-widget">
            <div className="eyebrow">
              {r.creatorName?.toUpperCase()}’S CREATIVE ROUND
            </div>
            <h2>{r.title}</h2>
            <span className="tag">
              {r.mode === "open-remix"
                ? "✦ Pick your creative style"
                : getPreset(r.mode).icon + " " + getPreset(r.mode).name}
            </span>
            <div className="rule" />
            <p>
              {r.status === "open"
                ? "Submissions close in"
                : r.status === "paused"
                  ? "Paused · time remaining"
                  : r.status === "draft"
                    ? "Opening soon"
                    : "Submissions closed"}
            </p>
            {["draft", "open", "paused"].includes(r.status) ? (
              <Clock round={r} />
            ) : (
              <strong style={{ fontSize: 22 }}>THE REVEAL IS NEXT.</strong>
            )}
            <QR value={origin + "/r/" + id} />
            <small>
              {origin.replace("https://", "").replace("http://", "")}/r/
              {id.slice(0, 8)}…<br />
              Scan the QR code to join
            </small>
          </aside>
          <div className="broadcast-footer">
            <span className="status-dot" />
            {r.demo
              ? "REHEARSAL / NO TWITCH CONNECTION"
              : "@" + r.creatorName}{" "}
            · LIVE CUT
          </div>
          <div className="broadcast-live-count">
            {r.realCount ?? 0} real entries
            {(r.count ?? 0) > (r.realCount ?? 0)
              ? ` · ${(r.count ?? 0) - (r.realCount ?? 0)} synthetic demo`
              : ""}
          </div>
        </>
      )}
      {error && (
        <div className="broadcast-connection">
          Connection interrupted · retrying automatically
        </div>
      )}
    </main>
  );
}
