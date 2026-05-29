import { AppShell } from "@/components/AppShell";
import { CertList } from "@/components/CertList";
import { CertUpload } from "@/components/CertUpload";
import { readCerts } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function CertsPage() {
  const certs = await readCerts();

  return (
    <AppShell>
      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <CertUpload />
        <div className="rounded-md border border-[#d8ddd3] bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold">Wrench Certificates</h1>
          <p className="mt-1 text-sm text-[#607066]">PDF-only storage for Phase 1 reference. Missing certs do not block reports.</p>
          <CertList certs={certs} />
        </div>
      </section>
    </AppShell>
  );
}
