import { NextResponse } from "next/server";
import { extractTagWithVision } from "@/lib/extractTag";
import { createRecord, saveBufferFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("photo");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A photo file is required." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Upload a JPEG, PNG, WEBP, or GIF image." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const photo = await saveBufferFile("photos", buffer, file.name || "torque-tag.jpg");
    const result = await extractTagWithVision(buffer, file.type || "image/jpeg", file.name || "");
    const crops = [];
    for (const crop of result.crops) {
      const saved = await saveBufferFile("photos", crop.buffer, `${crop.label}.jpg`, ".jpg");
      crops.push({ ...saved, label: crop.label });
    }
    const extracted = result.cropError
      ? {
          ...result.fields,
          notes: `${result.fields.notes ?? "Full-image fallback extraction used."} Crop preview unavailable: ${result.cropError}`,
        }
      : result.fields;
    const record = await createRecord(extracted, photo, crops);

    return NextResponse.json({ recordId: record.id, photo, crops, extracted, status: record.status });
  } catch (error) {
    console.error("Tag extraction failed", error);
    return NextResponse.json(
      { error: "Tag extraction failed. Check the image and try again, or enter the fields manually." },
      { status: 500 },
    );
  }
}
