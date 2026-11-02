"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Clapperboard,
  Film,
  LayoutDashboard,
  Radio,
  Layers,
  Scissors,
  Settings,
  MonitorPlay,
  Trophy,
  Plus,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  LogOut,
  Link as LinkIcon,
  Info,
  Keyboard,
  Play,
  FlaskConical,
} from "lucide-react";
import {
  api,
  notify,
  usePolling,
  Brand,
  Toasts,
  Loading,
  ErrorState,
  Status,
  Clock,
  ConnectionBanner,
} from "./common";
import { Moment } from "./creation";
import { Library } from "./library";
import { NewRound } from "./round-form";
import { RoundManager, Review, Results, OverlaySetup } from "./round-panels";
import { getPreset } from "@/lib/presets";
import type { Creator, Round } from "@/lib/types";
export type Me = {
  user: Creator | null;
  rounds: Round[];
  config: {
    twitchReady: boolean;
    geminiReady: boolean;
    model: string;
    uploadReady: boolean;
    callbackUrl: string;
  };
};
const nav = [
  { id: "", label: "Overview", icon: LayoutDashboard, path: "/creator" },
  { id: "rounds", label: "Live rounds", icon: Radio, path: "/creator/rounds" },
  {
    id: "library",
    label: "Creative library",
    icon: Layers,
    path: "/creator/library",
  },
  { id: "clips", label: "Moments & clips", icon: Film, path: "/creator/clips" },
  {
    id: "results",
    label: "Results & winners",
    icon: Trophy,
    path: "/creator/results",
  },
  {
    id: "overlay",
    label: "Stream overlay",
    icon: MonitorPlay,
    path: "/creator/overlay",
  },
  {
    id: "settings",
    label: "Connections",
    icon: Settings,
    path: "/creator/settings",
  },
];
export function CreatorWorkspace({ section = [] }: { section?: string[] }) {
  const { data, error, loading, refresh } = usePolling<Me>("/api/me", 5000);
  const [busy, setBusy] = useState(false);
  const current = section[0] ?? "";
  const id = section[1] ?? data?.rounds[0]?.id;
  async function rehearse() {
    setBusy(true);
    try {
      await api("/api/demo", {});
      await refresh();
      notify("Rehearsal workspace created. Twitch is not connected.");
    } catch (e) {
      notify((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }
  const user = data?.user;
  const active =
    current === "new" ? "clips" : current === "review" ? "rounds" : current;
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Brand light />
        <div className="sidebar-label">CREATOR WORKSPACE</div>
        <nav aria-label="Creator navigation">
          {nav.map((n) => (
            <a
              href={n.path}
              key={n.id}
              className={active === n.id ? "active" : ""}
              aria-current={active === n.id ? "page" : undefined}
            >
              <n.icon size={17} />
              {n.label}
              {n.id === "library" && <span className="nav-count">50</span>}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div
            className={`connection ${user && !user.demo ? "connected" : ""}`}
          >
            <span className="status-dot" />
            {user
              ? user.demo
                ? "Rehearsal workspace"
                : "Twitch authorized"
              : "Twitch disconnected"}
          </div>
          <div className="sidebar-user">
            <span className="avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt="" />
              ) : (
                user?.name.slice(0, 2).toUpperCase() || "LC"
              )}
            </span>
            <div>
              <strong>{user?.name ?? "Your channel"}</strong>
              <small>
                {user?.demo ? "DEMO / NO TWITCH CONNECTION" : "CREATOR STUDIO"}
              </small>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-topbar">
          <span className="crumb">
            Workspace <ChevronRight size={12} />{" "}
            <strong>
              {current === "review"
                ? "Finalist review"
                : current === "new"
                  ? "New round"
                  : (nav.find((n) => n.id === current)?.label ?? "Overview")}
            </strong>
          </span>
          <div className="topbar-actions">
            <a href="/game" target="_blank" rel="noreferrer">
              <Play size={12} /> Skyfall game
            </a>
            <a href="/" aria-label="Open public site">
              <ExternalLink size={12} /> Public site
            </a>
            <span className="avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt="" />
              ) : (
                user?.name.slice(0, 2).toUpperCase() || "LC"
              )}
            </span>
          </div>
        </header>
        <main className="workspace-main">
          {loading && !data ? (
            <Loading />
          ) : !data ? (
            <ErrorState message={error} retry={refresh} />
          ) : (
            <>
              {error && <ConnectionBanner message={error} />}{" "}
              {!!user?.demo && (
                <div className="rehearsal-banner">
                  <FlaskConical size={14} />
                  <span>
                    Rehearsal mode. No Twitch channel is connected. Synthetic
                    entries are labeled.
                  </span>
                  <a href="/api/auth/twitch">Connect Twitch ↗</a>
                </div>
              )}
              {current === "settings" ? (
                <Connections data={data} refresh={refresh} />
              ) : current === "library" ? (
                <>
                  <PageHeading
                    eyebrow="THE CREATIVE LIBRARY"
                    title="One moment. Fifty different stories."
                    description="Six visual renderers. Fifty personalities. Every one ready for your community."
                  />
                  <Library />
                </>
              ) : !user ? (
                <>
                  <PageHeading
                    eyebrow="YOUR CREATOR WORKSPACE"
                    title="Your show, upgraded."
                    description="Capture the moment. Your audience does the creative work."
                  />
                  <section className="setup-hero">
                    <div className="setup-icon">
                      <Radio size={31} />
                    </div>
                    <div className="eyebrow">LET’S MAKE SOMETHING LIVE</div>
                    <h2>The moment starts with you.</h2>
                    <p>
                      Connect your Twitch channel to capture real clips and run
                      your show. Or explore the complete workflow in a clearly
                      labeled rehearsal.
                    </p>
                    <div className="hero-actions">
                      <a className="button" href="/api/auth/twitch">
                        Connect Twitch <ArrowUpRight size={17} />
                      </a>
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={rehearse}
                      >
                        {busy ? "Creating workspace…" : "Start a rehearsal"}
                      </button>
                    </div>
                    {!data.config.twitchReady && (
                      <div className="hint">
                        <Info size={17} />
                        <span>
                          Twitch OAuth needs developer credentials.{" "}
                          <a className="text-link" href="/creator/settings">
                            View setup instructions →
                          </a>
                        </span>
                      </div>
                    )}
                    <span className="tiny">
                      <ShieldCheck size={13} /> Viewers never need an account to
                      participate.
                    </span>
                  </section>
                </>
              ) : current === "new" || current === "clips" ? (
                <NewRound data={data} />
              ) : current === "review" && id ? (
                <Review id={id} config={data.config} />
              ) : current === "rounds" && section[1] ? (
                <RoundManager id={id!} />
              ) : current === "rounds" ? (
                <RoundList rounds={data.rounds} />
              ) : current === "results" ? (
                <Results rounds={data.rounds} id={section[1]} />
              ) : current === "overlay" ? (
                <OverlaySetup rounds={data.rounds} />
              ) : (
                <Dashboard data={data} />
              )}
            </>
          )}
        </main>
      </div>
      <Toasts />
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  );
}
function Dashboard({ data }: { data: Me }) {
  const [mode, setMode] = useState("breaking-news");
  const [showStream, setShowStream] = useState(false);
  const r =
    data.rounds.find((r) =>
      ["open", "paused", "draft", "closed", "revealing"].includes(r.status),
    ) ?? data.rounds[0];
  const { data: stream } = usePolling<{
    connected: boolean;
    live: boolean;
    channel: string;
    stream: { title: string; game_name: string } | null;
  }>(data.user && !data.user.demo ? "/api/twitch/status" : null, 30000);
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === "KeyC") {
        e.preventDefault();
        window.location.href = "/creator/new";
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  return (
    <>
      <PageHeading
        eyebrow="CREATOR WORKSPACE"
        title="Your show, upgraded."
        description="Capture the moment. Your audience does the creative work."
      >
        <span className={`tag ${stream?.live ? "green" : ""}`}>
          <span className="status-dot" />
          {data.user?.demo
            ? "REHEARSAL"
            : stream?.live
              ? "LIVE ON TWITCH"
              : stream
                ? "CHANNEL OFFLINE"
                : "CHECKING TWITCH…"}
        </span>
      </PageHeading>
      <div className="dashboard-grid">
        <section className="card">
          <div className="card-header">
            <h3>
              {showStream ? "Your Twitch channel" : "Your next great moment"}
            </h3>
            <span>
              {r ? getPreset(r.mode).name : "Skyfall · original scene"}
            </span>
          </div>
          {showStream && data.user && !data.user.demo ? (
            <StreamFrame channel={data.user.login} />
          ) : (
            <Moment
              round={
                r ?? {
                  clipType: "scene",
                  clipUrl: "/images/skyfall.svg",
                  context: "A heroic rescue goes very, very wrong.",
                }
              }
            />
          )}
          <div className="moment-footer">
            <span>
              {r
                ? r.title
                : "An original scene, ready for your first rehearsal."}
            </span>
            {data.user && !data.user.demo ? (
              <button
                className="button secondary small"
                onClick={() => setShowStream(!showStream)}
              >
                {showStream ? "Show selected moment" : "View Twitch stream"}
              </button>
            ) : (
              <a className="button secondary small" href="/creator/clips">
                Select moment <ArrowRight size={13} />
              </a>
            )}
          </div>
          {stream?.stream && (
            <div className="tiny" style={{ marginTop: 13 }}>
              <Radio size={12} />
              {stream.stream.title} · {stream.stream.game_name}
            </div>
          )}
        </section>
        <section className="card launch-card">
          <div className="card-header">
            <h3>Start a creative round</h3>
            <span className="tag">YOUR NEXT SHOW</span>
          </div>
          <p className="description">
            Pick a format. Share the moment. Let the community surprise you.
          </p>
          <div className="mode-grid">
            {[
              "breaking-news",
              "funny-caption",
              "movie-trailer",
              "open-remix",
              "sports-commentary",
              "more",
            ].map((id) =>
              id === "more" ? (
                <a
                  href="/creator/library"
                  key={id}
                  className="mode-button more"
                >
                  <span className="emoji">▦</span>All 50 formats
                </a>
              ) : (
                <button
                  className={`mode-button ${mode === id ? "selected" : ""}`}
                  key={id}
                  onClick={() => setMode(id)}
                  aria-pressed={mode === id}
                >
                  <span className="emoji">
                    {id === "open-remix" ? "✦" : getPreset(id).icon}
                  </span>
                  {id === "open-remix" ? "Open Remix" : getPreset(id).name}
                </button>
              ),
            )}
          </div>
          <a className="button full" href={`/creator/new?mode=${mode}`}>
            <Scissors size={17} /> Capture a moment & create round{" "}
            <ArrowRight size={15} />
          </a>
          <span className="tiny">
            <Keyboard size={11} /> Ctrl + Shift + C · No always-on AI
          </span>
        </section>
      </div>
      <div className="dashboard-bottom">
        {r ? (
          <section className="card current-round-card">
            <div className="row">
              <div>
                <h3>{r.title}</h3>
                <p className="tiny" style={{ marginTop: 6 }}>
                  {r.mode === "open-remix"
                    ? "All creative formats"
                    : getPreset(r.mode).name}
                </p>
              </div>
              <Status round={r} />
            </div>
            <div className="stats-row">
              <div className="stat-group">
                <span className="number">{r.realCount ?? 0}</span>
                <span>real entries</span>
              </div>
              <div className="stat-group">
                <span className="number">
                  <Clock round={r} />
                </span>
                <span>remaining</span>
              </div>
              <a className="button soft small" href={`/creator/rounds/${r.id}`}>
                Manage round <ArrowRight size={12} />
              </a>
            </div>
            <div className="progress">
              <div
                style={{
                  width:
                    r.status === "completed"
                      ? "100%"
                      : `${Math.min(100, ((r.count ?? 0) / r.limit) * 100)}%`,
                }}
              />
            </div>
            {(r.count ?? 0) > (r.realCount ?? 0) && (
              <span className="tiny" style={{ marginTop: 8 }}>
                {(r.count ?? 0) - (r.realCount ?? 0)} synthetic demo entries
                also included
              </span>
            )}
          </section>
        ) : (
          <section className="card current-round-card">
            <div className="next-icon">
              <Clapperboard size={20} />
            </div>
            <h3>Your first round is waiting.</h3>
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              A clip, a creative prompt, and your community. That’s all it
              takes.
            </p>
            <a
              className="text-link"
              style={{ marginTop: 16 }}
              href="/creator/new"
            >
              Create your first round <ArrowRight size={15} />
            </a>
          </section>
        )}
        <section className="card next-card">
          <div className="next-icon">
            <ShieldCheck size={20} />
          </div>
          <h3>You’re always the final judge.</h3>
          <p>
            Entries arrive privately. Gemini can help you shortlist after
            submissions close. You approve every finalist before anything goes
            on stream.
          </p>
          <a
            className="button secondary small"
            href={r ? `/creator/review/${r.id}` : "/creator/settings"}
          >
            {r ? "Review the finalist queue" : "View moderation setup"}
            <ArrowRight size={14} />
          </a>
        </section>
      </div>
      <div className="workflow-strip">
        <span className="active">
          <Scissors size={12} /> CAPTURE
        </span>
        <b>→</b>
        <span>
          <Radio size={12} /> LAUNCH
        </span>
        <b>→</b>
        <span>
          <ShieldCheck size={12} /> REVIEW
        </span>
        <b>→</b>
        <span>
          <Trophy size={12} /> REVEAL
        </span>
      </div>
    </>
  );
}
function StreamFrame({ channel }: { channel: string }) {
  const [host, setHost] = useState("");
  useEffect(() => setHost(window.location.hostname), []);
  return host ? (
    <iframe
      title="Your real Twitch stream"
      className="stream-preview-frame"
      src={`https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(host)}&muted=true&autoplay=false`}
      allowFullScreen
    />
  ) : null;
}
export function RoundList({
  rounds,
  completed = false,
}: {
  rounds: Round[];
  completed?: boolean;
}) {
  const list = completed
    ? rounds.filter((r) => r.status === "completed")
    : rounds;
  return (
    <>
      <PageHeading
        eyebrow={completed ? "YOUR COMMUNITY’S HIGHLIGHTS" : "THE SHOW GOES ON"}
        title={completed ? "Moments worth keeping." : "Your live rounds."}
        description={
          completed
            ? "Creator-selected winners and the brilliant takes that got them there."
            : "Launch a round, keep playing, and come back for the reveal."
        }
      >
        <a className="button small" href="/creator/new">
          <Plus size={15} /> New round
        </a>
      </PageHeading>
      {list.length ? (
        <div className="round-list">
          {list.map((r) => (
            <div className="round-list-item" key={r.id}>
              <span className="list-icon">
                {r.status === "completed" ? (
                  <Trophy size={21} />
                ) : (
                  <Radio size={21} />
                )}
              </span>
              <div className="list-copy">
                <h3>{r.title}</h3>
                <p>
                  {r.mode === "open-remix"
                    ? "Open Remix"
                    : getPreset(r.mode).name}{" "}
                  · {r.realCount ?? 0} real entries ·{" "}
                  {(r.count ?? 0) - (r.realCount ?? 0)} demo ·{" "}
                  {new Date(r.created).toLocaleDateString("en-GB")}
                </p>
              </div>
              <Status round={r} />
              <a
                className="button secondary small"
                href={
                  r.status === "completed"
                    ? `/creator/results/${r.id}`
                    : `/creator/rounds/${r.id}`
                }
              >
                {r.status === "completed" ? "View results" : "Manage"}
                <ArrowRight size={13} />
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="card empty-state">
          <Trophy size={31} />
          <h3>
            {completed
              ? "The spotlight is waiting."
              : "Your first round starts here."}
          </h3>
          <p>
            {completed
              ? "Complete a round and crown a winner. Their creation will live here."
              : "Pick a moment and give your community something to create."}
          </p>
          <a className="button" href="/creator/new">
            Create a round <ArrowRight size={16} />
          </a>
        </div>
      )}
    </>
  );
}
function Connections({
  data,
  refresh,
}: {
  data: Me;
  refresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [oauthError, setOauthError] = useState("");
  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get("error");
    if (err)
      setOauthError(
        err === "oauth_denied"
          ? "Twitch authorization was canceled. You can reconnect when ready."
          : "Twitch credentials are not configured. Follow the setup steps below.",
      );
  }, []);
  return (
    <>
      <PageHeading
        eyebrow="CONNECTIONS & SETUP"
        title="Ready when you are."
        description="Real connections. Clear status. You control what goes live."
      />
      {oauthError && <div className="inline-error">{oauthError}</div>}
      <div className="settings-grid">
        <section className="card">
          <h3>
            <Radio size={19} /> Twitch channel
          </h3>
          <p>
            Server-side OAuth with the minimum clip permission. Tokens stay
            encrypted on the server.
          </p>
          <div className="settings-item">
            <strong>Channel</strong>
            <span>
              {data.user && !data.user.demo
                ? "@" + data.user.login
                : "Not connected"}
            </span>
          </div>
          <div className="settings-item">
            <strong>Developer credentials</strong>
            <span
              className={`tag ${data.config.twitchReady ? "green" : "amber"}`}
            >
              {data.config.twitchReady ? "CONFIGURED" : "SETUP NEEDED"}
            </span>
          </div>
          <div className="settings-item">
            <strong>Requested scope</strong>
            <span>
              <code>clips:edit</code>
            </span>
          </div>
          <a href="/api/auth/twitch" className="button small">
            {data.user && !data.user.demo
              ? "Reconnect Twitch"
              : "Connect Twitch"}
            <ArrowUpRight size={15} />
          </a>
          {data.user && (
            <button
              className="button secondary small"
              style={{ marginLeft: 8 }}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("/api/logout", {});
                  await refresh();
                  notify("Signed out of this workspace.");
                } catch (e) {
                  notify((e as Error).message, "error");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <LogOut size={14} /> Sign out
            </button>
          )}
        </section>
        <section className="card">
          <h3>
            <Sparkles size={19} /> Gemini review assistant
          </h3>
          <p>
            Called only after entries close, when you request it. The creator
            always decides the winner.
          </p>
          <div className="settings-item">
            <strong>AI status</strong>
            <span
              className={`tag ${data.config.geminiReady ? "green" : "amber"}`}
            >
              {data.config.geminiReady ? "READY" : "MANUAL FALLBACK"}
            </span>
          </div>
          <div className="settings-item">
            <strong>Model</strong>
            <span>{data.config.model}</span>
          </div>
          <div className="settings-item">
            <strong>Request budget</strong>
            <span>2 calls / round · 250 entries max</span>
          </div>
          <div className="settings-item">
            <strong>Automatic retries</strong>
            <span>None · explicit retry uses remaining call</span>
          </div>
          <p className="tiny">
            Set GEMINI_API_KEY and GEMINI_FREE_TIER_CONFIRMED=true only for a
            verified free-tier project. The app cannot inspect your Google
            billing status.
          </p>
        </section>
        <section className="card settings-full">
          <h3>
            <Settings size={19} /> Twitch developer setup
          </h3>
          <ol className="setup-checklist">
            <li>
              Sign in at{" "}
              <a
                className="text-link"
                href="https://dev.twitch.tv/console/apps"
                target="_blank"
                rel="noreferrer"
              >
                dev.twitch.tv/console/apps <ExternalLink size={11} />
              </a>
              . Enable account 2FA. Register a <strong>Confidential</strong>{" "}
              application with category <strong>Website Integration</strong>.
            </li>
            <li>
              Add this exact OAuth redirect URI. Also add{" "}
              <strong>http://localhost:5173/api/auth/twitch/callback</strong>{" "}
              for local development.
            </li>
          </ol>
          <div className="settings-code">{data.config.callbackUrl}</div>
          <ol start={3} className="setup-checklist">
            <li>
              Set <strong>TWITCH_CLIENT_ID</strong>,{" "}
              <strong>TWITCH_CLIENT_SECRET</strong>, and a random{" "}
              <strong>SESSION_SECRET</strong> of at least 32 characters in your
              server environment. Set <strong>APP_URL</strong> to this app’s
              origin.
            </li>
            <li>
              For local development, copy <strong>.env.example</strong> to{" "}
              <strong>.env.local</strong>, fill in the values, run{" "}
              <strong>npm run env:sync</strong>, and restart the server. For
              production, configure the same keys as runtime environment
              variables.
            </li>
            <li>
              Click <strong>Connect Twitch</strong> and approve the clip
              permission. Start your stream manually in OBS. Stream status will
              then be checked against Twitch Helix.
            </li>
          </ol>
          <div className="hint">
            <ShieldCheck size={17} />
            <span>
              Twitch’s 202 Accepted response starts clip creation. LIVE CUT
              waits for Get Clips to confirm availability, up to 60 seconds. If
              clipping is disabled or the channel is offline, use a local
              MP4/WebM upload. No EventSub or chat permissions are needed for
              the current workflow.
            </span>
          </div>
        </section>
        <section className="card">
          <h3>
            <MonitorPlay size={19} /> Broadcast setup
          </h3>
          <p>
            Add a browser source in OBS with your round’s overlay URL. Use 1920
            × 1080. The page is transparent until you reveal a creation.
          </p>
          <a className="button secondary small" href="/creator/overlay">
            Configure stream overlay <ArrowRight size={14} />
          </a>
        </section>
        <section className="card">
          <h3>
            <LinkIcon size={19} /> Storage & guests
          </h3>
          <div className="settings-item">
            <strong>Persistent entries</strong>
            <span>Cloudflare D1</span>
          </div>
          <div className="settings-item">
            <strong>Clip uploads</strong>
            <span>
              {data.config.uploadReady
                ? "R2 available · 20 MB maximum"
                : "Unavailable"}
            </span>
          </div>
          <div className="settings-item">
            <strong>Guest allowance</strong>
            <span>3 entries / round / guest cookie</span>
          </div>
          <p>
            Guest identity is not verified. Cookie and IP limits discourage
            casual abuse; they cannot prove unique humans. All entries require
            creator review.
          </p>
        </section>
      </div>
    </>
  );
}
