import { env } from "cloudflare:workers";
import {
  AppError,
  config,
  db,
  random,
  hash,
  cookie,
  cookieHeader,
  sameOrigin,
  jsonBody,
  rate,
  origin,
} from "@/lib/security";
import {
  requireCreator,
  session,
  publicCreator,
  createSession,
  oauthStart,
  oauthCallback,
  helix,
} from "@/lib/twitch";
import { entrySchema, roundSchema, normalize, transitions } from "@/lib/domain";
import { getPreset, flagshipIds } from "@/lib/presets";
import { shortlist } from "@/lib/shortlist";
import type { Round, Entry } from "@/lib/types";
export const dynamic = "force-dynamic";
function reply(data: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}
async function roundById(id: string) {
  await db()
    .prepare(
      "UPDATE rounds SET status=?,ends=NULL,remaining=0,revision=revision+1 WHERE id=? AND status=? AND ends<=?",
    )
    .bind("closed", id, "open", Date.now())
    .run();
  const r = await db()
    .prepare(
      "SELECT r.*,c.name creatorName,c.demo,(SELECT count(*) FROM entries e WHERE e.roundId=r.id) count,(SELECT count(*) FROM entries e WHERE e.roundId=r.id AND synthetic=0) realCount FROM rounds r JOIN creators c ON r.creatorId=c.id WHERE r.id=?",
    )
    .bind(id)
    .first<Round>();
  if (!r) throw new AppError("This round could not be found.", 404);
  return r;
}
async function entryList(id: string) {
  return (
    await db()
      .prepare(
        "SELECT id,roundId,nickname,mode,headline,detail,status,synthetic,suggested,reason,created FROM entries WHERE roundId=? ORDER BY created,id",
      )
      .bind(id)
      .all<Entry>()
  ).results;
}
async function handle(req: Request) {
  const url = new URL(req.url),
    path = url.pathname.slice(5).split("/").filter(Boolean),
    method = req.method;
  if (method === "GET" && path.join("/") === "health")
    return reply({ ok: true, service: "livecut" });
  if (method === "GET" && path.join("/") === "auth/twitch")
    return oauthStart(req);
  if (method === "GET" && path.join("/") === "auth/twitch/callback")
    return oauthCallback(req);
  if (method === "POST") sameOrigin(req);
  if (path[0] === "me" && method === "GET") {
    const u = await session(req);
    let guest = cookie(req, "lc_guest");
    const headers: Record<string, string> = {};
    if (!guest) {
      guest = random();
      headers["Set-Cookie"] = cookieHeader(req, "lc_guest", guest);
    }
    const rs = u
      ? (
          await db()
            .prepare(
              "SELECT r.*,(SELECT count(*) FROM entries e WHERE e.roundId=r.id) count,(SELECT count(*) FROM entries e WHERE e.roundId=r.id AND synthetic=0) realCount FROM rounds r WHERE creatorId=? ORDER BY created DESC LIMIT 50",
            )
            .bind(u.id)
            .all<Round>()
        ).results
      : [];
    return reply(
      {
        user: publicCreator(u),
        rounds: rs,
        config: {
          twitchReady: !!(
            config("TWITCH_CLIENT_ID") &&
            config("TWITCH_CLIENT_SECRET") &&
            config("SESSION_SECRET").length >= 32
          ),
          geminiReady:
            !!config("GEMINI_API_KEY") &&
            config("GEMINI_FREE_TIER_CONFIRMED") === "true",
          model: config("GEMINI_MODEL") || "gemini-3.1-flash-lite",
          uploadReady: !!env.BUCKET,
          callbackUrl: origin(req) + "/api/auth/twitch/callback",
        },
      },
      200,
      headers,
    );
  }
  if (path[0] === "demo" && method === "POST") {
    await rate(
      "demo:" +
        (req.headers.get("cf-connecting-ip") ||
          cookie(req, "lc_guest") ||
          "local"),
      10,
      3600,
    );
    const id = "demo_" + crypto.randomUUID();
    await db()
      .prepare("INSERT INTO creators (id,login,name,demo) VALUES (?,?,?,1)")
      .bind(id, "rehearsal", "Your rehearsal")
      .run();
    return reply({ ok: true }, 200, {
      "Set-Cookie": await createSession(req, id),
    });
  }
  if (path[0] === "logout" && method === "POST") {
    const token = cookie(req, "lc_session");
    if (token)
      await db()
        .prepare("DELETE FROM sessions WHERE id=?")
        .bind(await hash(token))
        .run();
    return reply({ ok: true }, 200, {
      "Set-Cookie": cookieHeader(req, "lc_session", "", 0),
    });
  }
  if (path[0] === "twitch") {
    const u = await requireCreator(req);
    if (u.demo)
      throw new AppError(
        "Rehearsal has no Twitch connection. Connect your channel first.",
        409,
      );
    if (path[1] === "status" && method === "GET") {
      const streams = (await helix(
        u,
        "streams?user_id=" + encodeURIComponent(u.id),
      )) as {
        data: {
          title: string;
          game_name: string;
          viewer_count: number;
          started_at: string;
        }[];
      };
      return reply({
        connected: true,
        live: streams.data.length > 0,
        stream: streams.data[0] ?? null,
        channel: u.login,
      });
    }
    if (path[1] === "clips" && method === "POST") {
      await rate("clip:" + u.id, 3, 60);
      const body = await jsonBody(req);
      const duration = Number(body.duration ?? 30);
      if (![15, 30, 60].includes(duration))
        throw new AppError("Choose a 15, 30 or 60 second clip.");
      const stream = (await helix(
        u,
        "streams?user_id=" + encodeURIComponent(u.id),
      )) as { data: unknown[] };
      if (!stream.data.length)
        throw new AppError(
          "Your Twitch channel is offline. Start a stream, select an existing clip, or upload a local video.",
          409,
        );
      return reply(
        await helix(
          u,
          "clips?broadcaster_id=" +
            encodeURIComponent(u.id) +
            "&duration=" +
            duration,
          "POST",
        ),
      );
    }
    if (path[1] === "clips" && method === "GET") {
      const id = url.searchParams.get("id");
      if (id && !/^[A-Za-z0-9_-]{1,160}$/.test(id))
        throw new AppError("Invalid clip ID.");
      return reply(
        await helix(
          u,
          id
            ? "clips?id=" + encodeURIComponent(id)
            : "clips?broadcaster_id=" + encodeURIComponent(u.id) + "&first=12",
        ),
      );
    }
  }
  if (path[0] === "upload" && method === "POST") {
    const u = await requireCreator(req);
    await rate("upload:" + u.id, 5, 3600);
    if (!env.BUCKET)
      throw new AppError("Clip upload storage is unavailable.", 503);
    if (Number(req.headers.get("content-length") || 0) > 20 * 1024 * 1024)
      throw new AppError("Clip must be smaller than 20 MB.", 413);
    const type = req.headers.get("content-type") ?? "";
    if (!["video/mp4", "video/webm"].includes(type))
      throw new AppError("Upload an MP4 or WebM clip.");
    const bytes = await req.arrayBuffer();
    if (bytes.byteLength > 20 * 1024 * 1024 || bytes.byteLength < 12)
      throw new AppError("Upload a valid clip under 20 MB.", 413);
    const start = new Uint8Array(bytes, 0, 12);
    const valid =
      type === "video/mp4"
        ? String.fromCharCode(...start.slice(4, 8)) === "ftyp"
        : start[0] === 0x1a &&
          start[1] === 0x45 &&
          start[2] === 0xdf &&
          start[3] === 0xa3;
    if (!valid)
      throw new AppError("This file does not match its video format.");
    const id = random();
    await env.BUCKET.put("clips/" + id, bytes, {
      httpMetadata: { contentType: type },
    });
    await db()
      .prepare(
        "INSERT INTO uploads (id,creatorId,type,created) VALUES (?,?,?,?)",
      )
      .bind(id, u.id, type, Date.now())
      .run();
    return reply({ url: "/api/media/" + id, type: "upload" });
  }
  if (path[0] === "media" && method === "GET") {
    if (!env.BUCKET || !path[1] || !/^[a-f0-9]{64}$/.test(path[1]))
      throw new AppError("Clip not found.", 404);
    const object = await env.BUCKET.get("clips/" + path[1], {
      range: req.headers,
    });
    if (!object) throw new AppError("Clip not found.", 404);
    const headers = new Headers({
      "Cache-Control": "public,max-age=3600",
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
    });
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    let status = 200;
    if (
      req.headers.has("Range") &&
      object.range &&
      "offset" in object.range &&
      object.range.offset !== undefined &&
      object.range.length !== undefined
    ) {
      status = 206;
      headers.set(
        "Content-Range",
        `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`,
      );
      headers.set("Content-Length", String(object.range.length));
    } else headers.set("Content-Length", String(object.size));
    return new Response(object.body, { status, headers });
  }
  if (path[0] === "rounds" && !path[1] && method === "POST") {
    const u = await requireCreator(req);
    await rate("round:" + u.id, 15, 3600);
    const parsed = roundSchema.safeParse(await jsonBody(req));
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message);
    const b = parsed.data;
    if (b.clipType === "scene" && b.clipUrl !== "/images/skyfall.svg")
      throw new AppError("Choose the original scene.");
    if (b.clipType === "twitch" && !/^[A-Za-z0-9_-]{1,160}$/.test(b.clipUrl))
      throw new AppError("Choose a valid Twitch clip.");
    if (b.clipType === "upload") {
      const id = b.clipUrl.replace("/api/media/", "");
      if (
        !(await db()
          .prepare("SELECT id FROM uploads WHERE id=? AND creatorId=?")
          .bind(id, u.id)
          .first())
      )
        throw new AppError("Select a clip uploaded in this workspace.", 403);
    }
    const id = crypto.randomUUID();
    await db()
      .prepare(
        'INSERT INTO rounds (id,creatorId,title,context,clipType,clipUrl,mode,duration,"limit",status,created,overlayToken,remaining) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      )
      .bind(
        id,
        u.id,
        b.title,
        b.context,
        b.clipType,
        b.clipUrl,
        b.mode,
        b.duration,
        b.limit,
        "draft",
        Date.now(),
        random(),
        b.duration * 1000,
      )
      .run();
    return reply({ id }, 201);
  }
  if (path[0] === "rounds" && path[1]) {
    const r = await roundById(path[1]);
    const u = await session(req);
    const owner = u?.id === r.creatorId;
    if (method === "GET") {
      const all = owner
        ? await entryList(r.id)
        : (
            await db()
              .prepare(
                "SELECT id,roundId,nickname,mode,headline,detail,status,synthetic,suggested,reason,created FROM entries WHERE roundId=? AND status='approved' AND (id=? OR id=?) ORDER BY created,id",
              )
              .bind(r.id, r.revealId, r.winnerId)
              .all<Entry>()
          ).results;
      let guest = cookie(req, "lc_guest");
      const headers: Record<string, string> = {};
      if (!guest) {
        guest = random();
        headers["Set-Cookie"] = cookieHeader(req, "lc_guest", guest);
      }
      const guestHash = await hash(guest);
      const mine = await db()
        .prepare(
          "SELECT id,roundId,nickname,mode,headline,detail,status,synthetic,suggested,reason,created FROM entries WHERE roundId=? AND guest=? ORDER BY created DESC",
        )
        .bind(r.id, guestHash)
        .all<Entry>();
      const publicRound = { ...r };
      if (!owner) delete publicRound.overlayToken;
      if (path[2] === "export") {
        if (!owner)
          throw new AppError(
            "Only the creator can export the round data.",
            403,
          );
        return new Response(
          JSON.stringify({ round: publicRound, entries: all }, null, 2),
          {
            headers: {
              "Content-Type": "application/json",
              "Content-Disposition": `attachment; filename="livecut-${r.id}.json"`,
              "Cache-Control": "no-store",
            },
          },
        );
      }
      return reply(
        {
          round: publicRound,
          owner,
          entries: owner
            ? all
            : all
                .filter(
                  (e) =>
                    e.status === "approved" &&
                    [r.revealId, r.winnerId].includes(e.id),
                )
                .map((e) => ({ ...e, reason: null, suggested: 0 })),
          mine: mine.results,
        },
        200,
        headers,
      );
    }
    if (method === "POST" && path[2] === "entries") {
      if (r.status !== "open" || !r.ends || r.ends <= Date.now())
        throw new AppError("This round is not accepting submissions.", 409);
      const guest = cookie(req, "lc_guest");
      if (!guest)
        throw new AppError("Enable cookies and reload before submitting.", 401);
      const guestHash = await hash(guest);
      await rate("guest:" + guestHash, 6, 60);
      const ip = req.headers.get("cf-connecting-ip");
      if (ip) await rate("ip:" + ip, 30, 60);
      const parsed = entrySchema.safeParse(await jsonBody(req));
      if (!parsed.success) throw new AppError(parsed.error.issues[0].message);
      const b = parsed.data;
      if (r.mode !== "open-remix" && r.mode !== b.mode)
        throw new AppError("This round uses " + getPreset(r.mode).name + ".");
      if (!b.detail) b.detail = getPreset(b.mode).detailExample;
      const fingerprint = await hash(
        normalize(b.headline) + "|" + normalize(b.detail),
      );
      const id = crypto.randomUUID();
      try {
        const result = await db()
          .prepare(
            'INSERT INTO entries (id,roundId,guest,nickname,mode,headline,detail,fingerprint,created) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM rounds WHERE id=? AND status=? AND ends>? AND (SELECT count(*) FROM entries WHERE roundId=?)<"limit") AND (SELECT count(*) FROM entries WHERE roundId=? AND guest=?)<3',
          )
          .bind(
            id,
            r.id,
            guestHash,
            b.nickname,
            b.mode,
            b.headline,
            b.detail,
            fingerprint,
            Date.now(),
            r.id,
            "open",
            Date.now(),
            r.id,
            r.id,
            guestHash,
          )
          .run();
        if (!result.meta.changes)
          throw new AppError(
            "The round is closed, full, or you reached the three-entry guest limit.",
            409,
          );
      } catch (e) {
        if (e instanceof AppError) throw e;
        if (String(e).includes("UNIQUE"))
          throw new AppError(
            "This creation has already been submitted. Try a fresh take.",
            409,
          );
        throw e;
      }
      return reply(
        {
          id,
          message:
            "Your creation is saved privately. The creator will review it.",
        },
        201,
      );
    }
    if (!owner)
      throw new AppError("Only this round’s creator can manage it.", 403);
    if (method === "POST") {
      const b = await jsonBody(req);
      const action = String(b.action ?? "");
      if (action === "shortlist")
        return reply(
          await shortlist(r, await entryList(r.id), b.useAI === true),
        );
      if (action === "seed") {
        if (!["draft", "open", "paused", "closed"].includes(r.status))
          throw new AppError(
            "Synthetic entries can only be added before reveal.",
            409,
          );
        if (
          await db()
            .prepare(
              "SELECT id FROM entries WHERE roundId=? AND synthetic=1 LIMIT 1",
            )
            .bind(r.id)
            .first()
        )
          throw new AppError("Demo entries have already been added.", 409);
        const modes = r.mode === "open-remix" ? flagshipIds : [r.mode];
        const names = [
          "Demo Nova",
          "Demo Orbit",
          "Demo Cactus",
          "Demo Mint",
          "Demo Echo",
          "Demo Kite",
        ];
        const stmts = names.map((name, i) => {
          const p = getPreset(modes[i % modes.length]);
          const line =
            i < modes.length
              ? p.example
              : p.example.replace(/\.$/, "") + ` — take ${i + 1}`;
          return db()
            .prepare(
              'INSERT OR IGNORE INTO entries (id,roundId,guest,nickname,mode,headline,detail,fingerprint,synthetic,created) SELECT ?,?,?,?,?,?,?,?,1,? WHERE (SELECT count(*) FROM entries WHERE roundId=?)<(SELECT "limit" FROM rounds WHERE id=?)',
            )
            .bind(
              crypto.randomUUID(),
              r.id,
              "synthetic",
              name,
              p.id,
              line.slice(0, 120),
              p.detailExample,
              `synthetic_${i}`,
              Date.now() + i,
              r.id,
              r.id,
            );
        });
        await db().batch(stmts);
        return reply({ ok: true });
      }
      if (action === "approve" || action === "reject") {
        if (!["closed", "revealing"].includes(r.status))
          throw new AppError(
            "Close submissions before reviewing entries.",
            409,
          );
        const entry = await db()
          .prepare("SELECT id FROM entries WHERE id=? AND roundId=?")
          .bind(b.entryId, r.id)
          .first();
        if (!entry) throw new AppError("Entry not found.", 404);
        if (action === "reject" && [r.revealId, r.winnerId].includes(b.entryId))
          throw new AppError(
            "Hide this entry from broadcast before rejecting it.",
            409,
          );
        await db()
          .prepare("UPDATE entries SET status=? WHERE id=? AND roundId=?")
          .bind(action === "approve" ? "approved" : "rejected", b.entryId, r.id)
          .run();
        return reply({ ok: true });
      }
      if (!transitions[action]?.includes(r.status))
        throw new AppError(
          "This action is not available in the current round state.",
          409,
        );
      let sql = "",
        values: unknown[] = [];
      if (action === "launch") {
        sql =
          "UPDATE rounds SET status=?,ends=?,remaining=NULL,revision=revision+1 WHERE id=? AND status=?";
        values = ["open", Date.now() + r.duration * 1000, r.id, r.status];
      }
      if (action === "pause") {
        sql =
          "UPDATE rounds SET status=?,remaining=?,ends=NULL,revision=revision+1 WHERE id=? AND status=?";
        values = [
          "paused",
          Math.max(0, (r.ends ?? Date.now()) - Date.now()),
          r.id,
          r.status,
        ];
      }
      if (action === "resume") {
        sql =
          "UPDATE rounds SET status=?,ends=?,remaining=NULL,revision=revision+1 WHERE id=? AND status=?";
        values = ["open", Date.now() + (r.remaining ?? 0), r.id, r.status];
      }
      if (action === "close") {
        sql =
          "UPDATE rounds SET status=?,ends=NULL,remaining=0,revision=revision+1 WHERE id=? AND status=?";
        values = ["closed", r.id, r.status];
      }
      if (action === "hide") {
        sql =
          "UPDATE rounds SET revealId=NULL,revision=revision+1 WHERE id=? AND status=?";
        values = [r.id, r.status];
      }
      if (action === "reveal" || action === "winner") {
        const e = await db()
          .prepare(
            "SELECT id FROM entries WHERE id=? AND roundId=? AND status=?",
          )
          .bind(b.entryId, r.id, "approved")
          .first();
        if (!e)
          throw new AppError(
            "Approve an entry before it appears on stream.",
            409,
          );
        sql =
          action === "winner"
            ? "UPDATE rounds SET status=?,revealId=?,winnerId=?,revision=revision+1 WHERE id=? AND status=?"
            : "UPDATE rounds SET status=?,revealId=?,revision=revision+1 WHERE id=? AND status=?";
        values =
          action === "winner"
            ? ["completed", b.entryId, b.entryId, r.id, r.status]
            : ["revealing", b.entryId, r.id, r.status];
      }
      const result = await db()
        .prepare(sql)
        .bind(...values)
        .run();
      if (!result.meta.changes)
        throw new AppError("The round changed. Refresh and retry.", 409);
      return reply({ ok: true });
    }
  }
  throw new AppError("Endpoint not found.", 404);
}
async function safeHandle(req: Request) {
  try {
    return await handle(req);
  } catch (e) {
    if (e instanceof AppError) return reply({ error: e.message }, e.status);
    console.error(
      "LIVE CUT request failed",
      e instanceof Error ? e.name : "UnknownError",
    );
    return reply(
      { error: "Something went wrong. Your saved data is safe; please retry." },
      500,
    );
  }
}
export const GET = safeHandle;
export const POST = safeHandle;
