"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileText, ImageIcon, Trash2 } from "lucide-react";
import type { TorqueRecord } from "@/lib/types";

export function ReportsList({ records }: { records: TorqueRecord[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<TorqueRecord | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  async function deleteReport(record: TorqueRecord) {
    setPending(record.id);
    setStatus(null);
    try {
      const response = await fetch(`/api/reports/${record.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string; warnings?: string[] };
      if (!response.ok) throw new Error(payload.error ?? "Delete failed.");
      setStatus(payload.warnings?.length ? `Deleted with warnings: ${payload.warnings.join(" ")}` : "Report deleted.");
      setConfirming(null);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setPending(null);
    }
  }

  async function deleteAllReports() {
    setPending("bulk");
    setStatus(null);
    try {
      const response = await fetch("/api/reports/delete-test-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: bulkText }),
      });
      const payload = (await response.json()) as { error?: string; deletedCount?: number; warnings?: string[] };
      if (!response.ok) throw new Error(payload.error ?? "Bulk cleanup failed.");
      setStatus(
        payload.warnings?.length
          ? `Deleted ${payload.deletedCount ?? 0} reports with warnings: ${payload.warnings.join(" ")}`
          : `Deleted ${payload.deletedCount ?? 0} reports.`,
      );
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
    <div className="grid gap-3">
      {status ? <p className="rounded-md bg-[#fbfcf8] p-3 text-sm font-medium text-[#607066]">{status}</p> : null}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setBulkOpen(true)}
          className="inline-flex items-center gap-2 rounded-md border border-[#e5b4a5] px-3 py-2 text-sm font-semibold text-[#8a321b] hover:bg-[#fff5ef]"
        >
          <Trash2 aria-hidden className="size-4" />
          Delete all test reports
        </button>
      </div>
      {records.length === 0 ? (
        <p className="rounded-md bg-[#fbfcf8] p-6 text-center text-sm text-[#607066]">No reports have been generated yet.</p>
      ) : (
        records.map((record) => {
          const data = record.confirmed ?? record.extracted;
          const tagNumber = record.confirmed?.customer_flange_tag_number || data.tag_number;
          return (
            <article key={record.id} className="grid gap-4 rounded-md border border-[#d8ddd3] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <h2 className="font-semibold">{tagNumber ?? "Untagged report"}</h2>
                <p className="mt-1 text-sm text-[#607066]">
                  {data.torque_applied_ftlbs ?? ""} ft/lbs | {data.torqued_by ?? "Unknown worker"} | {data.torque_date ?? ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {record.report ? (
                  <a href={record.report.url} className="inline-flex items-center gap-2 rounded-md bg-[#1f6f43] px-3 py-2 text-sm font-semibold text-white hover:bg-[#185a36]">
                    <FileText aria-hidden className="size-4" />
                    DOCX
                  </a>
                ) : null}
                {record.photo ? (
                  <a href={record.photo.url} className="inline-flex items-center gap-2 rounded-md border border-[#d8ddd3] px-3 py-2 text-sm font-semibold text-[#1f6f43] hover:bg-[#eef4ed]">
                    <ImageIcon aria-hidden className="size-4" />
                    Photo
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => setConfirming(record)}
                  className="inline-flex items-center gap-2 rounded-md border border-[#e5b4a5] px-3 py-2 text-sm font-semibold text-[#8a321b] hover:bg-[#fff5ef]"
                >
                  <Trash2 aria-hidden className="size-4" />
                  Delete
                </button>
              </div>
            </article>
          );
        })
      )}

      {confirming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="max-w-md rounded-md bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Delete this test report?</h2>
            <p className="mt-2 text-sm leading-6 text-[#607066]">
              This will remove the report record and associated stored files if available.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-md border border-[#d8ddd3] px-3 py-2 text-sm font-semibold" onClick={() => setConfirming(null)}>
                Cancel
              </button>
              <button
                className="rounded-md bg-[#8a321b] px-3 py-2 text-sm font-semibold text-white"
                disabled={pending === confirming.id}
                onClick={() => deleteReport(confirming)}
              >
                Confirm delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bulkOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="max-w-md rounded-md bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Delete all test reports</h2>
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
              <button
                className="rounded-md bg-[#8a321b] px-3 py-2 text-sm font-semibold text-white disabled:bg-[#d8aaa0]"
                disabled={bulkText !== "DELETE" || pending === "bulk"}
                onClick={deleteAllReports}
              >
                Delete all
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
