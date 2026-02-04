import Link from "next/link";

const items = [
  { href: "/", label: "Dashboard" },
  { href: "/customers", label: "Musteri" },
  { href: "/documents", label: "Evrak" },
  { href: "/reports", label: "Rapor" }
];

export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-ink/10 bg-white/70 backdrop-blur px-6 py-8">
      <div className="text-xl font-semibold">YMM Panel</div>
      <div className="mt-2 text-sm text-ink/60">Yonetim ve raporlama</div>
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
      <div className="mt-10 rounded-lg bg-haze p-4 text-xs text-ink/70">
        Sadece lokal IP portlari acik.
      </div>
    </aside>
  );
}
