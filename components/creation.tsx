"use client";
import { useEffect, useState } from "react";
import { ExternalLink, Play, Download } from "lucide-react";
import { getPreset } from "@/lib/presets";
import { notify } from "./common";
import type { Round, Entry } from "@/lib/types";
export function Moment({
  round,
  compact = false,
}: {
  round: Pick<Round, "clipType" | "clipUrl" | "context">;
  compact?: boolean;
}) {
  const [host, setHost] = useState("");
  useEffect(() => setHost(window.location.hostname), []);
  return (
    <div className={`moment ${compact ? "compact" : ""}`}>
      {round.clipType === "scene" ? (
        <>
          <img
            src="/images/skyfall.svg"
            alt="Original Skyfall scene: a hero leaps between floating islands to rescue a friend"
          />
          <span className="moment-label">ORIGINAL SKYFALL SCENE</span>
          <a
            className="scene-play"
            href="/game"
            target="_blank"
            rel="noreferrer"
          >
            <Play size={18} fill="currentColor" /> Play Skyfall{" "}
            <ExternalLink size={13} />
          </a>
        </>
      ) : round.clipType === "upload" ? (
        <video
          controls
          playsInline
          preload="metadata"
          src={round.clipUrl}
          aria-label="Selected moment"
        />
      ) : (
        <>
          <div className="twitch-player">
            {host && (
              <iframe
                title="Selected Twitch clip"
                src={`https://clips.twitch.tv/embed?clip=${encodeURIComponent(round.clipUrl)}&parent=${encodeURIComponent(host)}&autoplay=false`}
                allowFullScreen
              />
            )}
          </div>
          <a
            className="twitch-mobile button secondary"
            href={`https://clips.twitch.tv/${encodeURIComponent(round.clipUrl)}`}
            target="_blank"
            rel="noreferrer"
          >
            Watch the clip on Twitch <ExternalLink size={16} />
          </a>
        </>
      )}
    </div>
  );
}
export function Creation({
  mode,
  headline,
  detail,
  nickname,
  synthetic = 0,
  scene = true,
}: {
  mode: string;
  headline: string;
  detail: string;
  nickname?: string;
  synthetic?: number;
  scene?: boolean;
}) {
  const p = getPreset(mode);
  return (
    <div
      className={`creation render-${p.renderer}`}
      data-testid="creation-preview"
    >
      <div className="creation-top">
        <span>
          {p.renderer === "news"
            ? p.name.toUpperCase() + " · PARODY"
            : p.renderer === "memo"
              ? "INTERNAL MEMO · FICTIONAL"
              : p.renderer === "cinema"
                ? "A LIVE CUT ORIGINAL"
                : p.renderer === "documentary"
                  ? "FIELD NOTES · " + p.name.toUpperCase()
                  : p.renderer === "sports"
                    ? "LIVE CUT SPORTS · COMMUNITY EDITION"
                    : p.name.toUpperCase()}
        </span>
        <span className="creation-mark">LC</span>
      </div>
      <div className="creation-body">
        {p.renderer === "memo" && (
          <div className="memo-meta">
            TO: THE COMMUNITY <span>PRIORITY: QUESTIONABLE</span>
          </div>
        )}
        {(p.renderer === "caption" ||
          p.renderer === "cinema" ||
          p.renderer === "documentary") && (
          <div className="creation-detail">{detail || p.detailExample}</div>
        )}
        <div className="creation-headline">{headline || p.example}</div>
        {(p.renderer === "news" || p.renderer === "sports") && scene && (
          <div className="creation-scene">
            <img src="/images/skyfall.svg" alt="" />
          </div>
        )}
        {p.renderer === "memo" && (
          <p className="creation-memo-text">{detail || p.detailExample}</p>
        )}
        {p.renderer === "cinema" && (
          <div className="cinema-credits">
            A COMMUNITY PRODUCTION • DIRECTED BY THE MOMENT
            <br />
            COMING SOON TO YOUR STREAM
          </div>
        )}
      </div>
      <div className="creation-bottom">
        <span>
          {p.renderer === "news"
            ? detail || p.detailExample
            : p.renderer === "sports"
              ? detail || p.detailExample
              : "LIVE CUT / " + p.badge}
        </span>
        {nickname && (
          <strong>
            @{nickname}
            {synthetic ? " · SYNTHETIC DEMO" : ""}
          </strong>
        )}
      </div>
    </div>
  );
}
export async function downloadCreation(
  entry: Pick<Entry, "mode" | "headline" | "detail" | "nickname" | "synthetic">,
  round?: Round,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image export is unavailable in this browser.");
  const p = getPreset(entry.mode),
    memo = p.renderer === "memo",
    cinema = p.renderer === "cinema";
  ctx.fillStyle = memo ? "#f8f7f1" : "#0a203b";
  ctx.fillRect(0, 0, 1920, 1080);
  const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
  grad.addColorStop(0, memo ? "#f8f7f1" : "#081a30");
  grad.addColorStop(1, memo ? "#e7eef7" : "#164d83");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1920, 1080);
  ctx.fillStyle =
    p.renderer === "news" ? "#ee344a" : memo ? "#dce7f2" : "#126be8";
  ctx.fillRect(0, 0, 1920, 100);
  ctx.fillStyle = memo ? "#0a203b" : "#fff";
  ctx.font = "bold 30px Arial";
  ctx.fillText(p.name.toUpperCase() + " · " + p.badge, 70, 63);
  ctx.textAlign = "right";
  ctx.fillText("LIVE CUT", 1850, 63);
  ctx.textAlign = "left";
  if (round?.clipType === "scene" && !memo) {
    const img = new Image();
    img.src = "/images/skyfall.svg";
    await img.decode();
    ctx.save();
    ctx.globalAlpha = cinema ? 0.18 : 0.88;
    const w = cinema ? 1920 : 650,
      h = cinema ? 850 : 650;
    const ratio = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sw = w / ratio,
      sh = h / ratio;
    ctx.drawImage(
      img,
      (img.naturalWidth - sw) / 2,
      (img.naturalHeight - sh) / 2,
      sw,
      sh,
      cinema ? 0 : 1200,
      cinema ? 100 : 180,
      w,
      h,
    );
    ctx.restore();
  }
  const maxWidth =
    round?.clipType === "scene" && !memo && !cinema ? 1080 : 1740;
  const lines = (value: string, width: number) => {
    const output: string[] = [];
    let line = "";
    for (const word of value.split(/\s+/)) {
      if (ctx.measureText(word).width > width) {
        if (line) {
          output.push(line.trim());
          line = "";
        }
        for (const char of word) {
          if (ctx.measureText(line + char).width > width) {
            output.push(line);
            line = char;
          } else line += char;
        }
        line += " ";
      } else if (ctx.measureText(line + word).width > width && line) {
        output.push(line.trim());
        line = word + " ";
      } else line += word + " ";
    }
    if (line.trim()) output.push(line.trim());
    return output;
  };
  ctx.fillStyle = memo ? "#102744" : "#fff";
  let font = cinema ? 105 : 88;
  let headlineLines: string[] = [];
  for (; font >= 42; font -= 3) {
    ctx.font = `800 ${font}px Arial`;
    headlineLines = lines(entry.headline, maxWidth);
    if (headlineLines.length * font * 1.2 <= 430) break;
  }
  const baseline = 260 + (430 - headlineLines.length * font * 1.2) / 2;
  headlineLines.forEach((line, i) =>
    ctx.fillText(line, 80, baseline + i * font * 1.2),
  );
  ctx.fillStyle = memo ? "#486078" : "#afcbe6";
  ctx.font = "32px Arial";
  lines(entry.detail || p.detailExample, maxWidth)
    .slice(0, 4)
    .forEach((line, i) => ctx.fillText(line, 80, 730 + i * 42));
  ctx.fillStyle = memo ? "#0d2845" : "#fff";
  ctx.font = "bold 34px Arial";
  ctx.fillText("Created by @" + entry.nickname, 80, 962);
  ctx.fillStyle = memo ? "#52718c" : "#9cc3e8";
  ctx.font = "24px Arial";
  ctx.fillText(
    (entry.synthetic ? "SYNTHETIC DEMO ENTRY · " : "") +
      (round?.demo ? "REHEARSAL ROUND · " : "") +
      "Creator’s pick · livecut",
    80,
    1013,
  );
  await new Promise<void>((resolve, reject) =>
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Export failed."));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `livecut-${p.id}-${entry.nickname.replace(/[^a-z0-9]/gi, "-")}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      resolve();
    }, "image/png"),
  );
}
export function ExportButton({
  entry,
  round,
}: {
  entry: Entry;
  round?: Round;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadCreation(entry, round);
          notify("Your 1920 × 1080 creation has been exported.");
        } catch (e) {
          notify((e as Error).message, "error");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Download size={17} />
      {busy ? "Rendering…" : "Export winning creation"}
    </button>
  );
}
