import { NextResponse } from "next/server";
import { deleteCert } from "@/lib/storage";

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await deleteCert(id);
  if (!result.cert) {
    return NextResponse.json({ error: "Certificate record was not found.", warnings: result.warnings }, { status: 404 });
  }

  return NextResponse.json({ deleted: true, warnings: result.warnings });
}
