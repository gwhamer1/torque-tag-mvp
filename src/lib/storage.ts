import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  deleteSupabaseObject,
  downloadSupabaseObject,
  isSupabaseStorageConfigured,
  uploadSupabaseObject,
} from "@/lib/supabaseStorage";
import type { CertRecord, CropPreview, StoredFile, TorqueRecord, TorqueTagFields } from "@/lib/types";

const root = /*turbopackIgnore: true*/ process.cwd();
const storageRoot = path.join(root, "storage");
const recordsPath = path.join(storageRoot, "records.json");
const certsPath = path.join(storageRoot, "certs.json");
const metadataBucket = "torque-app-data";

function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

export const storageDirs = {
  photos: path.join(storageRoot, "photos"),
  reports: path.join(storageRoot, "reports"),
  certs: path.join(storageRoot, "certs"),
} as const;

type StorageKind = keyof typeof storageDirs;

export async function ensureStorage() {
  if (isSupabaseStorageConfigured() || isProductionRuntime()) return;
  await Promise.all(Object.values(storageDirs).map((dir) => fs.mkdir(dir, { recursive: true })));
}

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

function contentTypeFor(kind: StorageKind, fileName: string) {
  if (kind === "reports") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (kind === "certs") return "application/pdf";
  if (fileName.toLowerCase().endsWith(".png")) return "image/png";
  if (fileName.toLowerCase().endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export function fileUrl(kind: StorageKind, fileName: string) {
  return `/api/files/${kind}/${encodeURIComponent(fileName)}`;
}

export async function saveBufferFile(
  kind: StorageKind,
  buffer: Buffer,
  originalName: string,
  preferredExtension?: string,
): Promise<StoredFile> {
  await ensureStorage();
  const ext = preferredExtension ?? path.extname(originalName) ?? "";
  const fileName = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}-${cleanFileName(
    path.basename(originalName, path.extname(originalName)),
  )}${ext}`;

  if (isSupabaseStorageConfigured()) {
    await uploadSupabaseObject(`torque-${kind}`, fileName, buffer, contentTypeFor(kind, fileName));
  } else if (isProductionRuntime()) {
    throw new Error("Supabase storage is required in production deployments.");
  } else {
    await ensureStorage();
    await fs.writeFile(path.join(storageDirs[kind], fileName), buffer);
  }

  return {
    fileName,
    originalName,
    url: fileUrl(kind, fileName),
    createdAt: new Date().toISOString(),
  };
}

export async function readStoredFileBuffer(kind: StorageKind, fileName: string) {
  if (isSupabaseStorageConfigured()) {
    return downloadSupabaseObject(`torque-${kind}`, fileName);
  }

  if (isProductionRuntime()) {
    throw new Error("Supabase storage is required in production deployments.");
  }

  return fs.readFile(resolveStoredPath(kind, fileName));
}

export async function deleteStoredFile(kind: StorageKind, fileName?: string | null) {
  if (!fileName) return null;

  if (isSupabaseStorageConfigured()) {
    await deleteSupabaseObject(`torque-${kind}`, fileName);
    return null;
  }

  if (isProductionRuntime()) {
    throw new Error("Supabase storage is required in production deployments.");
  }

  try {
    await fs.unlink(resolveStoredPath(kind, fileName));
    return null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "File was already missing.";
    throw error;
  }
}

export async function readRecords(): Promise<TorqueRecord[]> {
  if (isSupabaseStorageConfigured()) {
    try {
      return JSON.parse((await downloadSupabaseObject(metadataBucket, "records.json")).toString("utf8")) as TorqueRecord[];
    } catch {
      return [];
    }
  }

  if (isProductionRuntime()) return [];

  await ensureStorage();
  try {
    return JSON.parse(await fs.readFile(recordsPath, "utf8")) as TorqueRecord[];
  } catch {
    return [];
  }
}

export async function writeRecords(records: TorqueRecord[]) {
  if (isSupabaseStorageConfigured()) {
    await uploadSupabaseObject(
      metadataBucket,
      "records.json",
      Buffer.from(JSON.stringify(records, null, 2)),
      "application/json",
    );
    return;
  }

  if (isProductionRuntime()) {
    throw new Error("Supabase storage is required in production deployments.");
  }

  await ensureStorage();
  await fs.writeFile(recordsPath, JSON.stringify(records, null, 2));
}

export async function createRecord(extracted: TorqueTagFields, photo: StoredFile, crops: CropPreview[] = []) {
  const records = await readRecords();
  const record: TorqueRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: extracted.ocr_confidence < 0.75 ? "needs_review" : "draft",
    extracted,
    photo,
    crops,
  };
  records.unshift(record);
  await writeRecords(records);
  return record;
}

export async function updateRecord(record: TorqueRecord) {
  const records = await readRecords();
  const index = records.findIndex((item) => item.id === record.id);
  const updated = { ...record, updatedAt: new Date().toISOString() };
  if (index === -1) records.unshift(updated);
  else records[index] = updated;
  await writeRecords(records);
  return updated;
}

export async function findRecord(id: string) {
  return (await readRecords()).find((record) => record.id === id) ?? null;
}

export async function deleteRecord(id: string) {
  const records = await readRecords();
  const record = records.find((item) => item.id === id);
  if (!record) return { record: null, warnings: ["Report record was not found."] };

  const warnings: string[] = [];
  const files = [
    { kind: "reports" as const, fileName: record.report?.fileName, label: "report DOCX" },
    { kind: "photos" as const, fileName: record.photo?.fileName, label: "photo" },
    ...(record.crops ?? []).map((crop) => ({ kind: "photos" as const, fileName: crop.fileName, label: `crop ${crop.label}` })),
  ];

  for (const file of files) {
    if (!file.fileName) continue;
    try {
      const warning = await deleteStoredFile(file.kind, file.fileName);
      if (warning) warnings.push(`${file.label}: ${warning}`);
    } catch (error) {
      warnings.push(`${file.label}: ${error instanceof Error ? error.message : "delete failed"}`);
    }
  }

  await writeRecords(records.filter((item) => item.id !== id));
  return { record, warnings };
}

export async function deleteAllReportRecords() {
  const records = await readRecords();
  const warnings: string[] = [];
  for (const record of records) {
    const result = await deleteRecord(record.id);
    warnings.push(...result.warnings);
  }
  return { deletedCount: records.length, warnings };
}

export async function readCerts(): Promise<CertRecord[]> {
  if (isSupabaseStorageConfigured()) {
    try {
      return JSON.parse((await downloadSupabaseObject(metadataBucket, "certs.json")).toString("utf8")) as CertRecord[];
    } catch {
      return [];
    }
  }

  if (isProductionRuntime()) return [];

  await ensureStorage();
  try {
    return JSON.parse(await fs.readFile(certsPath, "utf8")) as CertRecord[];
  } catch {
    return [];
  }
}

export async function addCert(file: StoredFile) {
  const certs = await readCerts();
  const cert: CertRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    file,
  };
  certs.unshift(cert);
  if (isSupabaseStorageConfigured()) {
    await uploadSupabaseObject(
      metadataBucket,
      "certs.json",
      Buffer.from(JSON.stringify(certs, null, 2)),
      "application/json",
    );
    return cert;
  }

  if (isProductionRuntime()) {
    throw new Error("Supabase storage is required in production deployments.");
  }

  await ensureStorage();
  await fs.writeFile(certsPath, JSON.stringify(certs, null, 2));
  return cert;
}

export async function writeCerts(certs: CertRecord[]) {
  if (isSupabaseStorageConfigured()) {
    await uploadSupabaseObject(
      metadataBucket,
      "certs.json",
      Buffer.from(JSON.stringify(certs, null, 2)),
      "application/json",
    );
    return;
  }

  if (isProductionRuntime()) {
    throw new Error("Supabase storage is required in production deployments.");
  }

  await ensureStorage();
  await fs.writeFile(certsPath, JSON.stringify(certs, null, 2));
}

export async function deleteCert(id: string) {
  const certs = await readCerts();
  const cert = certs.find((item) => item.id === id);
  if (!cert) return { cert: null, warnings: ["Certificate record was not found."] };

  const warnings: string[] = [];
  try {
    const warning = await deleteStoredFile("certs", cert.file.fileName);
    if (warning) warnings.push(warning);
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : "Certificate file delete failed.");
  }

  await writeCerts(certs.filter((item) => item.id !== id));
  return { cert, warnings };
}

export async function deleteAllCerts() {
  const certs = await readCerts();
  const warnings: string[] = [];
  for (const cert of certs) {
    const result = await deleteCert(cert.id);
    warnings.push(...result.warnings);
  }
  return { deletedCount: certs.length, warnings };
}

export function resolveStoredPath(kind: StorageKind, fileName: string) {
  const dir = storageDirs[kind];
  const resolved = path.resolve(dir, fileName);
  if (!resolved.startsWith(path.resolve(dir))) {
    throw new Error("Invalid storage path.");
  }
  return resolved;
}
