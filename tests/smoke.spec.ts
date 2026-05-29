import path from "path";
import { expect, test } from "@playwright/test";

test("field workflow smoke test", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Active Job Dashboard")).toBeVisible();
  await expect(
    page.getByText("MVP documentation tool only. Confirm torque values against approved torque package before use."),
  ).toBeVisible();

  await page.goto("/submit");
  await expect(page.getByRole("heading", { name: "Capture Completed Torque Tag" })).toBeVisible();
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles(path.join(process.cwd(), "public", "examples", "filled-torque-tag.jpeg"));

  await page.getByRole("button", { name: /Extract tag data/i }).click();
  await expect(page.locator('input[value="TQ 428"]').first()).toBeVisible();
  await expect(page.getByText("Review and Correct Fields")).toBeVisible();

  await page.getByRole("checkbox").check();
  const generateResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/generate-report") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /Generate DS 2.12 Word report/i }).click();
  const generateResponse = await generateResponsePromise;
  expect(generateResponse.ok()).toBeTruthy();
  const generatePayload = (await generateResponse.json()) as { report?: { url?: string } };
  expect(generatePayload.report?.url).toMatch(/\.docx/);

  await expect(page.getByRole("link", { name: /Download generated DOCX/i })).toBeVisible();
  const docxResponse = await page.request.get(generatePayload.report!.url!);
  expect(docxResponse.ok()).toBeTruthy();
  expect(docxResponse.headers()["content-type"]).toContain(
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );

  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Generated Reports" })).toBeVisible();
  await expect(page.getByRole("link", { name: "DOCX" }).first()).toBeVisible();

  await page.goto("/certs");
  await expect(page.getByRole("heading", { name: "Wrench Certificates" })).toBeVisible();
  await expect(page.getByText("PDF-only storage for Phase 1 reference")).toBeVisible();
});
