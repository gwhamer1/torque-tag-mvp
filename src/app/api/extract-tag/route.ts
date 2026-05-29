import { NextResponse } from "next/server";
import { extractTagWithVision } from "@/lib/extractTag";
import { createRecord, saveBufferFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
  const extracted = await extractTagWithVision(buffer, file.type || "image/jpeg", file.name || "");
  const record = await createRecord(extracted, photo);

  return NextResponse.json({ recordId: record.id, photo, extracted, status: record.status });
}
