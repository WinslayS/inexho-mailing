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
          : file.endsWith(".png")
            ? "image/png"
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
    assert.match(await page.locator(".app-brand").textContent(), /INEXHO Mailing list/);
    assert.equal(await page.locator(".toolbar input[type=date]").count(), 0);
    assert.equal(await page.locator('[aria-label="List publication date"]').inputValue(), await page.evaluate(() => today()));
    assert.equal(await page.locator('[data-field="subtitle"]').textContent(), "Short & long stay accommodation");
    assert.deepEqual(await page.locator('[data-field="area"]').allTextContents(), ["South Holland", "South Holland", "North Holland", "North Holland", "North Holland", "North Holland"]);
    assert.equal(await page.locator(".copy, [data-copy]").count(), 0);
    assert.doesNotMatch(await page.locator(".facts").first().textContent(), /Region:/);
    assert.doesNotMatch(await page.locator(".footer-note").textContent(), /Heating included/);
    assert.match(await page.locator(".list-date").textContent(), /List date/);
    assert.equal(await page.locator(".date-edit-hint").count(), 0);
    assert.equal(await page.locator('[data-field="area"]').first().getAttribute("data-placeholder"), "Region");
    assert.match(await page.locator(".summary").textContent(), /total capacity/);
    assert.doesNotMatch(await page.locator(".summary").textContent(), /maximum/);
    const numberField = page.locator('[data-field="bedrooms"]').first();
    // Numbers and step controls remain visible without hover/focus.
    await page.mouse.move(0, 0);
    await page.locator("#add").focus();
    for (const [field, initial] of [["bedrooms", "4"], ["persons", "8"]]) {
      const input = page.locator(`[data-field="${field}"]`).first();
      for (const value of ["4", "12", "9999"]) {
        await input.fill(value);
        await input.blur();
        await page.mouse.move(0, 0);
        assert(await input.evaluate(e => e.clientWidth >= e.scrollWidth), "Number must not be clipped without hover/focus");
      }
      await input.fill(initial);
      await input.blur();
      const up = page.getByRole("button", { name: `Increase ${field}`, exact: true }).first();
      const down = page.getByRole("button", { name: `Decrease ${field}`, exact: true }).first();
      await up.click();
      assert.equal(await input.inputValue(), String(Number(initial) + 1));
      await down.click();
      assert.equal(await input.inputValue(), initial);
      await input.fill("9999");
      await up.click();
      assert.equal(await input.inputValue(), "9999");
      await input.fill("0");
      await down.click();
      assert.equal(await input.inputValue(), "0");
      await input.fill(initial);
      await input.blur();
    }
    await numberField.focus();
    assert.equal(await numberField.evaluate(e => getComputedStyle(e).appearance), "textfield");
    const singleDigitWidth = await numberField.evaluate(e => e.getBoundingClientRect().width);
    await numberField.fill("12");
    const doubleDigitWidth = await numberField.evaluate(e => e.getBoundingClientRect().width);
    assert(doubleDigitWidth > singleDigitWidth && doubleDigitWidth < singleDigitWidth * 2.1);
    await numberField.fill("9999");
    assert((await numberField.evaluate(e => e.getBoundingClientRect().width)) > doubleDigitWidth);
    await numberField.fill("4");
    assert.equal(await numberField.evaluate(e => e.getBoundingClientRect().width), singleDigitWidth);
    await numberField.press("ArrowUp");
    assert.equal(await numberField.inputValue(), "5");
    await numberField.press("ArrowDown");
    assert.equal(await numberField.inputValue(), "4");
    await numberField.blur();
    await page.mouse.move(0, 0);
    assert.equal(await numberField.evaluate(e => e.getBoundingClientRect().width), singleDigitWidth);
    assert.deepEqual(await page.locator(".company-section-title").allTextContents(), ["CONTACT", "ADDRESS"]);
    assert.deepEqual(await page.locator(".features > div").allTextContents(), ["Furnished", "Fully equipped kitchen", "Washing machine", "Wi-Fi", "Parking", "SNF standards"]);
    assert.equal(await page.locator(".fact .icon path").first().getAttribute("d"), await page.locator(".features .icon path").first().getAttribute("d"));
    assert.deepEqual(await page.locator(".compact-card").evaluateAll(cards => cards.map(c => getComputedStyle(c).backgroundColor)), ["rgb(255, 255, 255)", "rgb(233, 238, 241)", "rgb(0, 59, 92)"]);
    await page.locator('[data-field="subtitle"]').fill("Accommodation for your team");
    await page.locator('[aria-label="List publication date"]').fill("2026-10-23");
    await page.locator('[aria-label="List publication date"]').blur();
    await saved();
    await page.reload();
    await saved();
    assert.equal(await page.locator('[data-field="subtitle"]').textContent(), "Accommodation for your team");
    assert.equal(await page.locator('[aria-label="List publication date"]').inputValue(), "2026-10-23");
    assert.equal(await page.locator("[data-list-date]").textContent(), "23 Oct 2026");
    assert.equal(await page.title(), "INEXHO Mailing list - 2026-10-23");
    assert.match(await page.locator(".badge").first().textContent(), /Available now/);
    // Both browser printing and the export button refresh the filename hint.
    await page.evaluate(() => { document.title = "stale"; window.dispatchEvent(new Event("beforeprint")); });
    assert.equal(await page.title(), "INEXHO Mailing list - 2026-10-23");
    await page.evaluate(() => { window.originalPrint = window.print; window.print = () => { window.printTitle = document.title; }; document.title = "stale"; });
    await page.locator("#export").click();
    await page.waitForFunction(() => window.printTitle === "INEXHO Mailing list - 2026-10-23");
    await page.evaluate(() => { window.print = window.originalPrint; });
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
    // Upload runs a movement animation: measure the settled layout, not its transform.
    await page.evaluate(async () => { await Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))); });
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
    for (const theme of ["light", "grey", "navy"]) {
      const control = page.locator(`.compact-card.${theme} .number-control`).first();
      const metrics = await control.evaluate(e => {
        const button = e.querySelector(".number-step");
        const style = getComputedStyle(button);
        const b = button.getBoundingClientRect(), svg = button.querySelector("svg").getBoundingClientRect();
        return { background: style.backgroundColor, border: style.borderWidth, color: style.color, inputColor: getComputedStyle(e.querySelector("input")).color, fits: svg.top >= b.top && svg.bottom <= b.bottom };
      });
      assert.equal(metrics.background, "rgba(0, 0, 0, 0)");
      assert.equal(metrics.border, "0px");
      assert.equal(metrics.color, metrics.inputColor);
      assert(metrics.fits, "Stepper arrow must fit inside its button");
    }
    // A pre-update document must retain all records, edits and image Blobs.
    const legacyProperties = await page.evaluate(async () => {
      state.properties[0].area = "Existing user region";
      delete state.company.subtitle;
      delete state.listDate;
      await queueSave();
      return state.properties.map(p => ({ id: p.id, city: p.city, area: p.area, photos: p.photos.map(x => x.id) }));
    });
    await page.reload();
    await saved();
    assert.deepEqual(await page.evaluate(() => state.properties.map(p => ({ id: p.id, city: p.city, area: p.area, photos: p.photos.map(x => x.id) }))), legacyProperties);
    assert.equal(await page.locator('[data-field="subtitle"]').textContent(), "Short & long stay accommodation");
    assert.equal(await page.locator('[aria-label="List publication date"]').inputValue(), await page.evaluate(() => today()));
    assert.equal(await page.evaluate(async () => (await readState()).company.subtitle), "Short & long stay accommodation");
    assert.equal(await page.locator(`[data-id="${initialID}"] img`).count(), 3);
    await page.locator('[aria-label="List publication date"]').fill("2027-02-14");
    await saved();
    await page.reload();
    await saved();
    assert.equal(await page.locator("[data-list-date]").textContent(), "14 Feb 2027");
    assert.equal(await page.title(), "INEXHO Mailing list - 2027-02-14");
    await page.emulateMedia({ media: "print" });
    await page.evaluate(async () => {
      await Promise.all([...document.querySelectorAll("#pages img")].map(img => img.decode()));
      const box = selector => document.querySelector(selector).getBoundingClientRect();
      if (Math.abs(box(".company-header").height - 36 * 96 / 25.4) > 1) throw Error("Header height changed");
      if (Math.abs(box(".mailing-footer").height - 28 * 96 / 25.4) > 1) throw Error("Footer height changed");
      for (const img of document.querySelectorAll(".app-mark, .logo")) {
        const css = getComputedStyle(img);
        if (css.backgroundColor !== "rgba(0, 0, 0, 0)" || css.borderWidth !== "0px" || css.objectFit !== "contain") throw Error("Logo frame or distortion");
      }
      for (const [container, children] of [[".company-header", ".brand-lockup, .company-contact, .company-address, .brand-lockup > div"], [".mailing-footer", ".summary, .footer-note, .features > div"]]) {
        const bounds = box(container);
        for (const child of document.querySelectorAll(children)) {
          const r = child.getBoundingClientRect();
          if (r.top < bounds.top - 1 || r.bottom > bounds.bottom + 1 || r.left < bounds.left - 1 || r.right > bounds.right + 1 || child.scrollWidth > child.clientWidth + 1) throw Error("Header/footer content overflow: " + child.className);
        }
      }
      if (document.querySelector(".logo").getBoundingClientRect().width !== 96 || document.querySelector(".company-logo").getBoundingClientRect().width !== 72) throw Error("Logo size or layout slot changed");
      if ([...document.querySelectorAll(".number-steps")].some(e => getComputedStyle(e).display !== "none")) throw Error("Number step controls printed");
      const headerItems = [".company-logo", ".brand-lockup > div", ".company-contact", ".company-address"].map(box);
      for (let i = 1; i < headerItems.length; i++) if (headerItems[i].left < headerItems[i-1].right) throw Error("Header columns overlap");
      for (const card of document.querySelectorAll(".property-card")) {
        const facts = card.querySelectorAll(".fact");
        if (facts[1].getBoundingClientRect().top < facts[0].getBoundingClientRect().bottom) throw Error("Bedrooms/persons share a row");
      }
      for (const img of document.querySelectorAll(".photo img")) {
        if (!img.complete || !img.naturalWidth || img.getBoundingClientRect().height <= 0) throw Error("Missing print photo");
      }
      if (getComputedStyle(document.querySelector('[aria-label="List publication date"]')).display !== "none") throw Error("Date input printed");
    });
    await page.screenshot({path: path.join(out, "updated-print.png"), fullPage: true});
    await page.pdf({path: path.join(out, "updated-a4.pdf"), preferCSSPageSize: true, printBackground: true});
    await page.emulateMedia({ media: "screen" });
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
    await page.mouse.move(0, 0);
    assert(await page.locator(".number-input").evaluateAll(inputs => inputs.every(e => e.clientWidth >= e.scrollWidth)), "Mobile numbers must not be clipped without hover/focus");
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
    // The default is a local calendar date, including across the UTC boundary.
    const localPage = await browser.newPage({ timezoneId: "Pacific/Kiritimati" });
    await localPage.clock.install({ time: new Date("2026-10-23T12:30:00Z") });
    await localPage.goto(`http://127.0.0.1:${server.address().port}/`);
    await localPage.waitForFunction(() => document.querySelector("#save-status").textContent === "Saved ✓");
    assert.equal(await localPage.locator('[aria-label="List publication date"]').inputValue(), "2026-10-24");
    await localPage.locator('[data-field="subtitle"]').fill("");
    await localPage.locator('[data-field="subtitle"]').blur();
    await localPage.waitForFunction(() => document.querySelector("#save-status").textContent === "Saved ✓");
    await localPage.reload();
    await localPage.waitForFunction(() => document.querySelector("#save-status").textContent === "Saved ✓");
    assert.equal(await localPage.locator('[data-field="subtitle"]').textContent(), "");
    await localPage.close();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: autosave/reload, Blob optimization, pointer/keyboard sorting, date formatting, text safety, reset, empty state, 0–100 pagination, mobile layout and PDF generation; subtitle/list-date persistence, legacy migration with photos, print title, six shared-style features, three card colours and fixed header/footer bounds.",
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
