"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Upload,
  Radio,
  Film,
  Scissors,
  LoaderCircle,
  Info,
  Check,
  ExternalLink,
} from "lucide-react";
import { api, notify } from "./common";
import { Moment } from "./creation";
import { Library } from "./library";
import { PageHeading, type Me } from "./workspace";
import { flagshipIds, getPreset, presets } from "@/lib/presets";
type Clip = {
  id: string;
  title: string;
  thumbnail_url: string;
  duration: number;
  url: string;
  edit_url?: string;
};
export function NewRound({ data }: { data: Me }) {
  const [mode, setMode] = useState("open-remix"),
    [library, setLibrary] = useState(false),
    [source, setSource] = useState("scene"),
    [clipType, setClipType] = useState("scene"),
    [clipUrl, setClipUrl] = useState("/images/skyfall.svg"),
    [title, setTitle] = useState("The rescue that needed a rescue"),
    [context, setContext] = useState(
      "A heroic rescue between floating islands goes very, very wrong.",
    ),
    [duration, setDuration] = useState(180),
    [limit, setLimit] = useState(100),
    [clipDuration, setClipDuration] = useState(30),
    [clips, setClips] = useState<Clip[]>([]),
    [busy, setBusy] = useState(false),
    [capturing, setCapturing] = useState(false),
    [captureMessage, setCaptureMessage] = useState(""),
    [error, setError] = useState(""),
    [manualClip, setManualClip] = useState("");
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("mode");
    if (id && (id === "open-remix" || presets.some((p) => p.id === id)))
      setMode(id);
  }, []);
  async function recentClips() {
    setError("");
    setBusy(true);
    try {
      const r = await api<{ data: Clip[] }>("/api/twitch/clips");
      setClips(r.data);
      if (!r.data.length)
        setError(
          "No published clips found. Capture a live moment or upload a local clip.",
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function selectClip(c: Clip) {
    setClipType("twitch");
    setClipUrl(c.id);
    setTitle(c.title.slice(0, 80) || "A moment worth remixing");
    setContext("Selected Twitch clip: " + c.title);
    notify("Twitch clip selected.");
  }
  async function capture() {
    setCapturing(true);
    setError("");
    setCaptureMessage("Requesting your Twitch clip…");
    try {
      const start = await api<{ data: Clip[] }>("/api/twitch/clips", {
        duration: clipDuration,
      });
      const id = start.data[0]?.id;
      if (!id)
        throw new Error(
          "Twitch did not return a clip ID. Try an existing clip or local upload.",
        );
      const deadline = Date.now() + 60000;
      let result: Clip | undefined;
      while (Date.now() < deadline) {
        setCaptureMessage(
          "Twitch is processing your clip. Waiting for Get Clips confirmation…",
        );
        const check = await api<{ data: Clip[] }>(
          "/api/twitch/clips?id=" + encodeURIComponent(id),
        );
        if (check.data[0]) {
          result = check.data[0];
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      if (!result)
        throw new Error(
          "Twitch did not publish the clip within 60 seconds. It may still appear in recent clips; use a local upload to continue.",
        );
      selectClip(result);
      setClips((prev) => [result!, ...prev.filter((c) => c.id !== result!.id)]);
      setCaptureMessage("Your clip is published and ready.");
    } catch (e) {
      setError((e as Error).message);
      setCaptureMessage("");
    } finally {
      setCapturing(false);
    }
  }
  async function upload(file: File) {
    setError("");
    if (
      !["video/mp4", "video/webm"].includes(file.type) ||
      file.size > 20 * 1024 * 1024
    ) {
      setError("Choose an MP4 or WebM video smaller than 20 MB.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const json = (await res.json()) as { error: string; url: string };
      if (!res.ok) throw new Error(json.error);
      setClipType("upload");
      setClipUrl(json.url);
      setTitle(file.name.replace(/\.[^.]+$/, "").slice(0, 80));
      setContext(
        "Describe the selected clip so viewers and moderation have context.",
      );
      notify("Your clip is uploaded and saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    setBusy(true);
    setError("");
    try {
      const r = await api<{ id: string }>("/api/rounds", {
        title,
        context,
        clipType,
        clipUrl,
        mode,
        duration,
        limit,
      });
      window.location.href = "/creator/rounds/" + r.id;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="CAPTURE → LAUNCH"
        title="Every great take starts with a moment."
        description="Choose your clip and set the stage. You can review everything before launching."
      >
        <a className="button secondary small" href="/creator">
          Back to overview
        </a>
      </PageHeading>
      <div className="new-round-grid">
        <section className="card">
          <div className="wizard-step">
            <span>01</span>
            <h3>Choose the moment</h3>
          </div>
          <div className="source-tabs" role="group" aria-label="Moment source">
            <button
              className={source === "scene" ? "active" : ""}
              onClick={() => {
                setSource("scene");
                setClipType("scene");
                setClipUrl("/images/skyfall.svg");
              }}
            >
              Original scene
            </button>
            <button
              className={source === "twitch" ? "active" : ""}
              onClick={() => setSource("twitch")}
            >
              Twitch clip
            </button>
            <button
              className={source === "upload" ? "active" : ""}
              onClick={() => setSource("upload")}
            >
              Upload clip
            </button>
          </div>
          {source === "scene" ? (
            <>
              <Moment
                round={{
                  clipType: "scene",
                  clipUrl: "/images/skyfall.svg",
                  context,
                }}
              />
              <p className="moment-context">
                Our original Skyfall scene is ready for a rehearsal. For the
                real Twitch demonstration, select a Twitch clip or upload
                footage from your stream.
              </p>
            </>
          ) : source === "upload" ? (
            <>
              <div className="upload-area">
                <Upload size={30} />
                <strong>Your moment, straight from your laptop.</strong>
                <span>
                  MP4 or WebM · up to 20 MB · use media you have rights to share
                </span>
                <input
                  aria-label="Upload local video clip"
                  type="file"
                  accept="video/mp4,video/webm"
                  disabled={busy}
                  onChange={(e) => {
                    if (e.target.files?.[0]) void upload(e.target.files[0]);
                  }}
                />
                {busy && <LoaderCircle className="spin" size={19} />}
              </div>
              {clipType === "upload" && (
                <div style={{ marginTop: 15 }}>
                  <Moment round={{ clipType, clipUrl, context }} />
                  <div className="file-selected">
                    <Check
                      size={13}
                      style={{ display: "inline", marginRight: 5 }}
                    />{" "}
                    Saved to your workspace
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="hint">
                <Radio size={18} />
                <span>
                  {data.user?.demo
                    ? "Connect your real Twitch channel before capturing or browsing its clips."
                    : "Capture a live moment or choose a published clip. Twitch must allow clipping for your channel and category."}
                </span>
              </div>
              <div className="row" style={{ marginTop: 17 }}>
                <strong className="tiny">CAPTURE WINDOW</strong>
                <div className="segmented">
                  {[15, 30, 60].map((s) => (
                    <button
                      type="button"
                      key={s}
                      className={clipDuration === s ? "selected" : ""}
                      onClick={() => setClipDuration(s)}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </div>
              <div className="row wrap" style={{ marginTop: 16 }}>
                <button
                  className="button small"
                  onClick={capture}
                  disabled={capturing || busy || !!data.user?.demo}
                >
                  {capturing ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Scissors size={16} />
                  )}{" "}
                  {capturing ? "Waiting for Twitch…" : "Capture live moment"}
                </button>
                <button
                  className="button secondary small"
                  onClick={recentClips}
                  disabled={busy || capturing || !!data.user?.demo}
                >
                  <Film size={15} /> Recent clips
                </button>
              </div>
              {captureMessage && (
                <p className="tiny" style={{ marginTop: 12 }}>
                  {captureMessage}
                </p>
              )}
              {clips.length > 0 && (
                <div className="clip-list">
                  {clips.map((c) => (
                    <button
                      key={c.id}
                      className={`clip-option ${clipUrl === c.id ? "selected" : ""}`}
                      onClick={() => selectClip(c)}
                    >
                      <img src={c.thumbnail_url} alt="" />
                      <span>{c.title}</span>
                      <small>{Math.round(c.duration)} seconds</small>
                    </button>
                  ))}
                </div>
              )}
              <div className="rule" />
              <label>
                Or paste a published Twitch clip URL
                <input
                  value={manualClip}
                  onChange={(e) => setManualClip(e.target.value)}
                  placeholder="https://clips.twitch.tv/…"
                />
              </label>
              <button
                className="button secondary small"
                style={{ marginTop: 12 }}
                onClick={() => {
                  try {
                    const parsed = new URL(manualClip);
                    if (
                      ![
                        "clips.twitch.tv",
                        "www.twitch.tv",
                        "twitch.tv",
                      ].includes(parsed.hostname)
                    )
                      throw new Error();
                    const id =
                      parsed.hostname === "clips.twitch.tv"
                        ? parsed.pathname.split("/")[1]
                        : parsed.pathname.split("/clip/")[1];
                    if (!id || !/^[A-Za-z0-9_-]{1,160}$/.test(id))
                      throw new Error();
                    setClipType("twitch");
                    setClipUrl(id);
                    notify(
                      "Clip selected. Check the preview before launching.",
                    );
                  } catch {
                    setError("Paste a valid Twitch clip URL.");
                  }
                }}
              >
                Use this clip <ArrowRight size={13} />
              </button>
              {clipType === "twitch" && (
                <div style={{ marginTop: 16 }}>
                  <Moment round={{ clipType, clipUrl, context }} />
                  <a
                    className="text-link"
                    style={{ marginTop: 10 }}
                    href={`https://clips.twitch.tv/${clipUrl}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Verify clip on Twitch <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </>
          )}
          <div className="field-section">
            <label>
              Round title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                required
              />
            </label>
            <label>
              What happened in this moment?
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                maxLength={400}
                rows={3}
                required
              />
              <span className="field-note">
                Viewers and moderation use this context. Describe the actual
                moment.
              </span>
            </label>
          </div>
        </section>
        <section className="card">
          <div className="wizard-step">
            <span>02</span>
            <h3>Set the creative brief</h3>
          </div>
          <p className="description">
            One format for a focused challenge. Open Remix for glorious variety.
          </p>
          <div className="mode-grid">
            {["open-remix", ...flagshipIds.slice(0, 5)].map((id) => (
              <button
                type="button"
                key={id}
                className={`mode-button ${mode === id ? "selected" : ""}`}
                aria-pressed={mode === id}
                onClick={() => setMode(id)}
              >
                <span className="emoji">
                  {id === "open-remix" ? "✦" : getPreset(id).icon}
                </span>
                {id === "open-remix" ? "Open Remix" : getPreset(id).name}
              </button>
            ))}
          </div>
          <div className="row" style={{ marginTop: 15 }}>
            <span className="tiny">
              {mode === "open-remix"
                ? "All 50 formats available to viewers"
                : getPreset(mode).name + " selected"}
            </span>
            <button className="text-link" onClick={() => setLibrary(!library)}>
              {library ? "Close library" : "Browse all 50"}
              <ArrowRight size={13} />
            </button>
          </div>
          {library && (
            <div className="modal-backdrop">
              <section
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-label="Choose creative format"
              >
                <div className="row" style={{ marginBottom: 20 }}>
                  <h3>Choose a format</h3>
                  <button
                    className="button secondary small"
                    onClick={() => setLibrary(false)}
                  >
                    Close
                  </button>
                </div>
                <Library
                  onSelect={(id) => {
                    setMode(id);
                    setLibrary(false);
                  }}
                />
              </section>
            </div>
          )}
          <div className="rule" />
          <div className="form-grid">
            <label>
              Submission window
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                {[60, 120, 180, 300, 600, 900].map((s) => (
                  <option value={s} key={s}>
                    {s / 60} {s === 60 ? "minute" : "minutes"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Maximum entries
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                {[25, 50, 100, 250].map((n) => (
                  <option value={n} key={n}>
                    {n} entries
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="hint" style={{ marginTop: 20 }}>
            <ShieldIcon />
            <span>
              Entries stay private. Only approved creations can be revealed.
              Guest viewers can submit up to 3 entries per round.
            </span>
          </div>
          <div className="hint warning" style={{ marginTop: 12 }}>
            <Info size={16} />
            <span>
              Fictional parody only. No real-world impersonation, harassment,
              private information, or unauthorized media. The creator reviews
              everything before broadcast.
            </span>
          </div>
          {error && (
            <div className="inline-error" role="alert">
              {error}
            </div>
          )}
          <button
            type="button"
            className="button full"
            style={{ marginTop: 24 }}
            disabled={busy || capturing}
            onClick={create}
          >
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <ArrowRight size={17} />
            )}{" "}
            {busy ? "Saving your round…" : "Create round & preview launch"}
          </button>
          <span
            className="tiny"
            style={{ display: "flex", justifyContent: "center", marginTop: 10 }}
          >
            This saves a draft. Submissions open when you launch.
          </span>
        </section>
      </div>
    </>
  );
}
function ShieldIcon() {
  return <Check size={17} />;
}
