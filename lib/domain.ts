import { z } from "zod";
import { presets } from "./presets";
import type { Entry, RoundStatus } from "./types";
export const modeSchema = z
  .string()
  .refine((v) => presets.some((p) => p.id === v), "Choose a valid format");
const clean = z
  .string()
  .trim()
  .refine(
    (v) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v),
    "Control characters are not allowed",
  );
export const entrySchema = z.object({
  nickname: clean.pipe(
    z
      .string()
      .min(2)
      .max(24)
      .regex(
        /^[\p{L}\p{N}_ .-]+$/u,
        "Use letters, numbers, spaces, dots or underscores",
      ),
  ),
  mode: modeSchema,
  headline: clean.pipe(z.string().min(3).max(120)),
  detail: clean.pipe(z.string().max(200)).default(""),
});
export const roundSchema = z.object({
  title: clean.pipe(z.string().min(3).max(80)),
  context: clean.pipe(z.string().min(3).max(400)),
  clipType: z.enum(["scene", "twitch", "upload"]),
  clipUrl: z.string().max(300),
  mode: z.union([modeSchema, z.literal("open-remix")]),
  duration: z.number().int().min(60).max(900),
  limit: z.number().int().min(5).max(250),
});
export const transitions: Record<string, RoundStatus[]> = {
  launch: ["draft"],
  pause: ["open"],
  resume: ["paused"],
  close: ["open", "paused"],
  reveal: ["closed", "revealing"],
  winner: ["closed", "revealing"],
  hide: ["closed", "revealing", "completed"],
};
export function normalize(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
export function similarity(a: string, b: string) {
  const x = new Set(normalize(a).split(" ")),
    y = new Set(normalize(b).split(" "));
  return (
    [...x].filter((v) => y.has(v)).length /
    Math.max(1, new Set([...x, ...y]).size)
  );
}
export function manualShortlist(entries: Entry[]) {
  const pool = entries.filter((e) => e.status !== "rejected");
  const chosen: Entry[] = [];
  const modes = new Set<string>();
  for (const e of pool) {
    if (chosen.length === 5) break;
    if (
      modes.has(e.mode) ||
      chosen.some((c) => similarity(c.headline, e.headline) > 0.8)
    )
      continue;
    chosen.push(e);
    modes.add(e.mode);
  }
  for (const e of pool) {
    if (chosen.length === 5) break;
    if (
      chosen.includes(e) ||
      chosen.some((c) => similarity(c.headline, e.headline) > 0.8)
    )
      continue;
    chosen.push(e);
  }
  return chosen.map((e) => ({
    id: e.id,
    flag: false,
    reason: "Rule-based variety pick; creator safety review required.",
  }));
}
