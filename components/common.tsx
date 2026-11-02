"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Copy,
  LoaderCircle,
  Play,
  Radio,
  TriangleAlert,
  X,
} from "lucide-react";
import type { Round } from "@/lib/types";
export async function api<T = Record<string, unknown>>(
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "Request failed. Please retry.");
  return data;
}
export function notify(message: string, kind: "success" | "error" = "success") {
  window.dispatchEvent(
    new CustomEvent("livecut-toast", { detail: { message, kind } }),
  );
}
export function Toasts() {
  const [toast, setToast] = useState<{ message: string; kind: string } | null>(
    null,
  );
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const listener = (event: Event) => {
      setToast((event as CustomEvent).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 6500);
    };
    window.addEventListener("livecut-toast", listener);
    return () => {
      window.removeEventListener("livecut-toast", listener);
      clearTimeout(timer);
    };
  }, []);
  return toast ? (
    <div
      className={`toast ${toast.kind}`}
      role={toast.kind === "error" ? "alert" : "status"}
    >
      {toast.kind === "error" ? (
        <TriangleAlert size={19} />
      ) : (
        <Check size={19} />
      )}
      <span>{toast.message}</span>
      <button onClick={() => setToast(null)} aria-label="Dismiss notification">
        <X size={16} />
      </button>
    </div>
  ) : null;
}
export function usePolling<T>(path: string | null, interval = 3000) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    let alive = true,
      inflight = false;
    const refresh = async () => {
      if (!path || inflight) return;
      inflight = true;
      try {
        const next = await api<T>(path);
        if (alive) {
          setData(next);
          setError("");
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        inflight = false;
        if (alive) setLoading(false);
      }
    };
    refreshRef.current = refresh;
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState !== "hidden") void refresh();
    }, interval);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [path, interval]);
  return { data, error, loading, refresh: () => refreshRef.current() };
}
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <a
      className={`brand ${light ? "light" : ""}`}
      href="/"
      aria-label="LIVE CUT home"
    >
      <span className="brand-icon">
        <Play size={20} fill="currentColor" strokeWidth={0} />
      </span>
      <span>
        LIVE CUT<span className="brand-dot">.</span>
      </span>
    </a>
  );
}
export function Nav() {
  return (
    <header className="public-nav">
      <Brand />
      <nav aria-label="Main navigation">
        <a href="/#how-it-works">How it works</a>
        <a href="/library">Creative formats</a>
        <a href="/creator">For creators</a>
      </nav>
      <a className="button small" href="/api/auth/twitch">
        Connect Twitch <ArrowUpRight size={16} />
      </a>
    </header>
  );
}
export function Status({ round }: { round: Round }) {
  const names: Record<string, string> = {
    draft: "Ready to launch",
    open: "Submissions open",
    paused: "Round paused",
    closed: "Ready for review",
    revealing: "On-air reveal",
    completed: "Round complete",
  };
  return (
    <span className={`status ${round.status}`}>
      <span className="status-dot" />
      {names[round.status]}
    </span>
  );
}
export function Clock({ round }: { round: Round }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(
    0,
    Math.ceil(
      (round.status === "paused"
        ? (round.remaining ?? 0)
        : round.status === "open"
          ? (round.ends ?? now) - now
          : round.status === "draft"
            ? round.duration * 1000
            : 0) / 1000,
    ),
  );
  return (
    <span className="clock" suppressHydrationWarning>
      {String(Math.floor(seconds / 60)).padStart(2, "0")}:
      {String(seconds % 60).padStart(2, "0")}
    </span>
  );
}
export function CopyButton({
  value,
  label = "Copy link",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="button secondary small"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2200);
        } catch {
          notify(
            "Clipboard access is unavailable. Select and copy the displayed URL.",
            "error",
          );
        }
      }}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
      {copied ? "Copied" : label}
    </button>
  );
}
export function Loading() {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={28} />
      <p>Getting your studio ready…</p>
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <TriangleAlert size={25} />
      <h3>We couldn’t connect.</h3>
      <p>{message}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          Try again <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
export function ConnectionBanner({ message }: { message: string }) {
  return (
    <div className="connection-banner" role="status">
      <Radio size={16} /> Connection interrupted. {message} Reconnecting
      automatically…
    </div>
  );
}
