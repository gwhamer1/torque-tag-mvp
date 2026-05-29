import { AppShell } from "@/components/AppShell";
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
          <div className="mt-5 grid gap-3">
            {certs.length === 0 ? (
              <p className="rounded-md bg-[#fbfcf8] p-6 text-center text-sm text-[#607066]">No certificates uploaded yet.</p>
            ) : (
              certs.map((cert) => (
                <a
                  key={cert.id}
                  href={cert.file.url}
                  className="rounded-md border border-[#d8ddd3] p-4 text-sm font-semibold text-[#1f6f43] hover:bg-[#eef4ed]"
                >
                  {cert.file.originalName}
                  <span className="ml-2 font-normal text-[#607066]">{new Date(cert.createdAt).toLocaleString()}</span>
                </a>
              ))
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
