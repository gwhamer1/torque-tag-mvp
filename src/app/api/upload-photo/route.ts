import { NextResponse } from "next/server";
import { emptyExtraction } from "@/lib/extractTag";
import { createRecord, saveBufferFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("photo");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A photo file is required." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads are supported." }, { status: 400 });
  }

  const saved = await saveBufferFile("photos", Buffer.from(await file.arrayBuffer()), file.name || "torque-tag.jpg");
  const record = await createRecord(
    {
      ...emptyExtraction,
      notes: "AI extraction skipped. Enter tag values manually before generating the report.",
    },
    saved,
  );
  return NextResponse.json({ recordId: record.id, photo: saved, extracted: record.extracted, status: record.status });
}
