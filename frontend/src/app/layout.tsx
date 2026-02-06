import "@/styles/globals.css";
import Sidebar from "@/components/sidebar";

export const metadata = {
  title: "YMM Otomasyon",
  description: "YMM süreçleri için yönetim ve raporlama paneli."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
