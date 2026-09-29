const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = path.resolve(__dirname, "..");
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const file = path.join(root, pathname === "/" ? "index.html" : pathname);
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(file, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.setHeader(
      "Content-Type",
      file.endsWith(".js")
        ? "text/javascript"
        : file.endsWith(".css")
          ? "text/css"
          : "text/html",
    );
    res.end(data);
  });
});
(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BROWSER_EXECUTABLE_PATH || undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  const page = await browser.newPage({
      viewport: { width: 1280, height: 1100 },
    }),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const out = path.join(root, "test-results");
  fs.mkdirSync(out, { recursive: true });
  const saved = () =>
    page.waitForFunction(
      () => document.querySelector("#save-status").textContent === "Saved ✓",
    );
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await saved();
    assert.equal(await page.locator(".property-card").count(), 6);
    assert.equal(await page.locator(".photo-card").count(), 3);
    const initialID = await page
      .locator(".property-card")
      .first()
      .getAttribute("data-id");
    await page.locator('[data-field="city"]').first().fill("Updated Rotterdam");
    await page.locator('[data-field="persons"]').first().fill("12");
    await page.locator('[data-field="persons"]').first().blur();
    await saved();
    assert.equal(await page.locator("[data-capacity]").textContent(), "35");
    await page.reload();
    await saved();
    assert.equal(
      await page.locator('[data-field="city"]').first().textContent(),
      "Updated Rotterdam",
    );
    // Large synthetic image verifies local resizing and Blob persistence.
    const image = Buffer.from(
      await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 4000;
        canvas.height = 3000;
        const c = canvas.getContext("2d");
        const g = c.createLinearGradient(0, 0, 4000, 3000);
        g.addColorStop(0, "#346a80");
        g.addColorStop(1, "#b3dfcc");
        c.fillStyle = g;
        c.fillRect(0, 0, 4000, 3000);
        return canvas.toDataURL("image/png").split(",")[1];
      }),
      "base64",
    );
    await page.locator('[data-action="upload"]').first().click();
    await page.locator("#photo-input").setInputFiles({
      name: "test.png",
      mimeType: "image/png",
      buffer: image,
    });
    await page.waitForSelector(".gallery.count-1");
    await saved();
    let dimensions = await page.evaluate(() =>
      state.properties[0].photos.map((p) => [p.width, p.height, p.blob.type]),
    );
    assert.deepEqual(dimensions, [[1400, 1050, "image/jpeg"]]);
    await page.locator('[data-action="upload"]').first().click();
    await page.locator("#photo-input").setInputFiles([
      { name: "second.png", mimeType: "image/png", buffer: image },
      { name: "third.png", mimeType: "image/png", buffer: image },
    ]);
    await page.waitForSelector(".gallery.count-3");
    await saved();
    assert.equal(
      await page.evaluate(() =>
        [...document.querySelectorAll(".property-card")].every((card) => {
          const row = card.closest(".property-row").getBoundingClientRect();
          const bounds = card.getBoundingClientRect();
          const gallery = card.querySelector(".gallery");
          return (
            bounds.bottom <= row.bottom + 1 &&
            (!gallery ||
              gallery.getBoundingClientRect().bottom <= bounds.bottom + 1)
          );
        }),
      ),
      true,
      "Photos and cards must fit their fixed grid rows",
    );
    const photoID = await page
      .locator(".photo")
      .first()
      .getAttribute("data-photo-id");
    await page.locator(".photo-handle").first().press("ArrowRight");
    await saved();
    assert.equal(
      await page.locator(".photo").nth(1).getAttribute("data-photo-id"),
      photoID,
    );
    // Pointer drag from top-three photo position to compact position.
    const from = await page.locator(".card-handle").first().boundingBox(),
      to = await page.locator(".property-card").nth(3).boundingBox();
    await page.mouse.move(from.x + 10, from.y + 10);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
      steps: 12,
    });
    await page.mouse.up();
    await saved();
    assert.equal(
      await page.locator(".property-card").nth(3).getAttribute("data-id"),
      initialID,
    );
    assert.equal(await page.locator(`[data-id="${initialID}"] img`).count(), 0);
    assert.equal(
      await page.evaluate(() => state.properties[3].photos.length),
      3,
    );
    await page
      .locator(`[data-id="${initialID}"] .card-handle`)
      .press("ArrowUp");
    await saved();
    assert.equal(await page.locator(`[data-id="${initialID}"] img`).count(), 3);
    await page.reload();
    await saved();
    assert.equal(await page.locator(`[data-id="${initialID}"] img`).count(), 3);
    await page.locator(".badge").first().click();
    await page.selectOption('[aria-label="Availability mode"]', "date");
    await page.fill('[aria-label="Available date"]', "2026-12-15");
    await page.locator('[data-action="close-availability"]').click();
    await saved();
    assert.match(
      await page.locator(".badge").first().textContent(),
      /Available 15\.12/,
    );
    // Enter never inserts new markup/lines; long pasted input is capped.
    await page
      .locator('[data-field="city"]')
      .first()
      .fill("<img onerror=bad()>");
    await page.locator('[data-field="city"]').first().press("Enter");
    assert.equal(await page.locator("h2 img").count(), 0);
    await saved();
    await page.locator("#reset").click();
    await page.locator('#confirm-dialog [value="cancel"]').click();
    assert.match(
      await page.locator('[data-field="city"]').first().textContent(),
      /img/,
    );
    await page.locator("#reset").click();
    await page.locator("#confirm-action").click();
    await page.waitForFunction(
      () => document.querySelectorAll(".photo img").length === 0,
    );
    await saved();
    assert.equal(await page.locator(".property-card").count(), 6);
    await page.locator('[data-action="remove"]').first().click();
    await page.locator("#confirm-action").click();
    await page.waitForFunction(
      () => document.querySelectorAll(".property-card").length === 5,
    );
    await saved();
    // Empty state and the next four additions always use position-based layouts.
    await page.evaluate(async () => {
      state.properties = [];
      changed();
      render();
      await flushSave();
    });
    await page.reload();
    await saved();
    assert.equal(await page.locator(".property-card").count(), 0);
    for (let i = 0; i < 4; i++) await page.locator("#add").click();
    await page.locator("#add").focus();
    await saved();
    assert.equal(await page.locator(".photo-card").count(), 3);
    assert.equal(await page.locator(".compact-card").count(), 1);
    // Stress every row boundary and ensure footer never becomes an orphan sheet.
    await page.evaluate(() => {
      for (let n = 0; n <= 100; n++) {
        const props = Array.from({ length: n }, () => newProperty());
        const pages = paginate(props);
        if (
          pages.some(
            (p) => p.used + (p.footer ? mm.gap + mm.footer : 0) > mm.content,
          )
        )
          throw Error("overflow " + n);
        if (pages.at(-1).rows.length === 0 && n > 0)
          throw Error("orphan footer " + n);
      }
    });
    await page.evaluate(async () => {
      state = defaults();
      for (let i = 6; i < 35; i++)
        state.properties.push(
          newProperty("Property " + (i + 1), "House", 3, 6, "Residential area"),
        );
      changed();
      render();
      await flushSave();
    });
    assert.equal(await page.locator(".company-header").count(), 1);
    assert.equal(await page.locator(".mailing-footer").count(), 1);
    await page.screenshot({
      path: path.join(out, "desktop.png"),
      fullPage: true,
    });
    await page.pdf({
      path: path.join(out, "desktop.pdf"),
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: true,
    });
    const desktopRects = await page.evaluate(() => {
      document.body.dataset.test = "";
      return paginate(state.properties).map((p) =>
        p.rows.map((r) => r.items.map((p) => p.id)),
      );
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: path.join(out, "mobile.png"),
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      390,
    );
    await page.pdf({
      path: path.join(out, "mobile.pdf"),
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: true,
    });
    assert.deepEqual(
      await page.evaluate(() =>
        paginate(state.properties).map((p) =>
          p.rows.map((r) => r.items.map((p) => p.id)),
        ),
      ),
      desktopRects,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: autosave/reload, Blob optimization, pointer/keyboard sorting, date formatting, text safety, reset, empty state, 0–100 pagination, mobile layout and PDF generation.",
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((error) => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
