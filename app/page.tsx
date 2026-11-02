"use client";
import {
  ArrowRight,
  ArrowUpRight,
  Clapperboard,
  Scissors,
  Sparkles,
  ShieldCheck,
  Trophy,
  Play,
  Radio,
} from "lucide-react";
import { Nav, Brand, api, notify, Toasts } from "@/components/common";
import { flagshipIds, getPreset } from "@/lib/presets";
import { useEffect, useState } from "react";
export default function Home() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [busy, setBusy] = useState(false);
  async function rehearse() {
    setBusy(true);
    try {
      await api("/api/demo", {});
      window.location.href = "/creator";
    } catch (e) {
      notify((e as Error).message, "error");
      setBusy(false);
    }
  }
  return (
    <>
      <Nav />
      <main className="landing">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow-pill">
              <span className="status-dot" /> THE NEXT GREAT MOMENT IS A GROUP
              PROJECT
            </div>
            <h1>
              You make the moment.
              <br />
              Your audience
              <br />
              <span>makes it legendary.</span>
            </h1>
            <p>
              That impossible save. That spectacular fail. Let your viewers turn
              it into headlines, memes and cinematic masterpieces. Then crown
              the best take, live.
            </p>
            <div className="hero-actions">
              <a className="button" href="/api/auth/twitch">
                <Radio size={19} /> Start with Twitch <ArrowUpRight size={17} />
              </a>
              <button
                className="button secondary"
                onClick={rehearse}
                disabled={busy || !ready}
              >
                <Play size={16} />
                {busy ? "Opening studio…" : "Try a rehearsal"}
              </button>
            </div>
            <div className="hero-fine">
              <span>
                <CheckIcon /> Free to try
              </span>
              <span>
                <CheckIcon /> No viewer login
              </span>
              <span>
                <CheckIcon /> Built for OBS
              </span>
            </div>
          </div>
          <div className="hero-stage">
            <div className="stage-orbit orbit-one" />
            <div className="stage-orbit orbit-two" />
            <div className="hero-moment">
              <img
                src="/images/skyfall.svg"
                alt="Original Skyfall illustration showing a hero’s spectacularly questionable leap"
              />
              <span className="live-chip">
                <span /> THE MOMENT
              </span>
              <div className="moment-caption">
                <span>SKYFALL / ORIGINAL SCENE</span>
                <a href="/game" aria-label="Play the original Skyfall game">
                  <Play size={15} fill="currentColor" /> PLAY THE SCENE
                </a>
              </div>
            </div>
            <div className="float-news">
              <div>
                <span /> BREAKING NEWS · PARODY
              </div>
              <strong>
                Local hero saves friend,
                <br />
                forgets gravity.
              </strong>
              <span className="float-credit">THE AUDIENCE’S TAKE ↗</span>
            </div>
            <div className="float-cinema">
              <span>A COMMUNITY PRODUCTION</span>
              <strong>
                THE LAST
                <br />
                <em>JUMP.</em>
              </strong>
              <small>ONE FRIEND. NO LANDING PLAN.</small>
            </div>
            <div className="float-caption">
              <span>💬</span>
              <div>
                <strong>“Rescue complete. Hero missing.”</strong>
                <small>A completely different take. Same moment.</small>
              </div>
            </div>
            <span className="stage-spark spark-one">✦</span>
            <span className="stage-spark spark-two">✧</span>
          </div>
        </section>
        <div className="manifesto-strip">
          <span>THE STREAM IS YOURS.</span>
          <strong>THE STORY BELONGS TO EVERYONE.</strong>
          <Sparkles size={22} />
        </div>
        <section className="landing-section" id="formats">
          <div className="section-head">
            <div>
              <div className="eyebrow">ONE MOMENT. ENDLESS PERSONALITY.</div>
              <h2>Fifty ways to steal the show.</h2>
            </div>
            <a className="text-link" href="/library">
              Explore the creative library <ArrowRight size={18} />
            </a>
          </div>
          <div className="flagship-grid">
            {flagshipIds.map((id) => {
              const p = getPreset(id);
              return (
                <a
                  href={`/library?mode=${id}`}
                  className={`format-feature ${p.renderer}`}
                  key={id}
                >
                  <span className="format-emoji">{p.icon}</span>
                  <h3>{p.name}</h3>
                  <p>{p.prompt}</p>
                  <span className="format-arrow">
                    <ArrowUpRight size={17} />
                  </span>
                </a>
              );
            })}
          </div>
        </section>
        <section className="how-section" id="how-it-works">
          <div className="section-head">
            <div>
              <div className="eyebrow">LESS TABBING. MORE STREAMING.</div>
              <h2>Four steps. One unforgettable reveal.</h2>
            </div>
            <p>
              You keep playing.
              <br />
              The community does the creative work.
            </p>
          </div>
          <div className="steps-grid">
            {[
              {
                icon: Scissors,
                title: "Capture",
                text: "Pick a Twitch clip, upload your own, or rehearse with our original scene.",
              },
              {
                icon: Radio,
                title: "Launch",
                text: "Share one link. Your viewers remix the moment privately, without an account.",
              },
              {
                icon: ShieldCheck,
                title: "Review",
                text: "Get a shortlist. Review every finalist. Nothing goes on-air without your approval.",
              },
              {
                icon: Trophy,
                title: "Reveal",
                text: "Bring the best takes onto your OBS overlay. Crown your winner. Export the moment.",
              },
            ].map((s, i) => (
              <div className="how-step" key={s.title}>
                <span className="step-number">0{i + 1}</span>
                <s.icon size={27} />
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="closing-cta">
          <div>
            <span className="eyebrow">YOUR COMMUNITY IS ALREADY FUNNY.</span>
            <h2>Give them the spotlight.</h2>
            <p>Built for the beautiful chaos of live.</p>
          </div>
          <a className="button white" href="/creator">
            Open your creator studio <ArrowRight size={18} />
          </a>
          <Clapperboard className="cta-decoration" size={170} />
        </section>
      </main>
      <footer className="footer">
        <Brand />
        <span>Made with Codex. Built for Twitch communities.</span>
        <a href="/creator/settings">
          Setup & connections <ArrowUpRight size={14} />
        </a>
      </footer>
      <Toasts />
    </>
  );
}
function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path d="m3 8 3 3 7-7" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
