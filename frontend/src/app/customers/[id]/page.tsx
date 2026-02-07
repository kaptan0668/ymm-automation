"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Customer = {
  id: number;
  name: string;
  tax_no: string;
};

type DocumentRow = {
  id: number;
  doc_no: string;
  received_date?: string;
  subject?: string;
};

type ReportRow = {
  id: number;
  report_no: string;
  received_date?: string;
  subject?: string;
};

type FileRow = {
  id: number;
  filename: string;
  url: string;
};

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white/80 p-6 text-sm text-ink/60">
      <div className="text-base font-semibold text-ink">{title}</div>
      <div className="mt-1">{subtitle}</div>
    </div>
  );
}

export default function CustomerCardPage() {
  const params = useParams();
  const id = params?.id as string;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [c, d, r, f] = await Promise.all([
          apiFetch<Customer>(`/api/customers/${id}/`),
          apiFetch<DocumentRow[]>(`/api/documents/?customer=${id}`),
          apiFetch<ReportRow[]>(`/api/reports/?customer=${id}`),
          apiFetch<FileRow[]>(`/api/files/?customer=${id}`)
        ]);
        setCustomer(c);
        setDocs(d);
        setReports(r);
        setFiles(f);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
        setError(msg);
      }
    }
    load();
  }, [id]);

  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!customer) return <div>Yukleniyor...</div>;

  const docCount = docs.length;
  const reportCount = reports.length;
  const fileCount = files.length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-ink/50">Musteri Karti</div>
            <h1 className="text-3xl font-semibold">{customer.name}</h1>
            <div className="mt-1 text-sm text-ink/60">Vergi No: {customer.tax_no}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => window.print()}>Yazdir</Button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-ink/10 bg-haze p-4">
            <div className="text-xs text-ink/60">Evrak</div>
            <div className="text-2xl font-semibold">{docCount}</div>
          </div>
          <div className="rounded-xl border border-ink/10 bg-haze p-4">
            <div className="text-xs text-ink/60">Rapor</div>
            <div className="text-2xl font-semibold">{reportCount}</div>
          </div>
          <div className="rounded-xl border border-ink/10 bg-haze p-4">
            <div className="text-xs text-ink/60">Ek</div>
            <div className="text-2xl font-semibold">{fileCount}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Evraklar</h2>
            <Link className="text-sm text-terracotta" href="/documents">
              Tumunu Gor
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {docs.length === 0 ? (
              <EmptyState title="Evrak yok" subtitle="Bu musteri icin kayitli evrak bulunamadi." />
            ) : (
              docs.map((d) => (
                <Link
                  key={d.id}
                  href={`/documents/${d.id}`}
                  className="block rounded-xl border border-ink/10 bg-white p-4 hover:bg-haze"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-ink/60">{d.received_date || "-"}</div>
                    <div className="text-xs text-ink/50">Detay</div>
                  </div>
                  <div className="mt-1 text-sm font-semibold">{d.doc_no}</div>
                  <div className="mt-1 text-sm text-ink/60">{d.subject || "Konu yok"}</div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Raporlar</h2>
            <Link className="text-sm text-terracotta" href="/reports">
              Tumunu Gor
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {reports.length === 0 ? (
              <EmptyState title="Rapor yok" subtitle="Bu musteri icin kayitli rapor bulunamadi." />
            ) : (
              reports.map((r) => (
                <Link
                  key={r.id}
                  href={`/reports/${r.id}`}
                  className="block rounded-xl border border-ink/10 bg-white p-4 hover:bg-haze"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-ink/60">{r.received_date || "-"}</div>
                    <div className="text-xs text-ink/50">Detay</div>
                  </div>
                  <div className="mt-1 text-sm font-semibold">{r.report_no}</div>
                  <div className="mt-1 text-sm text-ink/60">{r.subject || "Konu yok"}</div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
        <h2 className="text-xl font-semibold">Ekler</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {files.length === 0 ? (
            <EmptyState title="Ek yok" subtitle="Musteriye ait dosya bulunamadi." />
          ) : (
            files.map((f) => (
              <a
                key={f.id}
                className="rounded-xl border border-ink/10 bg-white p-4 hover:bg-haze"
                href={f.url}
                target="_blank"
                rel="noreferrer"
              >
                <div className="text-sm font-semibold">{f.filename}</div>
                <div className="mt-1 text-xs text-ink/50">Indir</div>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
