import OpenAI from "openai";
import sharp from "sharp";
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
  "field_confidence": {
    "job_number": number,
    "tag_number": number,
    "inspected_by": number,
    "inspected_date": number,
    "torqued_by": number,
    "torque_wrench_number": number,
    "torque_applied_ftlbs": number,
    "torque_date": number,
    "gasket_type": number,
    "flange_cleaned": number,
    "installed_by": number,
    "reinstall_date": number,
    "disturbed_by": number,
    "disturbed_date": number
  },
  "notes": string | null
}

If a field is blank or illegible, use null.
Normalize dates to MM/DD/YYYY when possible.
For torque_applied_ftlbs, return the number only and strip FT/LBS text.
For flange_cleaned, return true if the field appears checked/marked yes, false if clearly no, null if unclear.
For field_confidence, use 0 to 1 for each field. Use confidence below 0.75 for any field that is hard to read, inferred, conflicting between images, or only partially legible.`;

export const emptyExtraction: TorqueTagFields = {
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
  field_confidence: {
    job_number: 0,
    tag_number: 0,
    inspected_by: 0,
    inspected_date: 0,
    torqued_by: 0,
    torque_wrench_number: 0,
    torque_applied_ftlbs: 0,
    torque_date: 0,
    gasket_type: 0,
    flange_cleaned: 0,
    installed_by: 0,
    reinstall_date: 0,
    disturbed_by: 0,
    disturbed_date: 0,
  },
  notes: null,
};

type ExtractionImage = {
  label: string;
  buffer: Buffer;
  mimeType: string;
};

type CropBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const CROP_EXTRACTION_PROMPT = `${EXTRACTION_PROMPT}

Image order:
- The first image is the full original tag photo.
- Additional images are crops labeled in the preceding text: full tag crop, section crops, and critical field crops.

Use the crops as the primary source for handwriting. Use the full original image only for context and fallback.
Do not guess. If a crop and the full image conflict, choose null for that field unless one source is clearly legible.
Return null for illegible fields.
Mark low-confidence, conflicting, or partially legible fields with field_confidence below 0.75.
Critical fields to be especially conservative about: tag_number, torque_applied_ftlbs, torque_wrench_number, torqued_by, torque_date.`;

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
      field_confidence: {
        job_number: 0.55,
        tag_number: 0.78,
        inspected_by: 0.82,
        inspected_date: 0.9,
        torqued_by: 0.7,
        torque_wrench_number: 0.55,
        torque_applied_ftlbs: 0.9,
        torque_date: 0.9,
        gasket_type: 0.68,
        flange_cleaned: 0.84,
        installed_by: 0.78,
        reinstall_date: 0.9,
        disturbed_by: 0.1,
        disturbed_date: 0,
      },
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
    field_confidence: normalizeFieldConfidence(raw.field_confidence),
    notes: asString("notes"),
  };
}

function normalizeFieldConfidence(value: unknown): TorqueTagFields["field_confidence"] {
  if (typeof value !== "object" || !value) return undefined;
  const confidence = value as Record<string, unknown>;
  const normalized: Record<string, number> = {};
  for (const [key, item] of Object.entries(confidence)) {
    const numeric = typeof item === "number" ? item : typeof item === "string" ? Number(item) : NaN;
    if (Number.isFinite(numeric)) normalized[key] = Math.max(0, Math.min(1, numeric));
  }
  return normalized as TorqueTagFields["field_confidence"];
}

function pctBox(base: CropBox, left: number, top: number, width: number, height: number): CropBox {
  return {
    left: base.left + Math.round(base.width * left),
    top: base.top + Math.round(base.height * top),
    width: Math.round(base.width * width),
    height: Math.round(base.height * height),
  };
}

function clampBox(box: CropBox, imageWidth: number, imageHeight: number): CropBox {
  const left = Math.max(0, Math.min(imageWidth - 1, box.left));
  const top = Math.max(0, Math.min(imageHeight - 1, box.top));
  return {
    left,
    top,
    width: Math.max(1, Math.min(imageWidth - left, box.width)),
    height: Math.max(1, Math.min(imageHeight - top, box.height)),
  };
}

async function makeJpegCrop(baseImage: sharp.Sharp, box: CropBox, width: number, height: number) {
  return baseImage.clone().extract(clampBox(box, width, height)).jpeg({ quality: 88 }).toBuffer();
}

async function createExtractionCrops(imageBuffer: Buffer): Promise<ExtractionImage[]> {
  const base = sharp(imageBuffer).rotate();
  const metadata = await base.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!width || !height) return [];

  const isPortrait = height >= width;
  const fullTag = isPortrait
    ? {
        left: Math.round(width * 0.12),
        top: Math.round(height * 0.02),
        width: Math.round(width * 0.68),
        height: Math.round(height * 0.76),
      }
    : {
        left: Math.round(width * 0.02),
        top: Math.round(height * 0.12),
        width: Math.round(width * 0.76),
        height: Math.round(height * 0.68),
      };

  const sectionBoxes = isPortrait
    ? [
        ["section_top_white", pctBox(fullTag, 0, 0, 1, 0.32)],
        ["section_middle_torque", pctBox(fullTag, 0, 0.28, 1, 0.34)],
        ["section_yellow_reinstalled", pctBox(fullTag, 0, 0.58, 1, 0.22)],
        ["section_red_disturbed", pctBox(fullTag, 0, 0.76, 1, 0.24)],
      ]
    : [
        ["section_top_white", pctBox(fullTag, 0, 0, 0.32, 1)],
        ["section_middle_torque", pctBox(fullTag, 0.28, 0, 0.34, 1)],
        ["section_yellow_reinstalled", pctBox(fullTag, 0.58, 0, 0.22, 1)],
        ["section_red_disturbed", pctBox(fullTag, 0.76, 0, 0.24, 1)],
      ];

  const fieldBoxes = isPortrait
    ? [
        ["field_tag_number", pctBox(fullTag, 0.05, 0.19, 0.36, 0.25)],
        ["field_torqued_by", pctBox(fullTag, 0.46, 0.17, 0.37, 0.14)],
        ["field_torque_wrench_number", pctBox(fullTag, 0.46, 0.31, 0.37, 0.18)],
        ["field_torque_applied_ftlbs", pctBox(fullTag, 0.46, 0.48, 0.37, 0.18)],
        ["field_torque_date", pctBox(fullTag, 0.46, 0.64, 0.37, 0.18)],
      ]
    : [
        ["field_tag_number", pctBox(fullTag, 0.05, 0.2, 0.22, 0.5)],
        ["field_torqued_by", pctBox(fullTag, 0.34, 0.18, 0.16, 0.35)],
        ["field_torque_wrench_number", pctBox(fullTag, 0.42, 0.18, 0.18, 0.35)],
        ["field_torque_applied_ftlbs", pctBox(fullTag, 0.47, 0.48, 0.17, 0.34)],
        ["field_torque_date", pctBox(fullTag, 0.55, 0.48, 0.17, 0.34)],
      ];

  const cropSpecs: Array<[string, CropBox]> = [["full_tag_crop", fullTag], ...sectionBoxes, ...fieldBoxes] as Array<[
    string,
    CropBox,
  ]>;

  const crops: ExtractionImage[] = [];
  for (const [label, box] of cropSpecs) {
    crops.push({
      label,
      buffer: await makeJpegCrop(base, box, width, height),
      mimeType: "image/jpeg",
    });
  }

  return crops;
}

async function runVisionExtraction(images: ExtractionImage[], prompt: string) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.responses.create({
    model: process.env.OPENAI_VISION_MODEL ?? "gpt-4.1",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          ...images.flatMap((image) => [
            { type: "input_text" as const, text: `Image: ${image.label}` },
            {
              type: "input_image" as const,
              image_url: `data:${image.mimeType};base64,${image.buffer.toString("base64")}`,
              detail: "high" as const,
            },
          ]),
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

export async function extractTagWithVision(
  imageBuffer: Buffer,
  mimeType: string,
  originalName: string,
): Promise<TorqueTagFields> {
  if (!process.env.OPENAI_API_KEY) {
    return demoExtraction(originalName);
  }

  const fullImage = { label: "full_original_image", buffer: imageBuffer, mimeType };

  try {
    const crops = await createExtractionCrops(imageBuffer);
    if (crops.length > 0) {
      const extracted = await runVisionExtraction([fullImage, ...crops], CROP_EXTRACTION_PROMPT);
      return {
        ...extracted,
        notes: extracted.notes
          ? `${extracted.notes} Crop-based extraction used; review any fields marked Needs Review.`
          : "Crop-based extraction used; review any fields marked Needs Review.",
      };
    }
  } catch (error) {
    console.error("Crop-based extraction failed; falling back to full-image extraction", error);
  }

  const extracted = await runVisionExtraction([fullImage], EXTRACTION_PROMPT);
  return {
    ...extracted,
    notes: extracted.notes
      ? `${extracted.notes} Full-image fallback extraction used.`
      : "Full-image fallback extraction used.",
  };
}
