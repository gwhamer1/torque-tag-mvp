"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, Download, Loader2, Upload } from "lucide-react";
import { validateReportForm } from "@/lib/reportValidation";
import type { ReportFormData, StoredFile, TorqueTagFields } from "@/lib/types";

type ExtractionResponse = {
  recordId: string;
  photo: StoredFile;
  extracted: TorqueTagFields;
  status: string;
};

const today = () => new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });

const blankExtraction: TorqueTagFields = {
  job_number: null,
  tag_number: null,
  inspected_by: null,
  inspected_date: null,
  torqued_by: null,
  torque_wrench_number: null,
  torque_applied_ftlbs: null,
  torque_date: null,
  gasket_type: null,
  flange_cleaned: null,
  installed_by: null,
  reinstall_date: null,
  disturbed_by: null,
  disturbed_date: null,
  ocr_confidence: 0,
  notes: null,
};

const reviewFields: Array<{ key: keyof TorqueTagFields; label: string; type?: "number" | "boolean" }> = [
  { key: "job_number", label: "Job #" },
  { key: "tag_number", label: "Tag #" },
  { key: "inspected_by", label: "Inspected by" },
  { key: "inspected_date", label: "Inspected date" },
  { key: "torqued_by", label: "Torqued by" },
  { key: "torque_wrench_number", label: "Torque wrench #" },
  { key: "torque_applied_ftlbs", label: "Torque applied ft/lbs", type: "number" },
  { key: "torque_date", label: "Torque date" },
  { key: "gasket_type", label: "Gasket type" },
  { key: "flange_cleaned", label: "Flange cleaned", type: "boolean" },
  { key: "installed_by", label: "Installed by" },
  { key: "reinstall_date", label: "Re-install date" },
  { key: "disturbed_by", label: "Disturbed by" },
  { key: "disturbed_date", label: "Disturbed date" },
];

const reportFields: Array<{ key: keyof ReportFormData; label: string; type?: "number" }> = [
  { key: "worker_name", label: "Worker name" },
  { key: "expected_torque_ftlbs", label: "Expected torque ft/lbs", type: "number" },
  { key: "report_number", label: "Report number" },
  { key: "report_date", label: "Report date" },
  { key: "pembina_job_number", label: "Pembina job number" },
  { key: "project_name", label: "Project name" },
  { key: "location", label: "Location" },
  { key: "customer_flange_tag_number", label: "Customer flange tag #" },
  { key: "drawing_number", label: "Drawing number" },
  { key: "flange_size", label: "Flange size" },
  { key: "flange_class", label: "Flange class" },
  { key: "flange_series", label: "Flange series" },
  { key: "wrench_socket_size", label: "Wrench/socket size" },
  { key: "lubrication", label: "Lubrication" },
  { key: "torque_value_specified", label: "Torque value specified", type: "number" },
  { key: "stud_material", label: "Stud material" },
  { key: "nut_material", label: "Nut material" },
];

function initialForm(extracted: TorqueTagFields, photoFileName: string): ReportFormData {
  const torque = extracted.torque_applied_ftlbs;
  return {
    ...extracted,
    worker_name: extracted.torqued_by ?? "",
    expected_torque_ftlbs: null,
    report_number: extracted.tag_number ? `DS-2.12-${extracted.tag_number}` : `DS-2.12-${Date.now()}`,
    report_date: today(),
    pembina_job_number: extracted.job_number ?? "",
    project_name: "",
    location: "",
    customer_flange_tag_number: extracted.tag_number ?? "",
    drawing_number: "",
    flange_size: "",
    flange_class: "",
    flange_series: "",
    wrench_socket_size: "",
    lubrication: "JET LUBE 550",
    torque_value_specified: torque,
    stud_material: "",
    nut_material: "",
    photo_file_name: photoFileName,
  };
}

export function SubmitFlow() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [form, setForm] = useState<ReportFormData>(() => initialForm(blankExtraction, ""));
  const [photo, setPhoto] = useState<StoredFile | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  const torqueMismatch = useMemo(() => {
    if (!form.expected_torque_ftlbs || !form.torque_applied_ftlbs) return false;
    return Number(form.expected_torque_ftlbs) !== Number(form.torque_applied_ftlbs);
  }, [form.expected_torque_ftlbs, form.torque_applied_ftlbs]);
  const validationErrors = useMemo(() => validateReportForm(form), [form]);

  function updateField(key: keyof ReportFormData, value: string) {
    const numericKeys: Array<keyof ReportFormData> = [
      "expected_torque_ftlbs",
      "torque_applied_ftlbs",
      "torque_value_specified",
    ];
    setForm((current) => ({
      ...current,
      [key]: numericKeys.includes(key) ? (value === "" ? null : Number(value)) : value,
    }));
  }

  async function extract() {
    if (!file) return;
    setError(null);
    setReportUrl(null);
    setConfirmed(false);
    setIsExtracting(true);

    try {
      const body = new FormData();
      body.append("photo", file);
      const response = await fetch("/api/extract-tag", { method: "POST", body });
      const payload = (await response.json()) as ExtractionResponse | { error: string };
      if (!response.ok || "error" in payload) throw new Error("error" in payload ? payload.error : "Extraction failed.");
      setRecordId(payload.recordId);
      setPhoto(payload.photo);
      setForm(initialForm(payload.extracted, payload.photo.fileName));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed.");
    } finally {
      setIsExtracting(false);
    }
  }

  async function generateReport() {
    if (!recordId) return;
    if (validationErrors.length > 0) {
      setError(validationErrors.join(" "));
      return;
    }
    setError(null);
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, form }),
      });
      const payload = (await response.json()) as { report?: StoredFile; error?: string };
      if (!response.ok || payload.error || !payload.report) throw new Error(payload.error ?? "Report generation failed.");
      setReportUrl(payload.report.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-md border border-[#d8ddd3] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Camera aria-hidden className="mt-1 size-5 text-[#1f6f43]" />
          <div>
            <h1 className="text-xl font-semibold">Capture Completed Torque Tag</h1>
            <ul className="mt-3 grid gap-2 text-sm text-[#607066]">
              <li>Hold tag flat.</li>
              <li>Fill the frame.</li>
              <li>Avoid glare.</li>
              <li>Use good lighting.</li>
            </ul>
          </div>
        </div>

        <label className="mt-5 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-[#9fb7a9] bg-[#fbfcf8] p-4 text-center hover:bg-[#eef4ed]">
          <Upload aria-hidden className="mb-3 size-6 text-[#1f6f43]" />
          <span className="font-semibold">Take photo or upload image</span>
          <span className="mt-1 text-sm text-[#607066]">JPEG, PNG, WEBP, or GIF</span>
          <input
            className="sr-only"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              setFile(selected);
              setPreview(selected ? URL.createObjectURL(selected) : null);
            }}
          />
        </label>

        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Selected torque tag preview" className="mt-4 max-h-[420px] w-full rounded-md object-contain" />
        ) : null}

        <button
          type="button"
          disabled={!file || isExtracting}
          onClick={extract}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#1f6f43] px-4 py-3 text-sm font-semibold text-white hover:bg-[#185a36] disabled:cursor-not-allowed disabled:bg-[#9fb7a9]"
        >
          {isExtracting ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Camera aria-hidden className="size-4" />}
          Extract tag data
        </button>

        {photo ? (
          <a href={photo.url} className="mt-3 inline-block text-sm font-semibold text-[#1f6f43]">
            Open saved photo
          </a>
        ) : null}
      </section>

      <section className="rounded-md border border-[#d8ddd3] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Review and Correct Fields</h2>
            <p className="mt-1 text-sm text-[#607066]">Every extracted value stays editable before the DS 2.12 report is generated.</p>
          </div>
          <span className="rounded-md bg-[#eef4ed] px-2 py-1 text-xs font-semibold text-[#1f6f43]">
            OCR {Math.round((form.ocr_confidence ?? 0) * 100)}%
          </span>
        </div>

        {error ? (
          <div className="mb-4 rounded-md border border-[#e5b4a5] bg-[#fff5ef] p-3 text-sm font-medium text-[#8a321b]">{error}</div>
        ) : null}

        {form.notes ? <p className="mb-4 rounded-md bg-[#fbfcf8] p-3 text-sm text-[#607066]">{form.notes}</p> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {reviewFields.map((field) => {
            const value = form[field.key];
            const confidence = form.field_confidence?.[field.key];
            const needsAttention = value === null || value === "" || (typeof confidence === "number" && confidence < 0.75);
            return (
              <label key={field.key} className="grid gap-1">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {field.label}
                  {needsAttention ? <AlertTriangle aria-hidden className="size-4 text-[#b15b24]" /> : null}
                </span>
                {field.type === "boolean" ? (
                  <select
                    value={value === null ? "" : value ? "true" : "false"}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        flange_cleaned: event.target.value === "" ? null : event.target.value === "true",
                      }))
                    }
                    className="h-11 rounded-md border border-[#cbd3c7] bg-white px-3 text-sm outline-none focus:border-[#1f6f43]"
                  >
                    <option value="">Unclear</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    value={value === null ? "" : String(value)}
                    onChange={(event) => updateField(field.key, event.target.value)}
                    className={`h-11 rounded-md border bg-white px-3 text-sm outline-none focus:border-[#1f6f43] ${
                      needsAttention ? "border-[#d69b69] bg-[#fffaf3]" : "border-[#cbd3c7]"
                    }`}
                  />
                )}
              </label>
            );
          })}
        </div>

        <div className="mt-6 border-t border-[#edf0ea] pt-5">
          <h3 className="text-base font-semibold">Report details</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {reportFields.map((field) => (
              <label key={field.key} className="grid gap-1">
                <span className="text-sm font-semibold">{field.label}</span>
                <input
                  type={field.type === "number" ? "number" : "text"}
                  value={form[field.key] === null ? "" : String(form[field.key])}
                  onChange={(event) => updateField(field.key, event.target.value)}
                  className="h-11 rounded-md border border-[#cbd3c7] bg-white px-3 text-sm outline-none focus:border-[#1f6f43]"
                />
              </label>
            ))}
          </div>
        </div>

        {torqueMismatch ? (
          <div className="mt-4 flex gap-3 rounded-md border border-[#e0b15a] bg-[#fff8e6] p-3 text-sm text-[#6f4a10]">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            Expected torque and applied torque do not match. Correct either value or continue when the physical torque package supports it.
          </div>
        ) : null}

        <label className="mt-5 flex items-start gap-3 rounded-md border border-[#d8ddd3] bg-[#fbfcf8] p-3 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-1 size-4 accent-[#1f6f43]"
          />
          <span>I reviewed and corrected the extracted fields. Typed names are used for approval fields.</span>
        </label>

        <button
          type="button"
          disabled={!recordId || !confirmed || isGenerating || validationErrors.length > 0}
          onClick={generateReport}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#1f6f43] px-4 py-3 text-sm font-semibold text-white hover:bg-[#185a36] disabled:cursor-not-allowed disabled:bg-[#9fb7a9]"
        >
          {isGenerating ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <CheckCircle2 aria-hidden className="size-4" />}
          Generate DS 2.12 Word report
        </button>

        {validationErrors.length > 0 ? (
          <div className="mt-3 rounded-md border border-[#e5b4a5] bg-[#fff5ef] p-3 text-sm font-medium text-[#8a321b]">
            {validationErrors.join(" ")}
          </div>
        ) : null}

        {reportUrl ? (
          <a
            href={reportUrl}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#1f6f43] bg-white px-4 py-3 text-sm font-semibold text-[#1f6f43] hover:bg-[#eef4ed]"
          >
            <Download aria-hidden className="size-4" />
            Download generated DOCX
          </a>
        ) : null}
      </section>
    </div>
  );
}
