import { NextResponse } from "next/server";
import { rereadFieldWithVision, type ExtractionImage } from "@/lib/extractTag";
import { findRecord, readStoredFileBuffer } from "@/lib/storage";
import type { TorqueTagFields } from "@/lib/types";

export const runtime = "nodejs";

const criticalFields = new Set<keyof TorqueTagFields>([
  "tag_number",
  "torque_applied_ftlbs",
  "torque_wrench_number",
  "torqued_by",
  "torque_date",
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { recordId?: string; field?: keyof TorqueTagFields };
    if (!body.recordId || !body.field || !criticalFields.has(body.field)) {
      return NextResponse.json({ error: "A valid recordId and critical field are required." }, { status: 400 });
    }

    const record = await findRecord(body.recordId);
    if (!record) return NextResponse.json({ error: "Report record was not found." }, { status: 404 });

    const cropLabel = `field_${body.field}`;
    const cropFile = record.crops?.find((crop) => crop.label === cropLabel);
    const sourceFile = cropFile ?? record.photo;
    if (!sourceFile) {
      return NextResponse.json({ error: "No saved image was found for this record." }, { status: 404 });
    }

    const buffer = await readStoredFileBuffer("photos", sourceFile.fileName);
    const crop: ExtractionImage = {
      label: cropFile ? cropLabel : "full_original_image_fallback",
      buffer,
      mimeType: "image/jpeg",
    };

    const suggestion = await rereadFieldWithVision(body.field, crop);
    return NextResponse.json({ field: body.field, source: crop.label, suggestion });
  } catch (error) {
    console.error("Field re-read failed", error);
    return NextResponse.json({ error: "Field re-read failed. Try manual correction." }, { status: 500 });
  }
}
