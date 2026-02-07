"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type ReportRow = {
  id: number;
  report_no: string;
  report_type: string;
  year: number;
  received_date?: string;
  recipient?: string;
  subject?: string;
  description?: string;
  delivery_method?: string;
  period_start_month?: number;
  period_start_year?: number;
  period_end_month?: number;
  period_end_year?: number;
  delivery_kargo_name?: string;
  delivery_kargo_tracking?: string;
  delivery_elden_name?: string;
  delivery_elden_date?: string;
  delivery_email?: string;
  delivery_ebys_id?: string;
  delivery_ebys_date?: string;
  delivery_other_desc?: string;
  customer: number;
};

type FileRow = {
  id: number;
  filename: string;
  url: string;
};

export default function ReportDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [rep, setRep] = useState<ReportRow | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [r, f] = await Promise.all([
          apiFetch<ReportRow>(`/api/reports/${id}/`),
          apiFetch<FileRow[]>(`/api/files/?report=${id}`)
        ]);
        setRep(r);
        setFiles(f);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
      }
    }
    load();
  }, [id]);

  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!rep) return <div>Loading...</div>;

  const periodText =
    rep.period_start_month && rep.period_start_year && rep.period_end_month && rep.period_end_year
      ? `${String(rep.period_start_month).padStart(2, "0")}/${rep.period_start_year}-${String(
          rep.period_end_month
        ).padStart(2, "0")}/${rep.period_end_year}`
      : "-";

  return (
    <div className="space-y-6 print-area">
      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-ink/50">Rapor Detayi</div>
            <h1 className="text-3xl font-semibold">{rep.report_no}</h1>
            <div className="mt-1 text-sm text-ink/60">{rep.subject || "Konu yok"}</div>
          </div>
          <div className="flex items-center gap-2">
            <Link className="text-sm text-terracotta print-hide" href={`/customers/${rep.customer}`}>
              Musteri Karti
            </Link>
            <Button className="print-hide" onClick={() => window.print()}>Yazdir</Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 text-sm">
          <div className="grid gap-3">
            <div><b>Tarih:</b> {rep.received_date || "-"}</div>
            <div><b>Tur:</b> {rep.report_type}</div>
            <div><b>Donemi:</b> {periodText}</div>
            <div><b>Teslim:</b> {rep.delivery_method || "-"}</div>
            {rep.delivery_method === "KARGO" ? (
              <>
                <div><b>Kargo:</b> {rep.delivery_kargo_name || "-"}</div>
                <div><b>Takip No:</b> {rep.delivery_kargo_tracking || "-"}</div>
              </>
            ) : null}
            {rep.delivery_method === "ELDEN" ? (
              <>
                <div><b>Teslim Alan:</b> {rep.delivery_elden_name || "-"}</div>
                <div><b>Teslim Tarihi:</b> {rep.delivery_elden_date || "-"}</div>
              </>
            ) : null}
            {rep.delivery_method === "EPOSTA" ? (
              <div><b>E-posta:</b> {rep.delivery_email || "-"}</div>
            ) : null}
            {rep.delivery_method === "EBYS" ? (
              <>
                <div><b>EBYS ID:</b> {rep.delivery_ebys_id || "-"}</div>
                <div><b>EBYS Tarihi:</b> {rep.delivery_ebys_date || "-"}</div>
              </>
            ) : null}
            {rep.delivery_method === "DIGER" ? (
              <div><b>Diger:</b> {rep.delivery_other_desc || "-"}</div>
            ) : null}
          </div>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 text-sm">
          <div className="grid gap-3">
            <div><b>Alici:</b> {rep.recipient || "-"}</div>
            <div><b>Konu:</b> {rep.subject || "-"}</div>
            <div><b>Aciklama:</b> {rep.description || "-"}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
        <h2 className="text-xl font-semibold">Ekler</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {files.length === 0 ? (
            <div className="rounded-xl border border-ink/10 bg-white p-4 text-sm text-ink/60">
              Bu rapora ait ek yok.
            </div>
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
