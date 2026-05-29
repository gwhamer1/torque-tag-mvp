import { FileText, ImageIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { readRecords } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const records = await readRecords();
  const generated = records.filter((record) => record.report);

  return (
    <AppShell>
      <section className="rounded-md border border-[#d8ddd3] bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold">Generated Reports</h1>
          <p className="mt-1 text-sm text-[#607066]">Saved DS 2.12 Word reports and original torque tag photos.</p>
        </div>
        <div className="grid gap-3">
          {generated.length === 0 ? (
            <p className="rounded-md bg-[#fbfcf8] p-6 text-center text-sm text-[#607066]">No reports have been generated yet.</p>
          ) : (
            generated.map((record) => {
              const data = record.confirmed ?? record.extracted;
              const tagNumber = record.confirmed?.customer_flange_tag_number || data.tag_number;
              return (
                <article key={record.id} className="grid gap-4 rounded-md border border-[#d8ddd3] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <h2 className="font-semibold">{tagNumber ?? "Untagged report"}</h2>
                    <p className="mt-1 text-sm text-[#607066]">
                      {data.torque_applied_ftlbs ?? ""} ft/lbs · {data.torqued_by ?? "Unknown worker"} · {data.torque_date ?? ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {record.report ? (
                      <a
                        href={record.report.url}
                        className="inline-flex items-center gap-2 rounded-md bg-[#1f6f43] px-3 py-2 text-sm font-semibold text-white hover:bg-[#185a36]"
                      >
                        <FileText aria-hidden className="size-4" />
                        DOCX
                      </a>
                    ) : null}
                    {record.photo ? (
                      <a
                        href={record.photo.url}
                        className="inline-flex items-center gap-2 rounded-md border border-[#d8ddd3] px-3 py-2 text-sm font-semibold text-[#1f6f43] hover:bg-[#eef4ed]"
                      >
                        <ImageIcon aria-hidden className="size-4" />
                        Photo
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </AppShell>
  );
}
