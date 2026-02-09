"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

type Customer = { id: number; name: string };
type DocumentRow = {
  id: number;
  doc_no: string;
  subject?: string;
  created_at?: string;
  status?: string;
};
type ReportRow = {
  id: number;
  report_no: string;
  subject?: string;
  created_at?: string;
  status?: string;
};

export default function Dashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ts = Date.now();
      const [custs, docs, reps] = await Promise.all([
        apiFetch<Customer[]>(`/api/customers/?_ts=${ts}`),
        apiFetch<DocumentRow[]>(`/api/documents/?_ts=${ts}`),
        apiFetch<ReportRow[]>(`/api/reports/?_ts=${ts}`)
      ]);
      setCustomers(custs);
      setDocuments(docs);
      setReports(reps);
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

  const openDocs = documents.filter((d) => d.status !== "DONE").length;
  const openReports = reports.filter((r) => r.status !== "DONE").length;
  const doneDocs = documents.filter((d) => d.status === "DONE").length;
  const doneReports = reports.filter((r) => r.status === "DONE").length;

  const recentActivity = useMemo(() => {
    const rows = [
      ...documents.map((d) => ({
        id: `doc-${d.id}`,
        title: d.doc_no,
        subtitle: d.subject || "Evrak",
        date: d.created_at
      })),
      ...reports.map((r) => ({
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
  }, [documents, reports]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-semibold">YMM Otomasyon</h1>
        <p className="mt-2 text-ink/60">Özet, iş akışı ve son hareketler.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <div className="text-sm text-ink/60">Müşteriler</div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{loading ? "—" : customers.length}</div>
            <div className="text-sm text-ink/50">Toplam kayıt</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="text-sm text-ink/60">Açık Evrak</div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{loading ? "—" : openDocs}</div>
            <div className="text-sm text-ink/50">Tamamlanan: {loading ? "—" : doneDocs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="text-sm text-ink/60">Açık Rapor</div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{loading ? "—" : openReports}</div>
            <div className="text-sm text-ink/50">Tamamlanan: {loading ? "—" : doneReports}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="text-sm text-ink/60">Hızlı İşlemler</div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Link className="text-sm text-terracotta" href="/documents">Evrak ekle</Link>
              <Link className="text-sm text-terracotta" href="/reports">Rapor ekle</Link>
              <Link className="text-sm text-terracotta" href="/customers">Müşteri ekle</Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="text-sm text-ink/60">İş Akışı</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div>Evraklar</div>
                <div className="text-ink/60">{loading ? "—" : `${openDocs} açık / ${doneDocs} tamam`}</div>
              </div>
              <div className="flex items-center justify-between">
                <div>Raporlar</div>
                <div className="text-ink/60">{loading ? "—" : `${openReports} açık / ${doneReports} tamam`}</div>
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
              Son güncelleme: {lastUpdated ? lastUpdated.toLocaleTimeString("tr-TR") : "—"}
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
