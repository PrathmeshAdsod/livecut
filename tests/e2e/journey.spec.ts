import { test, expect, type APIRequestContext } from "@playwright/test";
const origin = "http://localhost:5173";
async function post(context: APIRequestContext, path: string, data: unknown) {
  return context.post(path, { data, headers: { Origin: origin } });
}
test("a private viewer creation reaches the approved overlay, winner and real PNG export", async ({
  page,
  browser,
}) => {
  await page.request.get("/api/me");
  await page.goto("/");
  await page.getByRole("button", { name: "Try a rehearsal" }).click();
  await expect(
    page.getByRole("heading", { name: "Your show, upgraded." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Create your first round" }).click();
  await page
    .getByRole("button", { name: "Create round & preview launch" })
    .click();
  await expect(
    page.getByRole("button", { name: "Launch round" }),
  ).toBeVisible();
  const id = page.url().split("/").pop()!;
  await page.getByRole("button", { name: "Launch round" }).click();
  await expect(
    page.getByText("Submissions open", { exact: true }),
  ).toBeVisible();
  const guest = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const viewer = await guest.newPage();
  await viewer.goto("/r/" + id);
  await viewer.getByLabel("Your nickname", { exact: true }).fill("RealGuest");
  await viewer
    .getByLabel("Your headline", { exact: true })
    .fill("The rescue was flawless. The return policy was not.");
  await viewer
    .getByLabel("News ticker", { exact: true })
    .fill("Fictional game-world parody. Gravity declines to comment.");
  await viewer.getByRole("button", { name: "Submit my creation" }).click();
  await expect(
    viewer.getByRole("heading", { name: /Your take has entered/ }),
  ).toBeVisible();
  expect(
    await viewer.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const privateState = await guest.request.get("/api/rounds/" + id);
  const privateJson = await privateState.json();
  expect(privateJson.entries).toHaveLength(0);
  expect(privateJson.mine).toHaveLength(1);
  expect(privateJson.round.overlayToken).toBeUndefined();
  const unauthorized = await post(guest.request, "/api/rounds/" + id, {
    action: "close",
  });
  expect(unauthorized.status()).toBe(403);
  await page.getByRole("button", { name: "Add 6 demo entries" }).click();
  await expect(
    page.getByText("Synthetic demo entries added and labeled."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByText("Round paused", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Resume round" }).click();
  await expect(
    page.getByText("Submissions open", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close & review" }).click();
  await page.getByRole("link", { name: "Review finalist queue" }).click();
  await page
    .getByRole("button", { name: "Rule-based shortlist", exact: true })
    .click();
  await expect(
    page.getByText("RULE-BASED / NO AI", { exact: true }),
  ).toBeVisible();
  const row = page
    .locator(".entry-row")
    .filter({ hasText: "The rescue was flawless. The return policy was not." });
  await row.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close preview" }).click();
  await row.getByRole("button", { name: "Approve", exact: true }).click();
  const beforeReveal = await guest.request.get("/api/rounds/" + id);
  expect((await beforeReveal.json()).entries).toHaveLength(0);
  await row.getByRole("button", { name: "Reveal", exact: true }).click();
  const overlay = await guest.newPage();
  await overlay.goto("/overlay/" + id + "?preview=1");
  await expect(
    overlay.getByText("IN THE SPOTLIGHT", { exact: true }),
  ).toBeVisible();
  await expect(
    overlay.getByText("The rescue was flawless. The return policy was not.", {
      exact: true,
    }),
  ).toBeVisible();
  await row.getByRole("button", { name: "Crown", exact: true }).click();
  await expect(
    overlay.getByText("THE WINNING TAKE", { exact: true }),
  ).toBeVisible({ timeout: 10000 });
  await expect(
    viewer.getByText("The winning creation", { exact: false }),
  ).toBeVisible({ timeout: 10000 });
  await page.goto("/creator/results/" + id);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export winning creation" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  await download.saveAs(".local/verified-export.png");
  const dismiss = page.getByRole("button", { name: "Dismiss notification" });
  if (await dismiss.isVisible()) await dismiss.click();
  await page.screenshot({
    path: "docs/screenshots/results.png",
    fullPage: true,
  });
  await viewer.screenshot({
    path: "docs/screenshots/viewer-result-mobile.png",
    fullPage: true,
  });
  await overlay.setViewportSize({ width: 1440, height: 900 });
  await overlay.screenshot({
    path: "docs/screenshots/reveal.png",
    fullPage: true,
  });
  const exports = await page.request.get("/api/rounds/" + id + "/export");
  expect(exports.ok()).toBeTruthy();
  const exported = await exports.json();
  expect(exported.entries).toHaveLength(7);
  expect(JSON.stringify(exported)).not.toContain("access_token");
  await guest.close();
});
test("input, duplicate, capacity and state checks remain enforced on the server", async ({
  playwright,
}) => {
  const host = await playwright.request.newContext({ baseURL: origin });
  const guest = await playwright.request.newContext({ baseURL: origin });
  await host.get("/api/me");
  await guest.get("/api/me");
  expect((await post(host, "/api/demo", {})).ok()).toBeTruthy();
  const created = await post(host, "/api/rounds", {
    title: "Validation round",
    context: "Testing a fictional jump.",
    clipType: "scene",
    clipUrl: "/images/skyfall.svg",
    mode: "open-remix",
    duration: 180,
    limit: 5,
  });
  const { id } = await created.json();
  const entry = {
    nickname: "Tester",
    mode: "breaking-news",
    headline: "A unique headline about the jump.",
    detail: "Fictional parody",
  };
  expect((await post(guest, `/api/rounds/${id}/entries`, entry)).status()).toBe(
    409,
  );
  await post(host, "/api/rounds/" + id, { action: "launch" });
  expect(
    (
      await post(guest, `/api/rounds/${id}/entries`, {
        ...entry,
        headline: "x".repeat(121),
      })
    ).status(),
  ).toBe(400);
  expect((await post(guest, `/api/rounds/${id}/entries`, entry)).status()).toBe(
    201,
  );
  expect((await post(guest, `/api/rounds/${id}/entries`, entry)).status()).toBe(
    409,
  );
  for (let i = 0; i < 2; i++)
    expect(
      (
        await post(guest, `/api/rounds/${id}/entries`, {
          ...entry,
          headline: "Another valid original idea number " + i,
        })
      ).status(),
    ).toBe(201);
  expect(
    (
      await post(guest, `/api/rounds/${id}/entries`, {
        ...entry,
        headline: "A fourth creation to reject.",
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await host.post("/api/rounds/" + id, {
        data: { action: "close" },
        headers: { Origin: "https://evil.example" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await post(host, "/api/rounds/" + id, {
        action: "winner",
        entryId: "missing",
      })
    ).status(),
  ).toBe(409);
  await post(host, "/api/rounds/" + id, { action: "close" });
  expect(
    (await post(host, "/api/rounds/" + id, { action: "resume" })).status(),
  ).toBe(409);
  await host.dispose();
  await guest.dispose();
});
test("landing, library and creator pages fit mobile and desktop", async ({
  page,
}) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/library", "/creator", "/creator/settings"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${path} at ${width}`,
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.screenshot({
    path: "docs/screenshots/landing.png",
    fullPage: true,
  });
  await page.goto("/library");
  await page
    .getByRole("textbox", { name: "Search creative formats" })
    .fill("corporate");
  await expect(
    page.getByRole("button", { name: /Corporate Disaster/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Corporate Disaster/ }).click();
  await expect(page.getByTestId("creation-preview")).toContainText(
    "Unscheduled vertical relocation.",
  );
});
