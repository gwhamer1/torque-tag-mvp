import OpenAI from "openai";
import type { TorqueTagFields } from "@/lib/types";

export const EXTRACTION_PROMPT = `This is a Reed Energy Group torque tag with three colored sections:

1. White top / inspection header:
- Job #
- Tag #
- Inspected By
- Inspected Date

2. White middle / final torque:
- Torqued By
- Torque Wrench #
- Torque Applied
- Date

3. Yellow / re-installed:
- Gasket Type
- Flange Cleaned
- Installed By
- Date

4. Red / disturbed:
- Disturbed By
- Date

Extract all handwritten values from the labeled boxes.

Return ONLY valid JSON. No markdown. No explanation.

Use this exact shape:
{
  "job_number": string | null,
  "tag_number": string | null,
  "inspected_by": string | null,
  "inspected_date": string | null,
  "torqued_by": string | null,
  "torque_wrench_number": string | null,
  "torque_applied_ftlbs": number | null,
  "torque_date": string | null,
  "gasket_type": string | null,
  "flange_cleaned": boolean | null,
  "installed_by": string | null,
  "reinstall_date": string | null,
  "disturbed_by": string | null,
  "disturbed_date": string | null,
  "ocr_confidence": number,
  "notes": string | null
}

If a field is blank or illegible, use null.
Normalize dates to MM/DD/YYYY when possible.
For torque_applied_ftlbs, return the number only and strip FT/LBS text.
For flange_cleaned, return true if the field appears checked/marked yes, false if clearly no, null if unclear.`;

const emptyExtraction: TorqueTagFields = {
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

export function demoExtraction(originalName: string): TorqueTagFields {
  if (originalName.toLowerCase().includes("filled-torque-tag")) {
    return {
      job_number: "QC",
      tag_number: "TQ 428",
      inspected_by: "Keith Ressel",
      inspected_date: "05/29/2026",
      torqued_by: "Dill, Bob",
      torque_wrench_number: "TW #65 or 6 mod",
      torque_applied_ftlbs: 150,
      torque_date: "05/29/2026",
      gasket_type: "C15",
      flange_cleaned: true,
      installed_by: "Cole Formuth",
      reinstall_date: "05/29/2026",
      disturbed_by: null,
      disturbed_date: null,
      ocr_confidence: 0.72,
      notes: "Demo extraction used because OPENAI_API_KEY is not configured.",
    };
  }

  return {
    ...emptyExtraction,
    notes: "OPENAI_API_KEY is not configured. Fields are ready for manual review.",
  };
}

export function normalizeExtraction(value: unknown): TorqueTagFields {
  const raw = typeof value === "object" && value ? (value as Record<string, unknown>) : {};
  const asString = (key: string) => {
    const item = raw[key];
    return typeof item === "string" && item.trim() ? item.trim() : null;
  };
  const asNumber = (key: string) => {
    const item = raw[key];
    if (typeof item === "number" && Number.isFinite(item)) return item;
    if (typeof item === "string") {
      const parsed = Number(item.replace(/[^\d.]/g, ""));
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };
  const asBoolean = (key: string) => {
    const item = raw[key];
    if (typeof item === "boolean") return item;
    if (typeof item === "string") {
      if (/^(yes|true|y|checked)$/i.test(item.trim())) return true;
      if (/^(no|false|n|unchecked)$/i.test(item.trim())) return false;
    }
    return null;
  };

  return {
    job_number: asString("job_number"),
    tag_number: asString("tag_number"),
    inspected_by: asString("inspected_by"),
    inspected_date: asString("inspected_date"),
    torqued_by: asString("torqued_by"),
    torque_wrench_number: asString("torque_wrench_number"),
    torque_applied_ftlbs: asNumber("torque_applied_ftlbs"),
    torque_date: asString("torque_date"),
    gasket_type: asString("gasket_type"),
    flange_cleaned: asBoolean("flange_cleaned"),
    installed_by: asString("installed_by"),
    reinstall_date: asString("reinstall_date"),
    disturbed_by: asString("disturbed_by"),
    disturbed_date: asString("disturbed_date"),
    ocr_confidence:
      typeof raw.ocr_confidence === "number" && Number.isFinite(raw.ocr_confidence)
        ? Math.max(0, Math.min(1, raw.ocr_confidence))
        : 0,
    field_confidence:
      typeof raw.field_confidence === "object" && raw.field_confidence
        ? (raw.field_confidence as TorqueTagFields["field_confidence"])
        : undefined,
    notes: asString("notes"),
  };
}

export async function extractTagWithVision(
  imageBuffer: Buffer,
  mimeType: string,
  originalName: string,
): Promise<TorqueTagFields> {
  if (!process.env.OPENAI_API_KEY) {
    return demoExtraction(originalName);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.responses.create({
    model: process.env.OPENAI_VISION_MODEL ?? "gpt-4.1",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: EXTRACTION_PROMPT },
          {
            type: "input_image",
            image_url: `data:${mimeType};base64,${imageBuffer.toString("base64")}`,
            detail: "high",
          },
        ],
      },
    ],
  });

  const text = response.output_text?.trim() ?? "";
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  const json = jsonStart >= 0 && jsonEnd >= jsonStart ? text.slice(jsonStart, jsonEnd + 1) : text;

  return normalizeExtraction(JSON.parse(json));
}
