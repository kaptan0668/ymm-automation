"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type ReportRow = {
  id: number;
  report_no: string;
  report_type: string;
  year: number;
  customer: number;
};

export default function ReportsPage() {
  const [items, setItems] = useState<ReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<ReportRow[]>("/api/reports/");
        setItems(data);
      } catch {
        setError("Veriler yüklenemedi. Giriş yapmanız gerekebilir.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Raporlar</h1>
        <p className="text-ink/60">Rapor üretim ve durum izleme.</p>
      </div>

      {loading ? <div>Yükleniyor...</div> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-lg border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-haze text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Rapor No</th>
                <th className="px-4 py-3 font-medium">Tür</th>
                <th className="px-4 py-3 font-medium">Yıl</th>
                <th className="px-4 py-3 font-medium">Müşteri ID</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-ink/10">
                  <td className="px-4 py-3">{item.report_no}</td>
                  <td className="px-4 py-3">{item.report_type}</td>
                  <td className="px-4 py-3">{item.year}</td>
                  <td className="px-4 py-3">{item.customer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
