import "@/styles/globals.css";
import AppShell from "@/components/app-shell";

export const metadata = {
  title: "YMM Otomasyon",
  description: "YMM süreçleri için yönetim ve raporlama paneli."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
