import { AppShell } from "@/components/AppShell";
import { ReportsList } from "@/components/ReportsList";
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
        <ReportsList records={generated} />
      </section>
    </AppShell>
  );
}
