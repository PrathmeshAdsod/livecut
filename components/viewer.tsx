"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ShieldCheck,
  LockKeyhole,
  Clock as ClockIcon,
  Sparkles,
  Trophy,
  Radio,
  Layers,
  X,
  LoaderCircle,
} from "lucide-react";
import {
  Nav,
  Toasts,
  api,
  notify,
  usePolling,
  Loading,
  ErrorState,
  Status,
  Clock,
  ConnectionBanner,
} from "./common";
import { Moment, Creation, ExportButton } from "./creation";
import { Library } from "./library";
import { getPreset, flagshipIds } from "@/lib/presets";
import type { RoundData } from "@/lib/types";
export function Viewer({ id }: { id: string }) {
  const { data, error, loading, refresh } = usePolling<RoundData>(
    "/api/rounds/" + id,
    2500,
  );
  const [mode, setMode] = useState("breaking-news"),
    [nickname, setNickname] = useState(""),
    [headline, setHeadline] = useState(""),
    [detail, setDetail] = useState(""),
    [busy, setBusy] = useState(false),
    [submitted, setSubmitted] = useState(false),
    [formError, setFormError] = useState(""),
    [library, setLibrary] = useState(false),
    [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (data && !initialized) {
      setMode(
        data.round.mode === "open-remix" ? "breaking-news" : data.round.mode,
      );
      setNickname(localStorage.getItem("livecut-nickname") ?? "");
      try {
        const draft = JSON.parse(
          sessionStorage.getItem("livecut-draft-" + id) ?? "null",
        );
        if (draft) {
          setHeadline(draft.headline ?? "");
          setDetail(draft.detail ?? "");
          if (data.round.mode === "open-remix")
            setMode(draft.mode ?? "breaking-news");
        }
      } catch {}
      setInitialized(true);
    }
  }, [data, initialized, id]);
  useEffect(() => {
    if (initialized)
      sessionStorage.setItem(
        "livecut-draft-" + id,
        JSON.stringify({ headline, detail, mode }),
      );
  }, [headline, detail, mode, id, initialized]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      await api("/api/rounds/" + id + "/entries", {
        nickname,
        mode,
        headline,
        detail,
      });
      localStorage.setItem("livecut-nickname", nickname);
      setSubmitted(true);
      setHeadline("");
      setDetail("");
      sessionStorage.removeItem("livecut-draft-" + id);
      await refresh();
      notify("Your creation is saved privately. You’re in!");
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const p = getPreset(mode);
  if (loading && !data)
    return (
      <>
        <Nav />
        <main className="public-content">
          <Loading />
        </main>
      </>
    );
  if (!data)
    return (
      <>
        <Nav />
        <main className="public-content">
          <ErrorState message={error} retry={refresh} />
        </main>
      </>
    );
  const r = data.round,
    open = r.status === "open",
    revealed = data.entries.find((e) => e.id === r.revealId),
    winner = data.entries.find((e) => e.id === r.winnerId);
  const modeIds = r.mode === "open-remix" ? flagshipIds : [r.mode];
  return (
    <>
      <Nav />
      <main className="public-content">
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              {r.creatorName?.toUpperCase()}’S CREATIVE ROUND
            </div>
            <h1>
              {r.status === "completed"
                ? "A moment. A masterpiece."
                : "Make this moment unforgettable."}
            </h1>
            <p>
              {r.status === "completed"
                ? "The creator’s pick is in. The credit belongs to the community."
                : "Your take. Your style. The creator might premiere it live."}
            </p>
          </div>
          <div className="row">
            <Status round={r} />
            {["open", "paused", "draft"].includes(r.status) && (
              <span className="tag amber">
                <ClockIcon size={12} />
                <Clock round={r} />
              </span>
            )}
          </div>
        </div>
        {error && <ConnectionBanner message={error} />}{" "}
        {!!r.demo && (
          <div className="rehearsal-banner">
            <Sparkles size={14} />
            <span>
              This is a rehearsal round. It is not connected to a Twitch stream.
              Synthetic entries are labeled separately.
            </span>
          </div>
        )}
        {winner ? (
          <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
            <div className="card-header">
              <h3>
                <Trophy
                  size={19}
                  style={{
                    display: "inline",
                    marginRight: 8,
                    color: "#dca853",
                  }}
                />{" "}
                The winning creation
              </h3>
              <span className="tag amber">CREATOR’S PICK</span>
            </div>
            <Creation
              mode={winner.mode}
              headline={winner.headline}
              detail={winner.detail}
              nickname={winner.nickname}
              synthetic={winner.synthetic}
              scene={r.clipType === "scene"}
            />
            <div className="winner-credit">
              <Trophy size={17} />
              <strong>Created by @{winner.nickname}</strong>
              {!!winner.synthetic && (
                <span className="tag amber">SYNTHETIC DEMO</span>
              )}
            </div>
            <div className="row wrap" style={{ marginTop: 24 }}>
              <span className="tiny">
                {r.realCount ?? 0} real entries ·{" "}
                {(r.count ?? 0) - (r.realCount ?? 0)} synthetic demo entries
              </span>
              <ExportButton entry={winner} round={r} />
            </div>
          </section>
        ) : (
          <div className="viewer-layout">
            <div className="viewer-left">
              <section className="card">
                <div className="card-header">
                  <h3>The moment</h3>
                  <span>
                    {r.clipType === "scene"
                      ? "Original Skyfall scene"
                      : r.clipType === "twitch"
                        ? "Twitch clip"
                        : "Creator’s clip"}
                  </span>
                </div>
                <Moment round={r} />
                <p className="moment-context">{r.context}</p>
              </section>
              <section className="card viewer-format-card">
                <div className="card-header">
                  <h3>Choose your format</h3>
                  {r.mode === "open-remix" && (
                    <button
                      className="text-link"
                      style={{ fontSize: 10 }}
                      onClick={() => setLibrary(true)}
                    >
                      All 50 <ArrowRight size={12} />
                    </button>
                  )}
                </div>
                <div className="mode-grid">
                  {modeIds.map((id) => (
                    <button
                      key={id}
                      className={`mode-button ${mode === id ? "selected" : ""}`}
                      onClick={() => {
                        setMode(id);
                        setSubmitted(false);
                      }}
                      aria-pressed={mode === id}
                    >
                      <span className="emoji">{getPreset(id).icon}</span>
                      {getPreset(id).name}
                    </button>
                  ))}
                </div>
                {!modeIds.includes(mode) && (
                  <div className="tag" style={{ marginTop: 14 }}>
                    {p.icon} {p.name} selected
                  </div>
                )}
              </section>
              <div className="private-note">
                <ShieldCheck size={15} />
                <span>
                  Keep it creative, not cruel. No real-world misinformation,
                  harassment, private details, or impersonation. News treatments
                  are fictional parody.
                </span>
              </div>
            </div>
            {revealed ? (
              <section className="card">
                <div className="row" style={{ marginBottom: 18 }}>
                  <div className="eyebrow">ON AIR NOW</div>
                  <span className="tag green">
                    <Radio size={12} /> FINALIST REVEAL
                  </span>
                </div>
                <h2 style={{ marginBottom: 20 }}>
                  The spotlight is on @{revealed.nickname}.
                </h2>
                <Creation
                  mode={revealed.mode}
                  headline={revealed.headline}
                  detail={revealed.detail}
                  nickname={revealed.nickname}
                  synthetic={revealed.synthetic}
                  scene={r.clipType === "scene"}
                />
                <p className="muted" style={{ fontSize: 12, marginTop: 20 }}>
                  The creator is revealing the finalists. Stay tuned for the
                  winner.
                </p>
              </section>
            ) : submitted ? (
              <section className="card submitted-card">
                <div className="success-icon">
                  <Check size={28} />
                </div>
                <div className="eyebrow">YOU’RE IN THE MIX</div>
                <h2>
                  Your take has entered the chat.
                  <br />
                  Privately, of course.
                </h2>
                <p>
                  The creator will review it before anything goes on stream.
                  Keep watching for the reveal.
                </p>
                {data.mine[0] && (
                  <Creation
                    mode={data.mine[0].mode}
                    headline={data.mine[0].headline}
                    detail={data.mine[0].detail}
                    nickname={data.mine[0].nickname}
                    scene={r.clipType === "scene"}
                  />
                )}
                <div className="mine-list">
                  <h4>Your submissions · {data.mine.length}/3</h4>
                  {data.mine.map((e) => (
                    <div className="mine-item" key={e.id}>
                      <strong>{e.headline}</strong>
                      <span>
                        {e.status === "approved"
                          ? "Approved by creator"
                          : e.status === "rejected"
                            ? "Not selected"
                            : "Awaiting review"}
                      </span>
                    </div>
                  ))}
                </div>
                {open && data.mine.length < 3 && (
                  <button
                    className="button secondary"
                    onClick={() => setSubmitted(false)}
                  >
                    Have another take? <ArrowRight size={15} />
                  </button>
                )}
              </section>
            ) : (
              <form className="card studio-card" onSubmit={submit}>
                <div className="row">
                  <div>
                    <div className="eyebrow">YOUR CREATIVE STUDIO</div>
                    <h2>
                      {p.icon} {p.name}
                    </h2>
                  </div>
                  <span className="tag">{p.badge}</span>
                </div>
                <p>{p.prompt}</p>
                {!open && (
                  <div className="hint warning" style={{ margin: "15px 0" }}>
                    <InfoIcon />
                    <span>
                      {r.status === "draft"
                        ? "The creator hasn’t launched this round yet. You can prepare your creation while you wait."
                        : r.status === "paused"
                          ? "This round is paused. Your draft is saved on this device."
                          : "Submissions have closed. Your draft stays on this device while the creator reviews."}
                    </span>
                  </div>
                )}
                <label>
                  Your nickname{" "}
                  <input
                    aria-label="Your nickname"
                    placeholder="How should we credit you?"
                    minLength={2}
                    maxLength={24}
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    autoComplete="nickname"
                  />
                </label>
                <span className="field-note">
                  Guest nickname · Twitch identity is not verified
                </span>
                <label>
                  {p.label}
                  <textarea
                    aria-label={p.label}
                    placeholder={p.example}
                    rows={2}
                    minLength={3}
                    maxLength={120}
                    required
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                  />
                </label>
                <div className="field-counter">
                  <span>Keep it funny, kind, and about the moment.</span>
                  <span>{headline.length} / 120</span>
                </div>
                <label>
                  {p.detailLabel}{" "}
                  <span
                    style={{
                      fontWeight: 400,
                      color: "#97a8ba",
                      display: "inline",
                    }}
                  >
                    (optional)
                  </span>
                  <input
                    aria-label={p.detailLabel}
                    placeholder={p.detailExample}
                    maxLength={200}
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                  />
                </label>
                <div className="row" style={{ marginTop: 24 }}>
                  <h3 style={{ fontSize: 16 }}>Live preview</h3>
                  <span className="tiny">
                    {headline ? "Your creation" : "Example content"} ·{" "}
                    {p.renderer}
                  </span>
                </div>
                <Creation
                  mode={mode}
                  headline={headline}
                  detail={detail}
                  scene={r.clipType === "scene"}
                />
                {formError && (
                  <div className="inline-error" role="alert">
                    {formError}
                  </div>
                )}
                <button
                  className="button full"
                  disabled={busy || !open || data.mine.length >= 3}
                  type="submit"
                >
                  {busy ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <ArrowRight size={17} />
                  )}{" "}
                  {busy
                    ? "Saving your take…"
                    : data.mine.length >= 3
                      ? "You’ve submitted your three takes"
                      : !open
                        ? "Waiting for submissions to open"
                        : "Submit my creation"}
                </button>
                <span className="tiny">
                  <LockKeyhole size={11} /> Private until approved and revealed
                  by the creator.
                </span>
                {data.mine.length > 0 && (
                  <button
                    type="button"
                    className="text-link"
                    style={{
                      display: "flex",
                      margin: "18px auto 0",
                      fontSize: 11,
                    }}
                    onClick={() => setSubmitted(true)}
                  >
                    View my {data.mine.length} saved{" "}
                    {data.mine.length === 1 ? "entry" : "entries"}{" "}
                    <ArrowRight size={13} />
                  </button>
                )}
              </form>
            )}
          </div>
        )}
      </main>
      {library && (
        <div className="modal-backdrop">
          <section
            className="modal"
            style={{ maxWidth: 1080 }}
            role="dialog"
            aria-modal="true"
            aria-label="Choose your creative format"
          >
            <div className="row" style={{ marginBottom: 22 }}>
              <h2>Find your personality.</h2>
              <button
                className="button secondary small"
                onClick={() => setLibrary(false)}
                autoFocus
              >
                <X size={16} /> Close
              </button>
            </div>
            <Library
              onSelect={(id) => {
                setMode(id);
                setSubmitted(false);
                setLibrary(false);
              }}
            />
          </section>
        </div>
      )}
      <Toasts />
    </>
  );
}
function InfoIcon() {
  return <Layers size={16} />;
}
