"use client";

import { useState } from "react";
import { FileUp, Loader2 } from "lucide-react";

export function CertUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function upload() {
    if (!file) return;
    setStatus(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("cert", file);
      const response = await fetch("/api/upload-cert", { method: "POST", body: formData });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok || payload.error) throw new Error(payload.error ?? "Upload failed.");
      setStatus("Certificate uploaded.");
      setFile(null);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded-md border border-[#d8ddd3] bg-white p-5 shadow-sm">
      <FileUp aria-hidden className="mb-4 size-6 text-[#1f6f43]" />
      <h2 className="text-xl font-semibold">Upload PDF Certificate</h2>
      <p className="mt-1 text-sm leading-6 text-[#607066]">Torque wrench certificates are stored for reference only in this MVP.</p>
      <input
        type="file"
        accept="application/pdf,.pdf"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        className="mt-5 w-full rounded-md border border-[#cbd3c7] bg-white px-3 py-3 text-sm"
      />
      <button
        type="button"
        disabled={!file || isUploading}
        onClick={upload}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#1f6f43] px-4 py-3 text-sm font-semibold text-white hover:bg-[#185a36] disabled:cursor-not-allowed disabled:bg-[#9fb7a9]"
      >
        {isUploading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <FileUp aria-hidden className="size-4" />}
        Upload certificate
      </button>
      {status ? <p className="mt-3 text-sm font-medium text-[#607066]">{status}</p> : null}
    </div>
  );
}
