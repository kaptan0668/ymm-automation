"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type Customer = { id: number; name: string };
type AppSettings = { working_year: number; reference_year: number };
type DocumentRow = {
  id: number;
  doc_no: string;
  year?: number;
  subject?: string;
  created_at?: string;
  status?: string;
};
type ReportRow = {
  id: number;
  report_no: string;
  year?: number;
  subject?: string;
  created_at?: string;
  status?: string;
};

export default function Dashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ts = Date.now();
      const [custs, docs, reps, appSettings] = await Promise.all([
        apiFetch<Customer[]>(`/api/customers/?_ts=${ts}`),
        apiFetch<DocumentRow[]>(`/api/documents/?_ts=${ts}`),
        apiFetch<ReportRow[]>(`/api/reports/?_ts=${ts}`),
        apiFetch<AppSettings>(`/api/settings/?_ts=${ts}`).catch(() => null)
      ]);
      setCustomers(custs);
      setDocuments(docs);
      setReports(reps);
      setSettings(appSettings);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const years = useMemo(() => {
    const ys = new Set<number>();
    if (settings?.reference_year) ys.add(settings.reference_year);
    if (settings?.working_year) ys.add(settings.working_year);
    documents.forEach((d) => {
      if (d.year) ys.add(d.year);
    });
    reports.forEach((r) => {
      if (r.year) ys.add(r.year);
    });
    ys.add(new Date().getFullYear());
    return Array.from(ys).sort((a, b) => b - a);
  }, [settings, documents, reports]);

  useEffect(() => {
    if (settings?.reference_year && !years.includes(selectedYear)) {
      setSelectedYear(settings.reference_year);
    }
  }, [settings, years, selectedYear]);

  const yearDocuments = useMemo(
    () => documents.filter((d) => (d.year ?? 0) === selectedYear),
    [documents, selectedYear]
  );
  const yearReports = useMemo(
    () => reports.filter((r) => (r.year ?? 0) === selectedYear),
    [reports, selectedYear]
  );

  const openDocs = yearDocuments.filter((d) => d.status !== "DONE").length;
  const openReports = yearReports.filter((r) => r.status !== "DONE").length;
  const doneDocs = yearDocuments.filter((d) => d.status === "DONE").length;
  const doneReports = yearReports.filter((r) => r.status === "DONE").length;

  const recentActivity = useMemo(() => {
    const rows = [
      ...yearDocuments.map((d) => ({
        id: `doc-${d.id}`,
        title: d.doc_no,
        subtitle: d.subject || "Evrak",
        date: d.created_at
      })),
      ...yearReports.map((r) => ({
        id: `rep-${r.id}`,
        title: r.report_no,
        subtitle: r.subject || "Rapor",
        date: r.created_at
      }))
    ];
    return rows
      .filter((r) => r.date)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 5);
  }, [yearDocuments, yearReports]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-semibold">YMM Otomasyon</h1>
        <p className="mt-2 text-ink/60">Özet, iş akışı ve son hareketler.</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-ink/60">Gösterge Yılı:</span>
          <select
            className="h-9 rounded-md border border-ink/20 bg-white px-3 text-sm"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <div className="text-sm text-ink/60">Müşteriler</div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{loading ? "-" : customers.length}</div>
            <div className="text-sm text-ink/50">Toplam kayıt</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="text-sm text-ink/60">Açık Evrak</div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{loading ? "-" : openDocs}</div>
            <div className="text-sm text-ink/50">Tamamlanan: {loading ? "-" : doneDocs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="text-sm text-ink/60">Açık Rapor</div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{loading ? "-" : openReports}</div>
            <div className="text-sm text-ink/50">Tamamlanan: {loading ? "-" : doneReports}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="text-sm text-ink/60">Hızlı İşlemler</div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Link className="text-sm text-terracotta" href="/customers">Müşteri ekle</Link>
              <Link className="text-sm text-terracotta" href="/contracts">Sözleşme ekle</Link>
              <Link className="text-sm text-terracotta" href="/documents">Evrak ekle</Link>
              <Link className="text-sm text-terracotta" href="/reports">Rapor ekle</Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="text-sm text-ink/60">Yıl Bilgileri</div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-ink/70">
            Çalışma yılı: <b>{settings?.working_year ?? "-"}</b> | Referans yılı: <b>{settings?.reference_year ?? "-"}</b> | Seçili gösterge yılı: <b>{selectedYear}</b>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="text-sm text-ink/60">İş Akışı</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div>Evraklar</div>
                <div className="text-ink/60">{loading ? "-" : `${openDocs} açık / ${doneDocs} tamam`}</div>
              </div>
              <div className="flex items-center justify-between">
                <div>Raporlar</div>
                <div className="text-ink/60">{loading ? "-" : `${openReports} açık / ${doneReports} tamam`}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="text-sm text-ink/60">Son Hareketler</div>
              <Button variant="outline" size="sm" onClick={load}>
                Yenile
              </Button>
            </div>
            <div className="mt-1 text-xs text-ink/50">
              Son güncelleme: {lastUpdated ? lastUpdated.toLocaleTimeString("tr-TR") : "-"} | Yıl: {selectedYear}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-ink/60">Yükleniyor...</div>
            ) : recentActivity.length === 0 ? (
              <div className="text-sm text-ink/60">Kayıt bulunamadı.</div>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{r.title}</div>
                      <div className="text-ink/60">{r.subtitle}</div>
                    </div>
                    <div className="text-xs text-ink/50">{r.date?.slice(0, 10)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
