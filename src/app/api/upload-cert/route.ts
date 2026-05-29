import { NextResponse } from "next/server";
import { addCert, saveBufferFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("cert");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A PDF certificate file is required." }, { status: 400 });
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Torque wrench certificates must be PDF files." }, { status: 400 });
  }

  const saved = await saveBufferFile("certs", Buffer.from(await file.arrayBuffer()), file.name || "certificate.pdf", ".pdf");
  const cert = await addCert(saved);
  return NextResponse.json({ cert });
}
