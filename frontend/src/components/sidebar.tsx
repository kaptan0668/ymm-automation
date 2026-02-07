"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearTokens } from "@/lib/auth";

const items = [
  { href: "/", label: "Gösterge" },
  { href: "/customers", label: "Müşteri" },
  { href: "/documents", label: "Evrak" },
  { href: "/reports", label: "Rapor" }
];

export default function Sidebar() {
  const router = useRouter();

  function handleLogout() {
    clearTokens();
    router.replace("/login");
  }

  return (
    <aside className="w-64 border-r border-ink/10 bg-white/70 backdrop-blur px-6 py-8">
      <div className="text-xl font-semibold">YMM Otomasyon</div>
      <div className="mt-2 text-sm text-ink/60">Yönetim ve raporlama</div>
      <nav className="mt-8 space-y-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-haze"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <button
        onClick={handleLogout}
        className="mt-8 w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-sm hover:bg-haze"
      >
        Çıkış Yap
      </button>
    </aside>
  );
}
