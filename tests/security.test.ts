import { describe, it, expect, vi, beforeEach } from "vitest";
const { runtime } = vi.hoisted(() => ({
  runtime: {
    SESSION_SECRET: "0123456789abcdef0123456789abcdef",
    APP_URL: "http://localhost:5173",
    TWITCH_CLIENT_ID: "test-client",
    TWITCH_CLIENT_SECRET: "test-secret",
    DB: undefined as unknown,
  },
}));
vi.mock("cloudflare:workers", () => ({ env: runtime }));
import {
  encrypt,
  decrypt,
  hash,
  sameOrigin,
  cookieHeader,
  jsonBody,
  AppError,
} from "../lib/security";
import { oauthStart, oauthCallback, validToken } from "../lib/twitch";
describe("session security", () => {
  it("encrypts tokens with a fresh IV and rejects tampering", async () => {
    const a = await encrypt("private-token"),
      b = await encrypt("private-token");
    expect(a).not.toBe(b);
    expect(a).not.toContain("private-token");
    expect(await decrypt(a)).toBe("private-token");
    const bytes = Uint8Array.from(atob(a), (c) => c.charCodeAt(0));
    bytes[15] ^= 1;
    await expect(
      decrypt(btoa(String.fromCharCode(...bytes))),
    ).rejects.toThrow();
  });
  it("uses one-way session hashes and secure HTTP-only cookies", async () => {
    expect(await hash("session")).toHaveLength(64);
    const value = cookieHeader(
      new Request("https://example.com"),
      "lc_session",
      "opaque",
    );
    expect(value).toContain("HttpOnly");
    expect(value).toContain("SameSite=Lax");
    expect(value).toContain("Secure");
  });
  it("rejects cross-origin and missing-origin writes", () => {
    expect(() =>
      sameOrigin(
        new Request("http://localhost:5173/api/demo", {
          headers: { Origin: "https://evil.example" },
        }),
      ),
    ).toThrow(AppError);
    expect(() =>
      sameOrigin(new Request("http://localhost:5173/api/demo")),
    ).toThrow(AppError);
    expect(() =>
      sameOrigin(
        new Request("http://localhost:5173/api/demo", {
          headers: { Origin: "http://localhost:5173" },
        }),
      ),
    ).not.toThrow();
  });
  it("rejects invalid and oversized JSON", async () => {
    await expect(
      jsonBody(
        new Request("http://localhost", { method: "POST", body: "invalid" }),
      ),
    ).rejects.toThrow("Invalid JSON");
    await expect(
      jsonBody(
        new Request("http://localhost", {
          method: "POST",
          body: "x".repeat(17000),
        }),
      ),
    ).rejects.toThrow("too large");
  });
});
describe("Twitch OAuth", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  it("requests only clips:edit and sets a short-lived state cookie", async () => {
    const response = await oauthStart(
      new Request("http://localhost:5173/api/auth/twitch"),
    );
    const url = new URL(response.headers.get("Location")!);
    expect(url.origin).toBe("https://id.twitch.tv");
    expect(url.searchParams.get("scope")).toBe("clips:edit");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:5173/api/auth/twitch/callback",
    );
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=600");
  });
  it("rejects mismatched state before exchanging any code", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    await expect(
      oauthCallback(
        new Request(
          "http://localhost:5173/api/auth/twitch/callback?code=private&state=wrong",
          { headers: { Cookie: "lc_oauth=expected" } },
        ),
      ),
    ).rejects.toThrow("could not be verified");
    expect(spy).not.toHaveBeenCalled();
  });
  it("handles user denial with a clean redirect", async () => {
    const res = await oauthCallback(
      new Request(
        "http://localhost:5173/api/auth/twitch/callback?error=access_denied&state=expected",
        { headers: { Cookie: "lc_oauth=expected" } },
      ),
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("oauth_denied");
  });
  it("terminates an invalid Twitch authorization", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 401 }),
    );
    const u = {
      id: "123",
      login: "viewer",
      name: "Viewer",
      avatar: "",
      demo: 0,
      access: await encrypt("revoked"),
      refresh: null,
      expires: Date.now() + 600000,
      validated: 0,
    };
    await expect(validToken(u)).rejects.toMatchObject({ status: 401 });
  });
  it("refreshes expiring tokens server-side and validates the channel", async () => {
    const writes: unknown[][] = [];
    runtime.DB = {
      prepare: () => ({
        bind: (...args: unknown[]) => ({
          run: async () => {
            writes.push(args);
            return { success: true };
          },
        }),
      }),
    };
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json({
          access_token: "new-access",
          refresh_token: "new-refresh",
          expires_in: 3600,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ user_id: "123", client_id: "test-client" }),
      );
    const u = {
      id: "123",
      login: "viewer",
      name: "Viewer",
      avatar: "",
      demo: 0,
      access: await encrypt("expired"),
      refresh: await encrypt("refresh"),
      expires: Date.now() - 10,
      validated: 0,
    };
    expect(await validToken(u)).toBe("new-access");
    expect(spy).toHaveBeenCalledTimes(2);
    expect(writes).toHaveLength(2);
    expect(await decrypt(u.access)).toBe("new-access");
  });
  it("completes OAuth with verified identity and only opaque browser cookies", async () => {
    const writes: unknown[][] = [];
    runtime.DB = {
      prepare: () => ({
        bind: (...args: unknown[]) => ({
          run: async () => {
            writes.push(args);
            return { success: true };
          },
        }),
      }),
    };
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json({
          access_token: "callback-access",
          refresh_token: "callback-refresh",
          expires_in: 3600,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ user_id: "123", client_id: "test-client" }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: [
            {
              id: "123",
              login: "verified",
              display_name: "Verified",
              profile_image_url: "",
            },
          ],
        }),
      );
    const response = await oauthCallback(
      new Request(
        "http://localhost:5173/api/auth/twitch/callback?state=expected&code=test-code",
        { headers: { Cookie: "lc_oauth=expected" } },
      ),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "http://localhost:5173/creator",
    );
    expect(response.headers.get("Set-Cookie")).toContain("lc_session=");
    expect(response.headers.get("Set-Cookie")).not.toContain("callback-access");
    expect(writes).toHaveLength(2);
    expect(writes[0]).not.toContain("callback-access");
  });
});
