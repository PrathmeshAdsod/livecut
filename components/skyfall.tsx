"use client";
import { useEffect, useRef, useState } from "react";
import { Brand } from "./common";
import { RotateCcw, ArrowLeft } from "lucide-react";
export function Skyfall() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [reset, setReset] = useState(0);
  const [message, setMessage] = useState(
    "Hold Space or touch to charge. Release to jump.",
  );
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let frame = 0;
    let x = 150,
      y = 335,
      vx = 0,
      vy = 0,
      grounded = true,
      charging = false,
      charge = 0,
      rescued = false,
      failed = false,
      landed = false,
      last = 0;
    const press = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (grounded && !landed) charging = true;
      }
    };
    const release = () => {
      if (charging && grounded) {
        charging = false;
        grounded = false;
        vx = 4 + charge * 7;
        vy = -7 - charge * 7;
        charge = 0;
        setMessage("A heroic leap. A questionable landing plan.");
      }
    };
    const down = () => {
      if (grounded && !landed) charging = true;
    };
    const keyup = (e: KeyboardEvent) => {
      if (e.code === "Space") release();
    };
    window.addEventListener("keydown", press);
    window.addEventListener("keyup", keyup);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    function draw(now: number) {
      const dt = Math.min(2, (now - last) / 16.67 || 1);
      last = now;
      canvas.width = 1200;
      canvas.height = 675;
      const c = ctx;
      const sky = c.createLinearGradient(0, 0, 0, 675);
      sky.addColorStop(0, "#7cd3f4");
      sky.addColorStop(1, "#d8f0f5");
      c.fillStyle = sky;
      c.fillRect(0, 0, 1200, 675);
      const sun = c.createRadialGradient(940, 120, 0, 940, 120, 180);
      sun.addColorStop(0, "#fff9bd");
      sun.addColorStop(1, "#ffffcc00");
      c.fillStyle = sun;
      c.fillRect(700, 0, 500, 400);
      c.fillStyle = "#e7faff";
      [
        [180, 110, 100],
        [490, 75, 80],
        [900, 170, 120],
      ].forEach(([cx, cy, r]) => {
        c.beginPath();
        c.ellipse(cx, cy, r, 22, 0, 0, 7);
        c.fill();
      });
      c.fillStyle = "#a1c4d5";
      c.beginPath();
      c.moveTo(0, 440);
      c.quadraticCurveTo(300, 300, 600, 430);
      c.quadraticCurveTo(900, 350, 1200, 390);
      c.lineTo(1200, 675);
      c.lineTo(0, 675);
      c.fill();
      function island(ix: number, iy: number, w: number) {
        const g = c.createLinearGradient(ix, iy, ix, 675);
        g.addColorStop(0, "#5c84ac");
        g.addColorStop(1, "#213d63");
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(ix, iy);
        c.lineTo(ix + w, iy + 4);
        c.lineTo(ix + w - 50, 675);
        c.lineTo(ix + 35, 675);
        c.closePath();
        c.fill();
        c.fillStyle = "#a9e5a5";
        c.fillRect(ix, iy - 10, w, 18);
        c.fillStyle = "#59b498";
        c.fillRect(ix, iy + 8, w, 7);
      }
      island(0, 390, 330);
      island(710, 390, 490);
      c.fillStyle = "#3e668b";
      c.font = "bold 15px Arial";
      c.fillText("THE LEAP OF QUESTIONABLE JUDGMENT", 45, 42);
      c.fillStyle = "#e2f8ff";
      c.fillRect(44, 56, 220, 5);
      c.fillStyle = "#1786d9";
      c.fillRect(44, 56, 220 * charge, 5);
      if (charging) charge = Math.min(1, charge + 0.012 * dt);
      if (!grounded && !failed && !landed) {
        x += vx * dt;
        y += vy * dt;
        vy += 0.35 * dt;
        if (x > 690 && !rescued) {
          rescued = true;
          setMessage("Friend rescued! Now stick the landing…");
        }
        if (y >= 337 && vy > 0 && x >= 710 && x < 1190) {
          y = 337;
          landed = true;
          grounded = true;
          setMessage("RESCUE COMPLETE. HERO PRESENT. A rare happy ending.");
        }
        if (y > 750 || x > 1250) {
          failed = true;
          setMessage(
            rescued
              ? "RESCUE COMPLETE. HERO MISSING. Remix this moment."
              : "A bold strategy. The canyon would like a word.",
          );
        }
      }
      function person(px: number, py: number, hero: boolean) {
        c.save();
        c.translate(px, py);
        if (hero && !grounded) c.rotate(Math.sin(now / 150) * 0.25);
        c.lineWidth = 10;
        c.lineCap = "round";
        c.strokeStyle = "#1e405e";
        c.beginPath();
        c.moveTo(-8, 30);
        c.lineTo(-12, 48);
        c.moveTo(8, 30);
        c.lineTo(12, 48);
        c.stroke();
        c.fillStyle = hero ? "#fa8250" : "#437b9f";
        c.fillRect(-16, 0, 32, 34);
        c.strokeStyle = "#fdd37f";
        c.lineWidth = 8;
        c.beginPath();
        c.moveTo(-16, 7);
        c.lineTo(-30, hero ? -5 : 21);
        c.moveTo(16, 7);
        c.lineTo(30, hero ? -5 : 21);
        c.stroke();
        c.fillStyle = "#ffdb8f";
        c.beginPath();
        c.arc(0, -15, 21, 0, 7);
        c.fill();
        if (hero) {
          c.fillStyle = "#244e73";
          c.beginPath();
          c.ellipse(0, -18, 23, 15, -0.25, 0, 7);
          c.fill();
          c.fillStyle = "#c7edfc";
          c.beginPath();
          c.arc(-8, -19, 6, 0, 7);
          c.arc(9, -19, 6, 0, 7);
          c.fill();
        } else {
          c.fillStyle = "#244763";
          c.beginPath();
          c.arc(-7, -17, 2, 0, 7);
          c.arc(7, -17, 2, 0, 7);
          c.fill();
        }
        c.restore();
      }
      person(840, 335, false);
      if (!failed) person(x, y, true);
      if (rescued) {
        c.fillStyle = "#fff";
        c.font = "bold 16px Arial";
        c.fillText("THANKS!", 802, 260);
      }
      if (failed || landed) {
        c.fillStyle = "#0c2743cc";
        c.fillRect(0, 520, 1200, 155);
        c.fillStyle = "#fff";
        c.font = "bold 31px Arial";
        c.fillText(
          landed
            ? "THE HERO STUCK THE LANDING."
            : rescued
              ? "RESCUE COMPLETE. HERO MISSING."
              : "CONFIDENCE EXCEEDED PLATFORM.",
          45,
          578,
        );
        c.fillStyle = "#a6d9fb";
        c.font = "17px Arial";
        c.fillText(
          "An original LIVE CUT game. Your audience writes what happens next.",
          45,
          617,
        );
      }
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", press);
      window.removeEventListener("keyup", keyup);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerup", release);
      canvas.removeEventListener("pointercancel", release);
    };
  }, [reset]);
  return (
    <main className="game-page">
      <div className="game-toolbar">
        <div>
          <Brand light />
          <span>SKYFALL / ORIGINAL MINI GAME</span>
        </div>
        <div>
          <a href="/creator">
            <ArrowLeft size={13} style={{ display: "inline" }} /> Studio
          </a>
          <button
            className="button secondary small"
            onClick={() => {
              setReset((n) => n + 1);
              setMessage("Hold Space or touch to charge. Release to jump.");
            }}
          >
            <RotateCcw size={14} /> Restart
          </button>
        </div>
        <span className="game-instructions" aria-live="polite">
          {message}
        </span>
      </div>
      <canvas
        ref={ref}
        className="game-canvas"
        aria-label="Skyfall: hold Space or touch to charge a jump, release to rescue your friend"
        tabIndex={0}
      />
    </main>
  );
}
