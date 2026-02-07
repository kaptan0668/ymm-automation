"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ReportRow = {
  id: number;
  report_no: string;
  report_type: string;
  year: number;
  customer: number;
};

const REPORT_TYPES = ["TT", "KDV", "OAR", "DGR"];

export default function ReportsPage() {
  const [items, setItems] = useState<ReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState("");
  const [reportType, setReportType] = useState("TT");
  const [year, setYear] = useState("2026");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      const data = await apiFetch<ReportRow[]>("/api/reports/");
      setItems(data);
      setError(null);
    } catch {
      setError("Veriler yüklenemedi. Giriş yapmanız gerekebilir.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const token = getAccessToken();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    setSaving(true);
    try {
      await apiFetch<ReportRow>("/api/reports/", {
        method: "POST",
        body: JSON.stringify({
          customer: Number(customerId),
          report_type: reportType,
          year: Number(year)
        })
      });
      setCustomerId("");
      await load();
      setNotice("Rapor eklendi.");
    } catch {
      setNotice("Rapor eklenemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Raporlar</h1>
        <p className="text-ink/60">Rapor üretim ve durum izleme.</p>
      </div>

      <form onSubmit={handleCreate} className="grid gap-3 rounded-lg border border-ink/10 bg-white p-4 md:grid-cols-4">
        <Input
          placeholder="Müşteri ID"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        />
        <select
          className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
        >
          {REPORT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <Input placeholder="Yıl" value={year} onChange={(e) => setYear(e.target.value)} />
        <Button type="submit" disabled={!token || saving || !customerId || !year}>
          {saving ? "Kaydediliyor..." : "Rapor Ekle"}
        </Button>
      </form>
      {notice ? <div className="text-sm text-ink/70">{notice}</div> : null}

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
