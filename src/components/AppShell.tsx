import Link from "next/link";
import { ClipboardList, FileText, Gauge, Upload } from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: ClipboardList },
  { href: "/submit", label: "Submit", icon: Upload },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/certs", label: "Certs", icon: Gauge },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f7f3] text-[#17201b]">
      <header className="border-b border-[#d8ddd3] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-[#1f6f43] text-sm font-bold text-white">
              RE
            </span>
            <span>
              <span className="block text-base font-semibold">Torque Documentation</span>
              <span className="block text-xs font-medium uppercase tracking-[0.08em] text-[#607066]">
                Reed Energy Group
              </span>
            </span>
          </Link>
          <nav className="grid grid-cols-4 gap-2 sm:flex">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-center gap-2 rounded-md border border-[#d8ddd3] bg-[#fbfcf8] px-3 py-2 text-sm font-medium text-[#26342d] hover:border-[#9fb7a9] hover:bg-[#eef4ed]"
                >
                  <Icon aria-hidden className="size-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
