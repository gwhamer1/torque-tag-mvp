import { NextResponse } from "next/server";
import { deleteAllReportRecords } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { confirm?: string };
  if (body.confirm !== "DELETE") {
    return NextResponse.json({ error: "Type DELETE to confirm cleanup." }, { status: 400 });
  }

  return NextResponse.json(await deleteAllReportRecords());
}
