"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Play,
  Pause,
  Square,
  Users,
  FlaskConical,
  ShieldCheck,
  Sparkles,
  Check,
  X,
  Eye,
  Trophy,
  MonitorPlay,
  Download,
  Plus,
  Info,
  LoaderCircle,
  Radio,
} from "lucide-react";
import {
  api,
  notify,
  usePolling,
  Status,
  Clock,
  CopyButton,
  Loading,
  ErrorState,
  ConnectionBanner,
} from "./common";
import { Moment, Creation, ExportButton } from "./creation";
import { getPreset } from "@/lib/presets";
import { PageHeading, RoundList, type Me } from "./workspace";
import type { Round, RoundData, Entry } from "@/lib/types";
export function useOrigin() {
  const [value, setValue] = useState("");
  useEffect(() => setValue(window.location.origin), []);
  return value;
}
export function QR({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let alive = true;
    if (value)
      import("qrcode")
        .then((m) =>
          m.toDataURL(value, {
            width: 240,
            margin: 2,
            errorCorrectionLevel: "M",
            color: { dark: "#0c2442", light: "#ffffff" },
          }),
        )
        .then((v) => {
          if (alive) setSrc(v);
        })
        .catch(() => {
          if (alive) setSrc("");
        });
    return () => {
      alive = false;
    };
  }, [value]);
  return src ? (
    <img
      src={src}
      alt="QR code for the viewer participation URL"
      className={className}
    />
  ) : (
    <span className="tiny">QR loading…</span>
  );
}
function useRound(id: string) {
  return usePolling<RoundData>("/api/rounds/" + id, 2500);
}
function useAction(id: string, refresh: () => Promise<void>) {
  const [busy, setBusy] = useState("");
  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (busy) return;
    setBusy(action + (extra.entryId ?? ""));
    try {
      await api("/api/rounds/" + id, { action, ...extra });
      await refresh();
      if (action === "winner")
        notify("Winner crowned. The reveal is live on your overlay.");
      else if (action === "reveal")
        notify("This approved creation is now on your overlay.");
      else if (action === "seed")
        notify("Synthetic demo entries added and labeled.");
      else if (action === "shortlist")
        notify("Shortlist is ready for your review.");
    } catch (e) {
      notify((e as Error).message, "error");
    } finally {
      setBusy("");
    }
  }
  return { busy, act };
}
export function RoundManager({ id }: { id: string }) {
  const { data, error, loading, refresh } = useRound(id);
  const { busy, act } = useAction(id, refresh);
  const origin = useOrigin();
  if (loading && !data) return <Loading />;
  if (!data) return <ErrorState message={error} retry={refresh} />;
  if (!data.owner)
    return (
      <ErrorState message="This round belongs to another creator. Open its viewer link to participate." />
    );
  const r = data.round,
    real = data.entries.filter((e) => !e.synthetic).length,
    demo = data.entries.length - real;
  const link = origin + "/r/" + id;
  return (
    <>
      <PageHeading
        eyebrow="YOUR CREATIVE ROUND"
        title={r.title}
        description="Keep the stream moving. Your community can create while you play."
      >
        <Status round={r} />
        <a className="button secondary small" href="/creator/rounds">
          All rounds
        </a>
      </PageHeading>
      {error && <ConnectionBanner message={error} />}
      <div className="round-manager-grid">
        <section className="card">
          <div className="card-header">
            <h3>The moment</h3>
            <span>
              {r.clipType === "scene"
                ? "Original scene"
                : r.clipType === "twitch"
                  ? "Twitch clip"
                  : "Uploaded clip"}
            </span>
          </div>
          <Moment round={r} />
          <p className="moment-context">{r.context}</p>
          <span className="round-mode-chip">
            {r.mode === "open-remix"
              ? "✦ Open Remix · all 50 formats"
              : getPreset(r.mode).icon + " " + getPreset(r.mode).name}
          </span>
          <div className="rule" />
          <div className="row">
            <h3>Participation</h3>
            <span className="tiny">{r.limit} entry cap</span>
          </div>
          <div className="round-stat-block">
            <div>
              <strong className="round-count">{real}</strong>
              <span>real submissions</span>
            </div>
            <div>
              <strong className="round-count">{demo}</strong>
              <span>synthetic demo entries</span>
            </div>
            <div>
              <Clock round={r} />
              <span>
                {r.status === "paused" ? "paused remaining" : "time remaining"}
              </span>
            </div>
          </div>
          <div className="progress">
            <div
              style={{
                width: `${Math.min(100, (data.entries.length / r.limit) * 100)}%`,
              }}
            />
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <h3>
              {r.status === "draft"
                ? "Your round is ready."
                : r.status === "open"
                  ? "Let the good takes roll."
                  : r.status === "completed"
                    ? "A new highlight was born."
                    : "Your next move."}
            </h3>
            <Radio size={19} color="#378ddd" />
          </div>
          <p className="description">
            {r.status === "draft"
              ? "Launch when you’re ready, then share the viewer link on stream."
              : r.status === "open"
                ? "Entries arrive privately. Close submissions to start the review."
                : r.status === "paused"
                  ? "The timer is paused. Resume when you’re ready."
                  : r.status === "completed"
                    ? "Your winner is saved. Export their creation and start your next round."
                    : "Review the private queue. Approve finalists before bringing them on air."}
          </p>
          <div className="round-controls">
            {r.status === "draft" && (
              <button
                className="button"
                disabled={!!busy}
                onClick={() => act("launch")}
              >
                <Play size={16} fill="currentColor" /> Launch round
              </button>
            )}
            {r.status === "open" && (
              <>
                <button
                  className="button secondary"
                  disabled={!!busy}
                  onClick={() => act("pause")}
                >
                  <Pause size={15} /> Pause
                </button>
                <button
                  className="button dark"
                  disabled={!!busy}
                  onClick={() => act("close")}
                >
                  <Square size={13} /> Close & review
                </button>
              </>
            )}
            {r.status === "paused" && (
              <>
                <button
                  className="button"
                  disabled={!!busy}
                  onClick={() => act("resume")}
                >
                  <Play size={16} /> Resume round
                </button>
                <button
                  className="button secondary"
                  disabled={!!busy}
                  onClick={() => act("close")}
                >
                  Close submissions
                </button>
              </>
            )}
            {["closed", "revealing"].includes(r.status) && (
              <a className="button" href={`/creator/review/${id}`}>
                <ShieldCheck size={17} /> Review finalist queue{" "}
                <ArrowRight size={16} />
              </a>
            )}
            {r.status === "completed" && (
              <a className="button" href={`/creator/results/${id}`}>
                <Trophy size={17} /> View results & export
              </a>
            )}
          </div>
          <div className="share-box">
            <QR value={link} />
            <div>
              <strong>Invite your community</strong>
              <code>{link}</code>
              <CopyButton value={link} label="Copy viewer link" />
              <a
                className="text-link"
                style={{ marginLeft: 10 }}
                href={`/r/${id}`}
                target="_blank"
                rel="noreferrer"
              >
                Open <ArrowUpRight size={12} />
              </a>
            </div>
          </div>
          <div className="hint" style={{ marginTop: 18 }}>
            <ShieldCheck size={16} />
            <span>
              No viewer login required. Each guest cookie can submit 3 entries.
              Only creator-approved, revealed entries appear publicly.
            </span>
          </div>
          <div className="rule" />
          <div className="row wrap">
            <a className="text-link" href={`/creator/overlay?round=${id}`}>
              <MonitorPlay size={15} /> Set up OBS overlay{" "}
              <ArrowRight size={13} />
            </a>
            <button
              className="button secondary small"
              disabled={
                !!busy ||
                data.entries.some((e) => !!e.synthetic) ||
                !["draft", "open", "paused", "closed"].includes(r.status)
              }
              onClick={() => act("seed")}
            >
              <FlaskConical size={14} /> Add 6 demo entries
            </button>
          </div>
          <span className="tiny" style={{ marginTop: 13 }}>
            Demo entries are clearly labeled synthetic. Real participation
            counts stay separate.
          </span>
        </section>
      </div>
      <section className="card entries-activity">
        <div className="card-header">
          <h3>Incoming creations</h3>
          <span>{data.entries.length} total · private queue</span>
        </div>
        {!data.entries.length ? (
          <div className="empty-state" style={{ minHeight: 160, padding: 25 }}>
            <Users size={24} />
            <h3>The stage is set.</h3>
            <p>Share your participation link and wait for the first take.</p>
          </div>
        ) : (
          data.entries
            .slice(-8)
            .reverse()
            .map((e) => (
              <div className="activity-row" key={e.id}>
                <span className="avatar">
                  {e.nickname.slice(0, 2).toUpperCase()}
                </span>
                <div className="activity-text">
                  <strong>{e.headline}</strong>
                  <small>
                    @{e.nickname} · {getPreset(e.mode).name}
                    {e.synthetic ? " · SYNTHETIC DEMO" : ""}
                  </small>
                </div>
                <span>{e.status}</span>
              </div>
            ))
        )}
      </section>
    </>
  );
}
export function Review({ id, config }: { id: string; config: Me["config"] }) {
  const { data, error, loading, refresh } = useRound(id);
  const { busy, act } = useAction(id, refresh);
  const [filter, setFilter] = useState("all"),
    [preview, setPreview] = useState<Entry | null>(null);
  if (loading && !data) return <Loading />;
  if (!data) return <ErrorState message={error} retry={refresh} />;
  if (!data.owner)
    return <ErrorState message="This queue is private to the creator." />;
  const r = data.round;
  const canReview = ["closed", "revealing"].includes(r.status);
  const approved = data.entries.filter((e) => e.status === "approved");
  const visible = data.entries.filter(
    (e) =>
      filter === "all" ||
      (filter === "suggested" && e.suggested) ||
      (filter === "flagged" && e.reason?.startsWith("Flagged")) ||
      filter === e.status,
  );
  const onAir = data.entries.find((e) => e.id === r.revealId);
  return (
    <>
      <PageHeading
        eyebrow="REVIEW → REVEAL"
        title="Find your next crowd favorite."
        description="A shortlist helps you decide. You control exactly what appears on stream."
      >
        <a className="button secondary small" href={`/creator/rounds/${id}`}>
          Back to round
        </a>
      </PageHeading>
      {error && <ConnectionBanner message={error} />}
      <section className="card">
        <div className="row queue-summary">
          <div>
            <h3>Finalist queue</h3>
            <p>
              {data.entries.filter((e) => !e.synthetic).length} real entries ·{" "}
              {data.entries.filter((e) => !!e.synthetic).length} synthetic ·{" "}
              {approved.length} approved
            </p>
          </div>
          <Status round={r} />
        </div>
        {!canReview && (
          <div className="hint warning" style={{ marginBottom: 20 }}>
            <Info size={17} />
            <span>
              {r.status === "completed"
                ? "This round is complete. The winner is saved in results."
                : "Close submissions before moderating and shortlisting. No entry is on-air automatically."}
              {["open", "paused"].includes(r.status) && (
                <button
                  className="text-link"
                  style={{ marginLeft: 8 }}
                  disabled={!!busy}
                  onClick={() => act("close")}
                >
                  Close submissions →
                </button>
              )}
            </span>
          </div>
        )}
        <div className="queue-toolbar">
          <div>
            {["all", "suggested", "approved", "flagged", "rejected"].map(
              (f) => (
                <button
                  className={`filter-pill ${filter === f ? "selected" : ""}`}
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "9px 12px",
                    textTransform: "capitalize",
                    fontSize: 10,
                  }}
                >
                  {f === "all" ? "All entries" : f}
                </button>
              ),
            )}
          </div>
          <div>
            <button
              className="button secondary small"
              disabled={!!busy || !canReview || !data.entries.length}
              onClick={() => act("shortlist", { useAI: false })}
            >
              Rule-based shortlist
            </button>
            <button
              className="button small"
              disabled={
                !!busy ||
                !canReview ||
                !config.geminiReady ||
                r.aiCalls >= 2 ||
                !data.entries.length
              }
              title={
                !config.geminiReady
                  ? "Configure a free-tier Gemini key in Connections"
                  : "At most 2 requests per round"
              }
              onClick={() => act("shortlist", { useAI: true })}
            >
              {busy.startsWith("shortlist") ? (
                <LoaderCircle className="spin" size={14} />
              ) : (
                <Sparkles size={14} />
              )}{" "}
              Gemini shortlist
            </button>
          </div>
        </div>
        {r.shortlistNote && (
          <div className="hint" style={{ margin: "18px 0" }}>
            <Info size={16} />
            <span>
              <strong>
                {r.shortlistSource === "gemini"
                  ? "GEMINI ASSISTED"
                  : "RULE-BASED / NO AI"}
              </strong>
              <br />
              {r.shortlistNote}
            </span>
          </div>
        )}
        {!config.geminiReady && (
          <span className="tiny" style={{ marginBottom: 10 }}>
            Gemini is not configured. Manual review and rule-based variety picks
            are available.
          </span>
        )}
        {visible.length ? (
          visible.map((e, i) => (
            <div className={`entry-row ${e.status}`} key={e.id}>
              <span className="entry-rank">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="entry-thumb">
                {r.clipType === "scene" ? (
                  <img src="/images/skyfall.svg" alt="" />
                ) : (
                  getPreset(e.mode).icon
                )}
              </span>
              <div className="entry-copy">
                <strong>{e.headline}</strong>
                <small>
                  @{e.nickname}
                  <span>·</span>
                  {getPreset(e.mode).name}
                  {!!e.synthetic && (
                    <span
                      className="tag amber"
                      style={{ fontSize: 7, padding: "2px 5px" }}
                    >
                      SYNTHETIC DEMO
                    </span>
                  )}
                  {!!e.suggested && (
                    <span className="entry-suggested">
                      <Sparkles size={10} /> SUGGESTED
                    </span>
                  )}
                </small>
                {e.reason && <p className="entry-reason">{e.reason}</p>}
              </div>
              <div className="entry-actions">
                <button
                  className="button secondary small"
                  onClick={() => setPreview(e)}
                >
                  <Eye size={12} /> Preview
                </button>
                {e.status !== "approved" ? (
                  <button
                    className="button soft small"
                    disabled={!!busy || !canReview}
                    onClick={() => act("approve", { entryId: e.id })}
                  >
                    Approve <Check size={12} />
                  </button>
                ) : (
                  <>
                    <button
                      className="button soft small"
                      disabled={!!busy || !canReview}
                      onClick={() => act("reveal", { entryId: e.id })}
                    >
                      <MonitorPlay size={12} /> Reveal
                    </button>
                    <button
                      className="button small"
                      disabled={!!busy || !canReview}
                      onClick={() => act("winner", { entryId: e.id })}
                    >
                      <Trophy size={12} /> Crown
                    </button>
                  </>
                )}
                {e.status !== "rejected" && (
                  <button
                    className="button danger small"
                    aria-label={`Reject entry by ${e.nickname}`}
                    disabled={!!busy || !canReview}
                    onClick={() => act("reject", { entryId: e.id })}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state" style={{ minHeight: 220 }}>
            <ShieldCheck size={28} />
            <h3>
              {data.entries.length
                ? "No entries in this view."
                : "Your queue is waiting."}
            </h3>
            <p>
              {data.entries.length
                ? "Choose another filter to review more creations."
                : "Collect real entries or add labeled synthetic entries from the round manager."}
            </p>
          </div>
        )}
        <div className="row wrap" style={{ marginTop: 20 }}>
          <span className="tiny">
            Suggestions are subjective. Preview and review safety before
            approving.
          </span>
          <a
            className="button secondary small"
            href={`/overlay/${id}?preview=1`}
            target="_blank"
            rel="noreferrer"
          >
            Open live overlay <ArrowUpRight size={13} />
          </a>
        </div>
      </section>
      <div className="review-bottom">
        <section className="card broadcast-control">
          <div className="row">
            <h3>Currently on the overlay</h3>
            {onAir && <span className="tag green">ON AIR</span>}
          </div>
          <p>
            {onAir
              ? "This approved creation is visible on your broadcast overlay."
              : "Your overlay shows the participation prompt. Reveal an approved entry when you’re ready."}
          </p>
          {onAir ? (
            <>
              <Creation
                mode={onAir.mode}
                headline={onAir.headline}
                detail={onAir.detail}
                nickname={onAir.nickname}
                synthetic={onAir.synthetic}
                scene={r.clipType === "scene"}
              />
              <button
                className="button secondary small"
                style={{ marginTop: 16 }}
                disabled={!!busy}
                onClick={() => act("hide")}
              >
                Hide from overlay
              </button>
            </>
          ) : (
            <a
              className="button secondary small"
              href={`/creator/overlay?round=${id}`}
            >
              Configure OBS <ArrowRight size={13} />
            </a>
          )}
        </section>
        <section className="card review-privacy">
          <ShieldCheck size={31} />
          <h3>Private until you say otherwise.</h3>
          <p>
            Approval makes an entry eligible. Reveal puts it on the stream.
            Crown selects your winner. Each is a deliberate creator action.
          </p>
          <span className="tag">THE CREATOR IS ALWAYS THE FINAL JUDGE</span>
          {r.status === "completed" && (
            <a
              className="button"
              style={{ marginTop: 20 }}
              href={`/creator/results/${id}`}
            >
              View winner & export <ArrowRight size={15} />
            </a>
          )}
        </section>
      </div>
      {preview && (
        <div className="modal-backdrop" onClick={() => setPreview(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Private creation preview"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setPreview(null);
            }}
          >
            <button
              className="modal-close"
              aria-label="Close preview"
              autoFocus
              onClick={() => setPreview(null)}
            >
              <X size={18} />
            </button>
            <div className="eyebrow">PRIVATE PREVIEW</div>
            <h2>
              @{preview.nickname}
              {preview.synthetic ? " · Synthetic demo" : ""}
            </h2>
            <p className="muted">{getPreset(preview.mode).name}</p>
            <Creation
              mode={preview.mode}
              headline={preview.headline}
              detail={preview.detail}
              nickname={preview.nickname}
              synthetic={preview.synthetic}
              scene={r.clipType === "scene"}
            />
            <div className="row" style={{ marginTop: 20 }}>
              <span className="tiny">
                Check for harassment, misleading claims, and private
                information.
              </span>
              {canReview && preview.status !== "approved" && (
                <button
                  className="button small"
                  disabled={!!busy}
                  onClick={async () => {
                    await act("approve", { entryId: preview.id });
                    setPreview(null);
                  }}
                >
                  Approve <Check size={14} />
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
export function Results({ rounds, id }: { rounds: Round[]; id?: string }) {
  const resolved = id ?? rounds.find((r) => r.status === "completed")?.id;
  return resolved ? (
    <ResultDetail id={resolved} />
  ) : (
    <RoundList rounds={rounds} completed />
  );
}
function ResultDetail({ id }: { id: string }) {
  const { data, error, loading, refresh } = useRound(id);
  const origin = useOrigin();
  if (loading && !data) return <Loading />;
  if (!data) return <ErrorState message={error} retry={refresh} />;
  const r = data.round,
    winner = data.entries.find((e) => e.id === r.winnerId);
  if (!winner)
    return (
      <>
        <PageHeading
          eyebrow="RESULTS"
          title="The best take is still out there."
          description="Crown a winner after reviewing the finalist queue."
        />
        <a className="button" href={`/creator/review/${id}`}>
          Review this round <ArrowRight size={16} />
        </a>
      </>
    );
  const others = data.entries.filter(
    (e) => e.status === "approved" && e.id !== winner.id,
  );
  return (
    <>
      <PageHeading
        eyebrow="CREATIVE ROUND COMPLETE"
        title="A new highlight was born."
        description={`${r.title} · ${r.creatorName ?? "Your community"} · ${r.realCount ?? 0} real submissions · ${(r.count ?? 0) - (r.realCount ?? 0)} demo entries`}
      >
        <CopyButton value={origin + "/r/" + id} label="Share result" />
        <ExportButton entry={winner} round={r} />
      </PageHeading>
      {error && <ConnectionBanner message={error} />}
      <div className="results-grid">
        <section className="card results-card">
          <div className="card-header">
            <h3>The winning creation</h3>
            <span className="tag amber">
              <Trophy size={12} /> CREATOR’S PICK
            </span>
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
            <strong>@{winner.nickname}</strong>
            {!!winner.synthetic && (
              <span className="tag amber">SYNTHETIC DEMO</span>
            )}
            <span>Shareable PNG · 1920 × 1080</span>
          </div>
        </section>
        <section className="card">
          <h3>Other brilliant takes</h3>
          <p className="description" style={{ marginTop: 9 }}>
            Approved creations from this round’s private queue.
          </p>
          {others.length ? (
            others.map((e, i) => (
              <div className="result-other" key={e.id}>
                <span>{String(i + 2).padStart(2, "0")}</span>
                <div>
                  <strong>{e.headline}</strong>
                  <small>
                    @{e.nickname} · {getPreset(e.mode).name}
                    {e.synthetic ? " · SYNTHETIC DEMO" : ""}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <div
              className="empty-state"
              style={{ minHeight: 160, padding: 20 }}
            >
              <Trophy size={23} />
              <p>This round had one approved winner.</p>
            </div>
          )}
          {data.owner && (
            <a
              className="button soft full small"
              style={{ marginTop: 20 }}
              href={`/api/rounds/${id}/export`}
              download
            >
              <Download size={14} /> Export round data (JSON)
            </a>
          )}
        </section>
      </div>
      <div className="results-next">
        <span>Ready to give the next moment a whole new story?</span>
        <div className="row">
          <a
            href={`/reveal/${id}`}
            className="button secondary small"
            target="_blank"
            rel="noreferrer"
          >
            Open winner reveal <ArrowUpRight size={13} />
          </a>
          <a href="/creator/new" className="button dark small">
            <Plus size={14} /> Start another round
          </a>
        </div>
      </div>
    </>
  );
}
export function OverlaySetup({ rounds }: { rounds: Round[] }) {
  const [selected, setSelected] = useState(rounds[0]?.id ?? "");
  const origin = useOrigin();
  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get("round");
    if (from && rounds.some((r) => r.id === from)) setSelected(from);
  }, [rounds]);
  const r = rounds.find((r) => r.id === selected);
  if (!r)
    return (
      <>
        <PageHeading
          eyebrow="BROADCAST READY"
          title="Your stream, with a little more showtime."
          description="A transparent OBS browser source that stays in sync with your round."
        />
        <div className="card empty-state">
          <MonitorPlay size={32} />
          <h3>Give your overlay a round.</h3>
          <p>Create a round, then add its browser-source URL to OBS.</p>
          <a className="button" href="/creator/new">
            Create a round <ArrowRight size={16} />
          </a>
        </div>
      </>
    );
  const link = origin + "/overlay/" + r.id;
  return (
    <>
      <PageHeading
        eyebrow="OBS BROWSER SOURCE"
        title="Bring the show to your stream."
        description="One source. Live participation. Creator-controlled reveals."
      >
        <a
          className="button secondary small"
          href={link + "?preview=1"}
          target="_blank"
          rel="noreferrer"
        >
          <MonitorPlay size={14} /> Open overlay preview{" "}
          <ArrowUpRight size={13} />
        </a>
      </PageHeading>
      <div className="overlay-config">
        <section className="card">
          <div className="card-header">
            <h3>Overlay configuration</h3>
            <span className="tag green">READ ONLY</span>
          </div>
          <label>
            Choose a round
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {rounds.map((r) => (
                <option value={r.id} key={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </label>
          <div className="subheading">OBS browser-source URL</div>
          <div className="settings-code">{link}</div>
          <div className="row" style={{ marginTop: 14 }}>
            <CopyButton value={link} label="Copy source URL" />
            <a className="text-link" href={`/creator/review/${r.id}`}>
              Reveal controls <ArrowRight size={13} />
            </a>
          </div>
          <div className="settings-item">
            <strong>Width / height</strong>
            <span>1920 × 1080</span>
          </div>
          <div className="settings-item">
            <strong>Frame rate</strong>
            <span>30 FPS</span>
          </div>
          <div className="settings-item">
            <strong>Background</strong>
            <span>Transparent until reveal</span>
          </div>
          <div className="settings-item">
            <strong>Synchronization</strong>
            <span>2-second polling · automatic retry</span>
          </div>
          <div className="hint" style={{ marginTop: 19 }}>
            <Info size={16} />
            <span>
              Keep the source active when hidden so it stays synchronized. URLs
              are read-only and show only the public prompt and the creation you
              explicitly reveal. No Twitch credentials or creator controls are
              exposed.
            </span>
          </div>
        </section>
        <section className="card">
          <h3>Set it up in OBS</h3>
          <ol className="setup-checklist">
            <li>
              Add a <strong>Browser</strong> source to your scene.
            </li>
            <li>
              Paste the browser-source URL. Set the size to{" "}
              <strong>1920 × 1080</strong>.
            </li>
            <li>
              Place it above your gameplay source. The normal prompt leaves your
              game visible.
            </li>
            <li>
              Open <strong>Finalist review</strong> in LIVE CUT. Approve a
              creation, then click <strong>Reveal</strong> or{" "}
              <strong>Crown</strong>.
            </li>
            <li>
              Return to playing. Viewers can submit through the QR code or
              participation URL.
            </li>
          </ol>
          <div className="overlay-sample">
            <div>▶ LIVE CUT · CREATIVE ROUND</div>
            <aside>
              <span>YOUR COMMUNITY’S TAKE</span>
              <b>{r.title}</b>
              <strong>03:00</strong>
              <span>Join the round ↗</span>
            </aside>
          </div>
          <span className="tiny" style={{ marginTop: 13 }}>
            Illustrative placement. Open overlay preview for the actual
            synchronized source.
          </span>
        </section>
      </div>
    </>
  );
}
