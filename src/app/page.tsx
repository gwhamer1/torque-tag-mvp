import Link from "next/link";
import { ArrowRight, Camera, FileText } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { readRecords } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function Home() {
  const records = await readRecords();

  return (
    <AppShell>
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-md border border-[#d8ddd3] bg-white p-5 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">Active Job Dashboard</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#607066]">
                One open field workflow for completed torque tag photos, review, and DS 2.12 Word report generation.
              </p>
            </div>
            <Link
              href="/submit"
              className="inline-flex shrink-0 items-center gap-2 rounded-md bg-[#1f6f43] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185a36]"
            >
              <Camera aria-hidden className="size-4" />
              New tag
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#d8ddd3] text-xs uppercase tracking-[0.08em] text-[#607066]">
                  <th className="py-3 pr-4 font-semibold">Tag</th>
                  <th className="py-3 pr-4 font-semibold">Torque</th>
                  <th className="py-3 pr-4 font-semibold">Torqued by</th>
                  <th className="py-3 pr-4 font-semibold">Date</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Files</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#607066]">
                      No torque tags have been submitted yet.
                    </td>
                  </tr>
                ) : (
                  records.map((record) => {
                    const data = record.confirmed ?? record.extracted;
                    return (
                      <tr key={record.id} className="border-b border-[#edf0ea]">
                        <td className="py-3 pr-4 font-semibold">{data.tag_number ?? "Missing"}</td>
                        <td className="py-3 pr-4">{data.torque_applied_ftlbs ?? ""}</td>
                        <td className="py-3 pr-4">{data.torqued_by ?? ""}</td>
                        <td className="py-3 pr-4">{data.torque_date ?? ""}</td>
                        <td className="py-3 pr-4">
                          <span className="rounded-md border border-[#d8ddd3] bg-[#fbfcf8] px-2 py-1 text-xs font-semibold">
                            {record.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex gap-3">
                            {record.photo ? (
                              <a className="font-semibold text-[#1f6f43]" href={record.photo.url}>
                                Photo
                              </a>
                            ) : null}
                            {record.report ? (
                              <a className="font-semibold text-[#1f6f43]" href={record.report.url}>
                                Report
                              </a>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="grid gap-4">
          <Link
            href="/submit"
            className="group rounded-md border border-[#d8ddd3] bg-white p-5 shadow-sm hover:border-[#9fb7a9]"
          >
            <Camera aria-hidden className="mb-4 size-6 text-[#1f6f43]" />
            <h2 className="text-lg font-semibold">Photo to report</h2>
            <p className="mt-2 text-sm leading-6 text-[#607066]">Capture the completed tag, review every field, and generate the Word report.</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#1f6f43]">
              Start workflow <ArrowRight aria-hidden className="size-4" />
            </span>
          </Link>
          <Link
            href="/reports"
            className="group rounded-md border border-[#d8ddd3] bg-white p-5 shadow-sm hover:border-[#9fb7a9]"
          >
            <FileText aria-hidden className="mb-4 size-6 text-[#1f6f43]" />
            <h2 className="text-lg font-semibold">Generated reports</h2>
            <p className="mt-2 text-sm leading-6 text-[#607066]">Open saved DOCX reports and the original tag photos from local storage.</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#1f6f43]">
              View reports <ArrowRight aria-hidden className="size-4" />
            </span>
          </Link>
        </aside>
      </section>
    </AppShell>
  );
}
