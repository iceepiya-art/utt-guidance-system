// Run after npm run dev -- --host 127.0.0.1 --port 3011 --strictPort.
// Playwright is installed outside the repository to avoid changing app dependencies.
const path = require("node:path");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const { chromium } = require(
  path.join(
    require("node:os").tmpdir(),
    "utt-monthly-report-qa/node_modules/playwright",
  ),
);

(async () => {
  const output = path.resolve("docs/qa-monthly-report");
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const errors = [],
    blocked = [];
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("http://127.0.0.1:3011/") || url.startsWith("data:"))
      return route.continue();
    blocked.push(url);
    return route.abort();
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto("http://127.0.0.1:3011/tests/browser/monthly-report.html");
  await page.getByLabel("ปี พ.ศ.", { exact: true }).selectOption("2026");
  await page.getByLabel("เดือน", { exact: true }).selectOption("9");
  const desktopRows = page.locator(".monthly-desktop tbody tr");
  assert.equal(await desktopRows.count(), 6);
  for (const [name, width, height] of [
    ["1366", 1366, 768],
    ["1920", 1920, 1080],
    ["mobile", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.screenshot({
      path: path.join(output, `${name}.png`),
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `overflow at ${name}`,
    );
  }
  await page.locator(".monthly-card").first().click();
  await page
    .getByRole("dialog", { name: "รายละเอียดการยื่นหนังสือ" })
    .waitFor();
  assert.ok(
    (
      await page
        .getByRole("dialog", { name: "รายละเอียดการยื่นหนังสือ" })
        .innerText()
    ).includes("QA-001"),
  );
  await page.locator(".monthly-source-detail img").click();
  await page.getByRole("dialog", { name: "รูปหลักฐานต้นทาง" }).waitFor();
  await page.getByRole("button", { name: "ปิดรูป", exact: true }).click();
  await page
    .getByRole("button", { name: "ปิดรายละเอียด", exact: true })
    .click();
  await page.setViewportSize({ width: 1366, height: 768 });
  for (const [team, count] of [
    ["team1", 2],
    ["team2", 4],
    ["all", 6],
  ]) {
    await page.getByLabel("สายงาน", { exact: true }).selectOption(team);
    assert.equal(await desktopRows.count(), count);
  }
  for (const work of ["SUBMISSION", "GUIDANCE"]) {
    await page.getByLabel("ประเภทงาน", { exact: true }).selectOption(work);
    assert.equal(await desktopRows.count(), 3);
  }
  await desktopRows.first().focus();
  await page.keyboard.press("Enter");
  const tripDialog = page.getByRole("dialog", {
    name: "รายละเอียดการออกแนะแนว",
  });
  await tripDialog.waitFor();
  assert.ok((await tripDialog.innerText()).includes("ผลกิจกรรมสมมติ"));
  await page.screenshot({
    path: path.join(output, "source-detail.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  assert.equal(await tripDialog.count(), 0);
  await desktopRows.first().focus();
  await page.keyboard.press("Space");
  await tripDialog.waitFor();
  await page.keyboard.press("Escape");
  await page.getByLabel("ประเภทงาน", { exact: true }).selectOption("all");
  await page.getByLabel("เดือน", { exact: true }).selectOption("10");
  assert.ok((await desktopRows.innerText()).includes("ไม่มีรายการ"));
  await page.getByLabel("เดือน", { exact: true }).selectOption("9");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Excel", exact: true }).click();
  await (await download).saveAs(path.join(output, "monthly-report.xlsx"));
  await page.emulateMedia({ media: "print" });
  assert.equal(await page.locator(".monthly-report").isVisible(), false);
  assert.equal(await page.locator(".monthly-print-document").isVisible(), true);
  assert.equal(await page.locator(".monthly-print-document img").count(), 0);
  assert.equal(await page.locator(".monthly-print-document th").count(), 6);
  assert.ok(
    !(await page.locator(".monthly-print-document").innerText()).includes(
      "98765",
    ),
  );
  await page.screenshot({
    path: path.join(output, "print-preview.png"),
    fullPage: true,
  });
  await page.pdf({
    path: path.join(output, "monthly-report.pdf"),
    preferCSSPageSize: true,
    printBackground: true,
  });
  await page.emulateMedia({ media: "screen" });
  await page.goto(
    "http://127.0.0.1:3011/tests/browser/monthly-report.html?many",
  );
  await page.getByLabel("ปี พ.ศ.", { exact: true }).selectOption("2026");
  await page.getByLabel("เดือน", { exact: true }).selectOption("9");
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: path.join(output, "multipage.pdf"),
    preferCSSPageSize: true,
  });
  assert.deepEqual(blocked, []);
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(output, "results.json"),
    JSON.stringify(
      {
        passed: true,
        errors,
        blocked,
        viewports: ["1366x768", "1920x1080", "390x844"],
        rows: 6,
        sourceDetails: ["SUBMISSION", "GUIDANCE"],
        export: "Excel + A4 landscape PDF",
      },
      null,
      2,
    ),
  );
  await browser.close();
  console.log("Monthly report browser QA PASS");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
