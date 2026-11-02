"use client";
import { useEffect, useState } from "react";
import { Search, ArrowRight, X, Check, Sparkles } from "lucide-react";
import { presets, categories, getPreset, flagshipIds } from "@/lib/presets";
import { Creation } from "./creation";
export function Library({
  onSelect,
  allowed,
}: {
  onSelect?: (id: string) => void;
  allowed?: string[];
}) {
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("All formats"),
    [preview, setPreview] = useState<string | null>(null),
    [headline, setHeadline] = useState(""),
    [detail, setDetail] = useState("");
  useEffect(() => {
    if (!onSelect) {
      const id = new URLSearchParams(window.location.search).get("mode");
      if (id && presets.some((p) => p.id === id)) {
        const p = getPreset(id);
        setPreview(id);
        setHeadline(p.example);
        setDetail(p.detailExample);
      }
    }
  }, [onSelect]);
  const filtered = presets.filter(
    (p) =>
      (!allowed || allowed.includes(p.id)) &&
      (category === "All formats" ||
        (category === "Popular" && flagshipIds.includes(p.id)) ||
        category === p.category) &&
      (p.name + " " + p.prompt).toLowerCase().includes(search.toLowerCase()),
  );
  const selected = preview ? getPreset(preview) : null;
  return (
    <>
      <div className="library-toolbar">
        <div className="search-box">
          <Search size={19} />
          <input
            aria-label="Search creative formats"
            placeholder="Find your next great take…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </div>
        <button
          className={`filter-pill ${category === "Popular" ? "selected" : ""}`}
          onClick={() =>
            setCategory(category === "Popular" ? "All formats" : "Popular")
          }
        >
          <Sparkles size={15} /> Most popular
        </button>
      </div>
      <div className="library-layout">
        <aside className="library-categories">
          <span className="eyebrow">COLLECTIONS</span>
          {["All formats", ...categories].map((c, i) => (
            <button
              key={c}
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
            >
              <span>
                {["✦", "😂", "📰", "🎬", "💻", "🏆"][i]} {c}
              </span>
              <small>{i === 0 ? 50 : 10}</small>
            </button>
          ))}
          <p>
            One simple studio.
            <br />
            Fifty different personalities.
          </p>
        </aside>
        <div>
          <div className="row library-count">
            <strong>
              {category === "All formats" ? "Find your format" : category}
            </strong>
            <span>{filtered.length} formats</span>
          </div>
          <div className="preset-grid">
            {filtered.map((p) => (
              <button
                className="preset-card"
                key={p.id}
                onClick={() => {
                  if (onSelect) {
                    onSelect(p.id);
                    return;
                  }
                  setPreview(p.id);
                  setHeadline(p.example);
                  setDetail(p.detailExample);
                }}
              >
                <span className="preset-emoji">{p.icon}</span>
                <span className="preset-plus">+</span>
                <strong>{p.name}</strong>
                <span>{p.prompt}</span>
                <small>
                  {p.renderer.toUpperCase()} COLLECTION <ArrowRight size={12} />
                </small>
              </button>
            ))}
          </div>
          {!filtered.length && (
            <div className="empty-state">
              <Search size={25} />
              <h3>No formats found</h3>
              <p>Try another search or collection.</p>
              <button
                className="button secondary"
                onClick={() => {
                  setSearch("");
                  setCategory("All formats");
                }}
              >
                Show all formats
              </button>
            </div>
          )}
        </div>
      </div>
      {selected && (
        <div className="modal-backdrop" onClick={() => setPreview(null)}>
          <section
            className="modal preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="format-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setPreview(null);
            }}
          >
            <button
              className="modal-close"
              aria-label="Close format preview"
              onClick={() => setPreview(null)}
              autoFocus
            >
              <X size={20} />
            </button>
            <div className="eyebrow">TRY A FORMAT</div>
            <h2 id="format-title">
              {selected.icon} {selected.name}
            </h2>
            <p className="muted">{selected.prompt}</p>
            <label>
              {selected.label}
              <input
                maxLength={120}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
              />
            </label>
            <label>
              {selected.detailLabel}
              <textarea
                maxLength={200}
                rows={2}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
              />
            </label>
            <Creation mode={selected.id} headline={headline} detail={detail} />
            <div className="row">
              <span className="tiny">
                <Check size={13} /> Live preview · example content
              </span>
              <a className="button small" href="/creator/new">
                Create a round <ArrowRight size={15} />
              </a>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
