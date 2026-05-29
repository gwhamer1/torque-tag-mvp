import type { ReportFormData } from "@/lib/types";

export function validateReportForm(form: ReportFormData) {
  const errors: string[] = [];

  if (!form.tag_number?.trim()) {
    errors.push("Tag number is required before generating the report.");
  }

  if (form.torque_applied_ftlbs === null || !Number.isFinite(Number(form.torque_applied_ftlbs))) {
    errors.push("Torque applied ft/lbs is required before generating the report.");
  }

  if (!form.torqued_by?.trim()) {
    errors.push("Torqued by is required before generating the report.");
  }

  return errors;
}
