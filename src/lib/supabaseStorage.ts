import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
const ensuredBuckets = new Set<string>();

function getSupabaseProjectUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!rawUrl) return null;

  const url = new URL(rawUrl);
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function isSupabaseStorageConfigured() {
  return Boolean(getSupabaseProjectUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseStorageClient() {
  if (!isSupabaseStorageConfigured()) return null;

  client ??= createClient(getSupabaseProjectUrl()!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return client;
}

export async function ensureSupabaseBucket(bucket: string) {
  const supabase = getSupabaseStorageClient();
  if (!supabase || ensuredBuckets.has(bucket)) return;

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  if (!buckets.some((item) => item.name === bucket)) {
    const { error } = await supabase.storage.createBucket(bucket, { public: false });
    if (error) throw error;
  }

  ensuredBuckets.add(bucket);
}

export async function uploadSupabaseObject(bucket: string, objectPath: string, body: Buffer, contentType?: string) {
  const supabase = getSupabaseStorageClient();
  if (!supabase) throw new Error("Supabase storage is not configured.");

  await ensureSupabaseBucket(bucket);
  const { error } = await supabase.storage.from(bucket).upload(objectPath, body, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
}

export async function downloadSupabaseObject(bucket: string, objectPath: string) {
  const supabase = getSupabaseStorageClient();
  if (!supabase) throw new Error("Supabase storage is not configured.");

  await ensureSupabaseBucket(bucket);
  const { data, error } = await supabase.storage.from(bucket).download(objectPath);
  if (error) throw error;

  return Buffer.from(await data.arrayBuffer());
}

export async function deleteSupabaseObject(bucket: string, objectPath: string) {
  const supabase = getSupabaseStorageClient();
  if (!supabase) throw new Error("Supabase storage is not configured.");

  await ensureSupabaseBucket(bucket);
  const { error } = await supabase.storage.from(bucket).remove([objectPath]);
  if (error) throw error;
}
