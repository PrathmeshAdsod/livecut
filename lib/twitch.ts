import {
  AppError,
  config,
  db,
  hash,
  cookie,
  random,
  cookieHeader,
  encrypt,
  decrypt,
  requestJson,
  origin,
} from "./security";
import type { Creator } from "./types";
type StoredCreator = Creator & {
  access: string | null;
  refresh: string | null;
  expires: number | null;
  validated: number | null;
};
export async function session(req: Request): Promise<StoredCreator | null> {
  const token = cookie(req, "lc_session");
  if (!token) return null;
  const user = await db()
    .prepare(
      "SELECT c.* FROM creators c JOIN sessions s ON c.id=s.creatorId WHERE s.id=? AND s.expires>?",
    )
    .bind(await hash(token), Date.now())
    .first<StoredCreator>();
  if (user && !user.demo) {
    try {
      await validToken(user);
    } catch (e) {
      if (e instanceof AppError && e.status === 401) {
        await db().batch([
          db().prepare("DELETE FROM sessions WHERE creatorId=?").bind(user.id),
          db()
            .prepare("UPDATE creators SET access=NULL,refresh=NULL WHERE id=?")
            .bind(user.id),
        ]);
        return null;
      }
      throw e;
    }
  }
  return user;
}
export function publicCreator(u: Creator | null) {
  return u
    ? { id: u.id, login: u.login, name: u.name, avatar: u.avatar, demo: u.demo }
    : null;
}
export async function requireCreator(req: Request) {
  const u = await session(req);
  if (!u)
    throw new AppError(
      "Connect Twitch or open a rehearsal workspace first.",
      401,
    );
  return u;
}
export async function createSession(req: Request, id: string) {
  const token = random();
  await db()
    .prepare("INSERT INTO sessions (id,creatorId,expires) VALUES (?,?,?)")
    .bind(await hash(token), id, Date.now() + 604800000)
    .run();
  return cookieHeader(req, "lc_session", token);
}
export async function validToken(u: StoredCreator) {
  if (u.demo || !u.access)
    throw new AppError(
      "Connect a real Twitch channel to use this feature.",
      401,
    );
  let access = await decrypt(u.access);
  if ((u.expires ?? 0) < Date.now() + 60000) {
    if (!u.refresh)
      throw new AppError(
        "Reconnect Twitch to refresh your authorization.",
        401,
      );
    const data = (await requestJson("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: await decrypt(u.refresh),
        client_id: config("TWITCH_CLIENT_ID"),
        client_secret: config("TWITCH_CLIENT_SECRET"),
      }),
    })) as { access_token: string; refresh_token: string; expires_in: number };
    access = data.access_token;
    u.access = await encrypt(access);
    u.refresh = await encrypt(data.refresh_token);
    u.expires = Date.now() + data.expires_in * 1000;
    u.validated = 0;
    await db()
      .prepare(
        "UPDATE creators SET access=?,refresh=?,expires=?,validated=0 WHERE id=?",
      )
      .bind(u.access, u.refresh, u.expires, u.id)
      .run();
  }
  if ((u.validated ?? 0) < Date.now() - 3500000) {
    const data = (await requestJson("https://id.twitch.tv/oauth2/validate", {
      headers: { Authorization: `OAuth ${access}` },
    })) as { user_id: string; client_id: string };
    if (data.user_id !== u.id || data.client_id !== config("TWITCH_CLIENT_ID"))
      throw new AppError("Twitch session does not match this channel.", 401);
    await db()
      .prepare("UPDATE creators SET validated=? WHERE id=?")
      .bind(Date.now(), u.id)
      .run();
    u.validated = Date.now();
  }
  return access;
}
export async function helix(u: StoredCreator, path: string, method = "GET") {
  const token = await validToken(u);
  return requestJson("https://api.twitch.tv/helix/" + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Client-Id": config("TWITCH_CLIENT_ID"),
    },
  });
}
export async function oauthStart(req: Request) {
  if (
    !config("TWITCH_CLIENT_ID") ||
    !config("TWITCH_CLIENT_SECRET") ||
    config("SESSION_SECRET").length < 32
  )
    return Response.redirect(
      origin(req) + "/creator/settings?error=twitch_setup",
      302,
    );
  const state = random();
  const url = new URL("https://id.twitch.tv/oauth2/authorize");
  url.search = new URLSearchParams({
    client_id: config("TWITCH_CLIENT_ID"),
    redirect_uri: origin(req) + "/api/auth/twitch/callback",
    response_type: "code",
    scope: "clips:edit",
    state,
  }).toString();
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      "Set-Cookie": cookieHeader(req, "lc_oauth", state, 600),
    },
  });
}
export async function oauthCallback(req: Request) {
  const url = new URL(req.url);
  const state = url.searchParams.get("state");
  if (!state || state !== cookie(req, "lc_oauth"))
    throw new AppError(
      "Twitch login could not be verified. Please start again.",
      403,
    );
  if (url.searchParams.has("error"))
    return new Response(null, {
      status: 302,
      headers: {
        Location: origin(req) + "/creator/settings?error=oauth_denied",
        "Set-Cookie": cookieHeader(req, "lc_oauth", "", 0),
      },
    });
  const code = url.searchParams.get("code");
  if (!code) throw new AppError("Twitch did not return an authorization code.");
  const t = (await requestJson("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: config("TWITCH_CLIENT_ID"),
      client_secret: config("TWITCH_CLIENT_SECRET"),
      code,
      grant_type: "authorization_code",
      redirect_uri: origin(req) + "/api/auth/twitch/callback",
    }),
  })) as { access_token: string; refresh_token: string; expires_in: number };
  const v = (await requestJson("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `OAuth ${t.access_token}` },
  })) as { user_id: string; client_id: string };
  if (v.client_id !== config("TWITCH_CLIENT_ID"))
    throw new AppError("Twitch client verification failed.", 403);
  const data = (await requestJson("https://api.twitch.tv/helix/users", {
    headers: {
      Authorization: `Bearer ${t.access_token}`,
      "Client-Id": config("TWITCH_CLIENT_ID"),
    },
  })) as {
    data: {
      id: string;
      login: string;
      display_name: string;
      profile_image_url: string;
    }[];
  };
  const u = data.data[0];
  if (!u || u.id !== v.user_id)
    throw new AppError("Twitch user verification failed.", 403);
  await db()
    .prepare(
      "INSERT INTO creators (id,login,name,avatar,demo,access,refresh,expires,validated) VALUES (?,?,?,?,0,?,?,?,?) ON CONFLICT(id) DO UPDATE SET login=excluded.login,name=excluded.name,avatar=excluded.avatar,access=excluded.access,refresh=excluded.refresh,expires=excluded.expires,validated=excluded.validated",
    )
    .bind(
      u.id,
      u.login,
      u.display_name,
      u.profile_image_url,
      await encrypt(t.access_token),
      await encrypt(t.refresh_token),
      Date.now() + t.expires_in * 1000,
      Date.now(),
    )
    .run();
  const headers = new Headers({ Location: origin(req) + "/creator" });
  headers.append("Set-Cookie", await createSession(req, u.id));
  headers.append("Set-Cookie", cookieHeader(req, "lc_oauth", "", 0));
  return new Response(null, { status: 302, headers });
}
