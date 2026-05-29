import path from "path";
import { writeFile } from "fs/promises";
import { tmpdir } from "os";
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
  await expect(page.getByText("Review and Correct Fields")).toBeVisible();
  await expect(page.getByRole("button", { name: "Skip AI / Enter Manually" })).toBeVisible();

  const tagNumberInput = page.getByRole("textbox", { name: /Tag #/ }).first();
  await tagNumberInput.fill("TQ 428");
  await page.getByLabel("Torqued by").fill("Dill, Bob");
  await page.getByLabel("Torque applied ft/lbs").fill("150");
  await page.getByLabel("Expected torque ft/lbs").fill("151");
  await expect(page.getByText("Expected torque and applied torque do not match.")).toBeVisible();
  await page.getByLabel("Expected torque ft/lbs").fill("150");

  await page.getByRole("checkbox").check();
  await tagNumberInput.fill("");
  await expect(page.getByText("Tag number is required before generating the report.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Generate DS 2.12 Word report/i })).toBeDisabled();
  await tagNumberInput.fill("TQ 428");
  await page.getByLabel("Torque applied ft/lbs").fill("");
  await expect(page.getByText("Torque applied ft/lbs is required before generating the report.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Generate DS 2.12 Word report/i })).toBeDisabled();
  await page.getByLabel("Torque applied ft/lbs").fill("150");
  await page.getByLabel("Torqued by").fill("");
  await expect(page.getByText("Torqued by is required before generating the report.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Generate DS 2.12 Word report/i })).toBeDisabled();
  await page.getByLabel("Torqued by").fill("Dill, Bob");

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

  const certPath = path.join(tmpdir(), `torque-cert-${Date.now()}.pdf`);
  await writeFile(certPath, "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");
  await page.locator('input[type="file"]').setInputFiles(certPath);
  await page.getByRole("button", { name: /Upload certificate/i }).click();
  await expect(page.getByText("Certificate uploaded.")).toBeVisible();
});
