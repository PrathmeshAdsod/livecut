import { test, expect } from "@playwright/test";
import fs from "node:fs";
test("local video upload validates type, persists bytes and serves ranges", async ({
  page,
}) => {
  await page.request.get("/api/me");
  await page.goto("/");
  await page.getByRole("button", { name: "Try a rehearsal" }).click();
  await expect(
    page.getByRole("heading", { name: "Your show, upgraded." }),
  ).toBeVisible();
  const invalid = await page.request.post("/api/upload", {
    headers: { Origin: "http://localhost:5173", "Content-Type": "video/mp4" },
    data: Buffer.from("not-a-valid-media-file"),
  });
  expect(invalid.status()).toBe(400);
  const file = ".local/skyfall-gameplay.webm";
  let bytes: Buffer;
  if (fs.existsSync(file)) bytes = fs.readFileSync(file);
  else {
    await page.goto("/game");
    await page.locator("canvas").waitFor();
    const encoded = await page.evaluate(async () => {
      const stream = document.querySelector("canvas")!.captureStream(20);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      const parts: Blob[] = [];
      recorder.ondataavailable = (e) => parts.push(e.data);
      const done = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });
      recorder.start();
      await new Promise((resolve) => setTimeout(resolve, 500));
      recorder.stop();
      await done;
      const buffer = new Uint8Array(await new Blob(parts).arrayBuffer());
      let text = "";
      for (let i = 0; i < buffer.length; i += 32768)
        text += String.fromCharCode(...buffer.subarray(i, i + 32768));
      stream.getTracks().forEach((t) => t.stop());
      return btoa(text);
    });
    bytes = Buffer.from(encoded, "base64");
  }
  const uploaded = await page.request.post("/api/upload", {
    headers: { Origin: "http://localhost:5173", "Content-Type": "video/webm" },
    data: bytes,
  });
  expect(uploaded.status()).toBe(200);
  const { url } = await uploaded.json();
  const downloaded = await page.request.get(url);
  expect(downloaded.status()).toBe(200);
  expect(Buffer.compare(await downloaded.body(), bytes)).toBe(0);
  const range = await page.request.get(url, {
    headers: { Range: "bytes=0-31" },
  });
  expect(range.status()).toBe(206);
  expect((await range.body()).length).toBe(32);
  expect(range.headers()["content-range"]).toBe(`bytes 0-31/${bytes.length}`);
  fs.mkdirSync(".local", { recursive: true });
  fs.writeFileSync(
    ".local/upload-evidence.json",
    JSON.stringify({ url, bytes: bytes.length }),
  );
});
test("a disconnected viewer retains the last state and reconnects", async ({
  page,
}) => {
  await page.request.get("/api/me");
  await page.goto("/");
  await page.getByRole("button", { name: "Try a rehearsal" }).click();
  await page.getByRole("link", { name: "Create your first round" }).click();
  await page
    .getByRole("button", { name: "Create round & preview launch" })
    .click();
  await expect(
    page.getByRole("button", { name: "Launch round" }),
  ).toBeVisible();
  const id = page.url().split("/").pop()!;
  await page.goto("/r/" + id);
  await expect(
    page.getByRole("heading", { name: "Make this moment unforgettable." }),
  ).toBeVisible();
  await page.context().setOffline(true);
  await expect(page.getByText(/Connection interrupted\./)).toBeVisible({
    timeout: 10000,
  });
  await expect(
    page.getByRole("heading", { name: "Make this moment unforgettable." }),
  ).toBeVisible();
  await page.context().setOffline(false);
  await expect(page.getByText(/Connection interrupted\./)).toBeHidden({
    timeout: 10000,
  });
});
