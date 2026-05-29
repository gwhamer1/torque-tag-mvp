import { NextResponse } from "next/server";
import { generateReportDocx } from "@/lib/reportGenerator";
import { validateReportForm } from "@/lib/reportValidation";
import { findRecord, readStoredFileBuffer, saveBufferFile, updateRecord } from "@/lib/storage";
import type { ReportFormData } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { recordId?: string; form?: ReportFormData };

    if (!body.recordId || !body.form) {
      return NextResponse.json({ error: "recordId and form are required." }, { status: 400 });
    }

    const validationErrors = validateReportForm(body.form);
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: validationErrors.join(" ") }, { status: 400 });
    }

    const record = await findRecord(body.recordId);
    if (!record?.photo) {
      return NextResponse.json({ error: "Saved torque tag photo was not found." }, { status: 404 });
    }

    const photoBuffer = await readStoredFileBuffer("photos", record.photo.fileName);
    const reportBuffer = await generateReportDocx(body.form, photoBuffer, record.photo.fileName);
    const tag = body.form.tag_number || body.form.customer_flange_tag_number || "torque-tag";
    const safeTag = tag.replace(/[^a-zA-Z0-9._-]/g, "_");
    const report = await saveBufferFile("reports", reportBuffer, `DS-2.12-${safeTag}.docx`, ".docx");
    const updated = await updateRecord({
      ...record,
      status: "report_generated",
      confirmed: body.form,
      report,
    });

    return NextResponse.json({ record: updated, report });
  } catch (error) {
    console.error("Report generation failed", error);
    return NextResponse.json(
      { error: "Report generation failed. Review the required fields and try again." },
      { status: 500 },
    );
  }
}
