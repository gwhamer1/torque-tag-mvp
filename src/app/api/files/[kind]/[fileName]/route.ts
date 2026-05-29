import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const contentTypes: Record<string, string> = {
  certs: "application/pdf",
  reports: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function storageDir(kind: string) {
  if (kind === "photos") return path.join(/*turbopackIgnore: true*/ process.cwd(), "storage", "photos");
  if (kind === "reports") return path.join(/*turbopackIgnore: true*/ process.cwd(), "storage", "reports");
  if (kind === "certs") return path.join(/*turbopackIgnore: true*/ process.cwd(), "storage", "certs");
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; fileName: string }> },
) {
  const { kind, fileName } = await params;

  const dir = storageDir(kind);
  if (!dir) {
    return NextResponse.json({ error: "Unknown file store." }, { status: 404 });
  }

  try {
    const filePath = path.resolve(dir, decodeURIComponent(fileName));
    if (!filePath.startsWith(path.resolve(dir))) {
      return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
    }
    const buffer = await fs.readFile(filePath);
    const type =
      contentTypes[kind] ??
      (fileName.toLowerCase().endsWith(".png")
        ? "image/png"
        : fileName.toLowerCase().endsWith(".webp")
          ? "image/webp"
          : "image/jpeg");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": kind === "photos" ? "inline" : `attachment; filename="${fileName}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
