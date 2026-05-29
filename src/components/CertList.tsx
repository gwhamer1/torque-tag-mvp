"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { CertRecord } from "@/lib/types";

export function CertList({ certs }: { certs: CertRecord[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<CertRecord | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  async function deleteOne(cert: CertRecord) {
    setPending(cert.id);
    setStatus(null);
    try {
      const response = await fetch(`/api/certs/${cert.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string; warnings?: string[] };
      if (!response.ok) throw new Error(payload.error ?? "Delete failed.");
      setStatus(payload.warnings?.length ? `Deleted with warnings: ${payload.warnings.join(" ")}` : "Certificate deleted.");
      setConfirming(null);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setPending(null);
    }
  }

  async function deleteAll() {
    setPending("bulk");
    setStatus(null);
    try {
      const response = await fetch("/api/certs/delete-test-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: bulkText }),
      });
      const payload = (await response.json()) as { error?: string; deletedCount?: number; warnings?: string[] };
      if (!response.ok) throw new Error(payload.error ?? "Bulk cleanup failed.");
      setStatus(`Deleted ${payload.deletedCount ?? 0} certificates.`);
      setBulkOpen(false);
      setBulkText("");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Bulk cleanup failed.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-5 grid gap-3">
      {status ? <p className="rounded-md bg-[#fbfcf8] p-3 text-sm font-medium text-[#607066]">{status}</p> : null}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setBulkOpen(true)}
          className="inline-flex items-center gap-2 rounded-md border border-[#e5b4a5] px-3 py-2 text-sm font-semibold text-[#8a321b] hover:bg-[#fff5ef]"
        >
          <Trash2 aria-hidden className="size-4" />
          Delete all test certs
        </button>
      </div>
      {certs.length === 0 ? (
        <p className="rounded-md bg-[#fbfcf8] p-6 text-center text-sm text-[#607066]">No certificates uploaded yet.</p>
      ) : (
        certs.map((cert) => (
          <div key={cert.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#d8ddd3] p-4">
            <a href={cert.file.url} className="text-sm font-semibold text-[#1f6f43] hover:underline">
              {cert.file.originalName}
              <span className="ml-2 font-normal text-[#607066]">{cert.createdAt.replace("T", " ").slice(0, 19)}</span>
            </a>
            <button
              type="button"
              onClick={() => setConfirming(cert)}
              className="inline-flex items-center gap-2 rounded-md border border-[#e5b4a5] px-3 py-2 text-sm font-semibold text-[#8a321b] hover:bg-[#fff5ef]"
            >
              <Trash2 aria-hidden className="size-4" />
              Delete
            </button>
          </div>
        ))
      )}

      {confirming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="max-w-md rounded-md bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Delete this certificate?</h2>
            <p className="mt-2 text-sm leading-6 text-[#607066]">This will remove the PDF and certificate record.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-md border border-[#d8ddd3] px-3 py-2 text-sm font-semibold" onClick={() => setConfirming(null)}>
                Cancel
              </button>
              <button className="rounded-md bg-[#8a321b] px-3 py-2 text-sm font-semibold text-white" disabled={pending === confirming.id} onClick={() => deleteOne(confirming)}>
                Confirm delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bulkOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="max-w-md rounded-md bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Delete all test certs</h2>
            <p className="mt-2 text-sm leading-6 text-[#607066]">Type DELETE to confirm.</p>
            <input
              value={bulkText}
              onChange={(event) => setBulkText(event.target.value)}
              className="mt-3 h-11 w-full rounded-md border border-[#cbd3c7] px-3 text-sm"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-md border border-[#d8ddd3] px-3 py-2 text-sm font-semibold" onClick={() => setBulkOpen(false)}>
                Cancel
              </button>
              <button className="rounded-md bg-[#8a321b] px-3 py-2 text-sm font-semibold text-white disabled:bg-[#d8aaa0]" disabled={bulkText !== "DELETE" || pending === "bulk"} onClick={deleteAll}>
                Delete all
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
