import { promises as fs } from "fs";
import path from "path";
import PizZip from "pizzip";
import { imageSize } from "image-size";
import type { ReportFormData } from "@/lib/types";

const EMU_PER_INCH = 914400;
const templatePath = path.join(/*turbopackIgnore: true*/ process.cwd(), "templates", "DS-2.12-template.docx");

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function contentTypeForImage(ext: string) {
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

function imageDrawingXml(relId: string, widthEmu: number, heightEmu: number) {
  return `<w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${widthEmu}" cy="${heightEmu}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="9281" name="Torque tag photo"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="9282" name="torque-tag-photo"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

function replaceTextPlaceholders(xml: string, data: Record<string, unknown>) {
  let output = xml;
  for (const [key, value] of Object.entries(data)) {
    const safe = escapeXml(value);
    output = output
      .replaceAll(`{{${key}}}`, safe)
      .replaceAll(`{{${key}}`, safe)
      .replaceAll(`{${key}}`, safe);
  }
  return output.replace(/\{\{[a-zA-Z0-9_]+}?/g, "");
}

function appendContentType(xml: string, extension: string, contentType: string) {
  if (xml.includes(`Extension="${extension.slice(1)}"`)) return xml;
  return xml.replace(
    "</Types>",
    `<Default Extension="${extension.slice(1)}" ContentType="${contentType}"/></Types>`,
  );
}

function appendRelationship(xml: string, relId: string, target: string) {
  return xml.replace(
    "</Relationships>",
    `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${target}"/></Relationships>`,
  );
}

export function buildReportTemplateData(form: ReportFormData) {
  const confirmedTorque = form.torque_applied_ftlbs ?? form.torque_value_specified ?? 0;
  const step1 = confirmedTorque ? Math.round(confirmedTorque * 0.3) : "";
  const step2 = confirmedTorque ? Math.round(confirmedTorque * 0.6) : "";
  const torque = confirmedTorque || "";
  const torqueDate = form.torque_date ?? "";
  const torquedBy = form.torqued_by ?? "";

  return {
    report_number: form.report_number,
    report_date: form.report_date,
    pembina_job_number: form.pembina_job_number || form.job_number || "",
    project_name: form.project_name,
    location: form.location,
    tag_number: form.customer_flange_tag_number || form.tag_number || "",
    drawing_number: form.drawing_number,
    flange_size: form.flange_size,
    flange_class: form.flange_class,
    flange_series: form.flange_series,
    socket_size: form.wrench_socket_size,
    lubrication: form.lubrication || "JET LUBE 550",
    gasket_installer_name: form.installed_by || form.worker_name,
    gasket_primary: form.gasket_type || "",
    gasket_secondary: form.flange_cleaned === null ? "" : form.flange_cleaned ? "FLANGE CLEANED" : "NOT CLEANED",
    torque_spec: form.torque_value_specified ?? form.expected_torque_ftlbs ?? form.torque_applied_ftlbs ?? "",
    stud_material: form.stud_material,
    nut_material: form.nut_material,
    max_hyd_pressure: "",
    tool_model_1: "",
    tool_model_2: "",
    tool_model_3: "",
    tool_model_4: "",
    tool_sn_1: form.torque_wrench_number ?? "",
    tool_sn_2: "",
    tool_sn_3: "",
    tool_sn_4: "",
    cal_date_1: "",
    cal_date_2: "",
    cal_date_3: "",
    cal_date_4: "",
    s1_val: step1,
    s2_val: step2,
    s3_val: torque,
    s4_val: torque,
    s5_val: torque,
    s1_by: torquedBy,
    s2_by: torquedBy,
    s3_by: torquedBy,
    s4_by: torquedBy,
    s5_by: torquedBy,
    s1_date: torqueDate,
    s2_date: torqueDate,
    s3_date: torqueDate,
    s4_date: torqueDate,
    s5_date: torqueDate,
    crew_member: form.worker_name || form.torqued_by || "",
    crew_date: form.torque_date ?? form.report_date,
    inspector_name: form.inspected_by ?? "",
    inspector_date: form.inspected_date ?? "",
  };
}

export async function generateReportDocx(form: ReportFormData, photoPath: string) {
  const [templateBuffer, photoBuffer] = await Promise.all([
    fs.readFile(templatePath),
    fs.readFile(photoPath),
  ]);
  const zip = new PizZip(templateBuffer);
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) throw new Error("Template is missing word/document.xml.");

  const imageExt = path.extname(photoPath).toLowerCase() || ".jpg";
  const imageName = `torque-tag-${Date.now()}${imageExt === ".jpeg" ? ".jpg" : imageExt}`;
  const imageTarget = `media/${imageName}`;
  const relId = `rIdTorqueTag${Date.now()}`;

  const dimensions = imageSize(photoBuffer);
  const widthPx = dimensions.width || 1200;
  const heightPx = dimensions.height || 800;
  const maxWidthIn = 6.7;
  const maxHeightIn = 4.55;
  const ratio = Math.min(maxWidthIn / (widthPx / 96), maxHeightIn / (heightPx / 96), 1);
  const widthEmu = Math.round((widthPx / 96) * ratio * EMU_PER_INCH);
  const heightEmu = Math.round((heightPx / 96) * ratio * EMU_PER_INCH);

  let documentXml = replaceTextPlaceholders(documentFile.asText(), buildReportTemplateData(form));
  const drawing = imageDrawingXml(relId, widthEmu, heightEmu);
  documentXml = documentXml.replace(
    /<w:r[^>]*>\s*(?:<w:rPr>.*?<\/w:rPr>)?\s*<w:t[^>]*>\{%tag_photo\}<\/w:t>\s*<\/w:r>/,
    drawing,
  );
  documentXml = documentXml.replace("{%tag_photo}", "");
  zip.file("word/document.xml", documentXml);
  zip.file(`word/${imageTarget}`, photoBuffer);

  const relsPath = "word/_rels/document.xml.rels";
  const rels = zip.file(relsPath);
  if (!rels) throw new Error("Template is missing document relationships.");
  zip.file(relsPath, appendRelationship(rels.asText(), relId, imageTarget));

  const contentTypes = zip.file("[Content_Types].xml");
  if (!contentTypes) throw new Error("Template is missing content types.");
  zip.file(
    "[Content_Types].xml",
    appendContentType(contentTypes.asText(), imageExt === ".jpeg" ? ".jpg" : imageExt, contentTypeForImage(imageExt)),
  );

  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}
